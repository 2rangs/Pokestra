// ─── 리플레이 화면 (#/battle/replay?d=…) ─────────────────────────
// 링크를 풀어 엔진으로 다시 재생한 프레임을, 실시간 배틀과 같은 장면·HUD·로그 컴포넌트로 그린다.
// 행동 패널 자리에 타임라인(턴 슬라이더, 이전/다음 턴, 재생)을 둔다.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { PlayerID } from '@kyasi/pokebattle-engine'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { Selector } from '@astryxdesign/core/Selector'
import { Slider } from '@astryxdesign/core/Slider'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { VStack } from '@astryxdesign/core/VStack'
import { useEngineReady } from '../../lib/battle'
import { decodeReplay, ReplayError, type ReplayController, type ReplayData, type ReplayErrorCode } from '../../lib/replay'
import { useDocumentTitle } from '../../i18n'
import { PageSkeleton } from '../../components/ui/shared'
import { useBattleStore } from '../../stores/battleStore'
import { simulateReplay, type SimulatedReplay } from './frames'
import { BattleLayout, SceneOverlay } from './hud/BattleLayout'
import { BattleLog } from './hud/BattleLog'
import { BattleScene } from './hud/BattleScene'
import { FieldBar } from './hud/FieldBar'
import { useBattleCries } from './hud/useBattleCries'
import { SPEEDS, useBattleT } from './hud/util'

type Decoded = { d: string; data: ReplayData } | { d: string; error: ReplayErrorCode }

const DIFF_LABEL = { easy: 'diffEasy', normal: 'diffNormal', hard: 'diffHard' } as const

/** 프레임 수: turn 턴이 끝난 지점 (1 … 프레임 수) */
function turnEnd(sim: SimulatedReplay, turn: number): number {
    let n = 0
    while (n < sim.frames.length && sim.frames[n]!.turn <= turn) n++
    return Math.max(1, n)
}

/** 키 입력을 가로채면 안 되는 곳 (입력 요소·슬라이더) */
function isTypingTarget(el: EventTarget | null): boolean {
    if (!(el instanceof HTMLElement)) return false
    return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.closest('[role="slider"], [role="listbox"], [role="combobox"]') !== null
}

export default function ReplayPage() {
    const t = useBattleT()
    const [params] = useSearchParams()
    const d = params.get('d') ?? ''
    const { ready, error: engineError } = useEngineReady()
    const [decoded, setDecoded] = useState<Decoded | null>(null)

    useEffect(() => {
        let alive = true
        decodeReplay(d).then(
            data => { if (alive) setDecoded({ d, data }) },
            (e: unknown) => { if (alive) setDecoded({ d, error: e instanceof ReplayError ? e.code : 'corrupt' }) },
        )
        return () => { alive = false }
    }, [d])

    const current = decoded?.d === d ? decoded : null
    const data = current && 'data' in current ? current.data : null
    const sim = useMemo(() => (ready && data ? simulateReplay(data) : null), [ready, data])

    if (engineError) {
        return (
            <span role="alert" className="block">
                <Banner
                    status="error"
                    title={t('loadError')}
                    description={engineError.message}
                    endContent={<Button label={t('retry')} size="sm" onClick={() => window.location.reload()} />}
                />
            </span>
        )
    }
    if (current && 'error' in current) return <ReplayFailure code={current.error} />
    if (!sim || !data) return <PageSkeleton label={t('replayLoading')} heights={[48, 352, 160]} />
    if (sim.frames.length === 0) return <ReplayFailure code="mismatch" />
    return <ReplayViewer key={d} data={data} sim={sim} />
}

function ReplayFailure({ code }: { code: ReplayErrorCode | 'mismatch' }) {
    const t = useBattleT()
    useDocumentTitle(t('replayTitle'))
    const [title, desc] = code === 'version' ? [t('replayVersion'), t('replayVersionDesc')]
        : code === 'mismatch' ? [t('replayMismatch'), undefined]
            : [t('replayCorrupt'), t('replayCorruptDesc')]
    return (
        <span role="alert" className="block">
            <Banner
                status="error"
                title={title}
                description={desc}
                endContent={<Button size="sm" variant="primary" label={t('replayToSimulator')} href="/battle" />}
            />
        </span>
    )
}

function ReplayViewer({ data, sim }: { data: ReplayData; sim: SimulatedReplay }) {
    const t = useBattleT()
    const total = sim.frames.length
    const [cursor, setCursor] = useState(1)
    const [playing, setPlaying] = useState(false)
    const storeSpeed = useBattleStore(s => s.speed)
    const [speed, setSpeed] = useState(storeSpeed)
    const sound = useBattleStore(s => s.sound)
    const setSound = useBattleStore(s => s.setSound)

    const f = sim.frames[Math.min(cursor, total) - 1]!
    const atEnd = cursor >= total
    const lastTurn = sim.turns
    const spectating = data.p1.ctrl !== 'human' && data.p2.ctrl !== 'human'

    // ── 진영 이름 ────────────────────────────────────────────
    const cpu1 = t('cpu1')
    const cpu2 = t('cpu2')
    const sideName = useMemo(
        () => (spectating ? (p: PlayerID) => (p === 'p1' ? cpu1 : cpu2) : undefined),
        [spectating, cpu1, cpu2],
    )
    const shortName = (p: PlayerID, c: ReplayController) =>
        c === 'human' ? t('replayYou') : spectating ? (p === 'p1' ? cpu1 : cpu2) : 'CPU'
    const longName = (p: PlayerID, c: ReplayController) =>
        c === 'human' ? t('replayYou') : t('replayWithDiff', { name: shortName(p, c), diff: t(DIFF_LABEL[c]) })
    const players = t('replayVs', { a: longName('p1', data.p1.ctrl), b: longName('p2', data.p2.ctrl) })
    useDocumentTitle(t('replayDocTitle', { a: shortName('p1', data.p1.ctrl), b: shortName('p2', data.p2.ctrl) }))

    const result = sim.winner === null ? null
        : sim.winner === 'draw' ? t('draw')
            : data[sim.winner].ctrl === 'human' ? t('win')
                : data.p1.ctrl === 'human' ? t('lose')
                    : t('winnerIs', { name: shortName(sim.winner, data[sim.winner].ctrl) })

    useBattleCries(f, sound && playing, speed)

    // ── 이동 ─────────────────────────────────────────────────
    const go = useCallback((n: number) => {
        setPlaying(false)
        setCursor(Math.max(1, Math.min(total, n)))
    }, [total])
    const prevTurn = useCallback(() => go(turnEnd(sim, f.turn - 1)), [go, sim, f.turn])
    const nextTurn = useCallback(() => {
        const end = turnEnd(sim, f.turn)
        go(cursor < end ? end : turnEnd(sim, f.turn + 1))
    }, [go, sim, f.turn, cursor])
    const togglePlay = useCallback(() => {
        if (playing) return setPlaying(false)
        if (atEnd) setCursor(1)
        setPlaying(true)
    }, [playing, atEnd])

    // ── 재생: 프레임을 속도에 맞춰 하나씩 ───────────────────────
    useEffect(() => {
        if (!playing || cursor >= total) return
        const next = sim.frames[cursor]!
        const timer = setTimeout(() => {
            setCursor(cursor + 1)
            if (cursor + 1 >= total) setPlaying(false)
        }, next.silent ? 0 : speed)
        return () => clearTimeout(timer)
    }, [playing, cursor, total, sim, speed])

    // ── 키보드: ←/→ 턴 이동, Space 재생/일시정지 ─────────────────
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isTypingTarget(e.target)) return
            if (e.key === 'ArrowLeft') { e.preventDefault(); prevTurn() }
            else if (e.key === 'ArrowRight') { e.preventDefault(); nextTurn() }
            else if (e.key === ' ' && !(e.target instanceof HTMLElement && e.target.closest('button, a'))) {
                e.preventDefault()
                togglePlay()
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [prevTurn, nextTurn, togglePlay])

    const restart = () => { setCursor(1); setPlaying(true) }

    return (
        <VStack gap={3}>
            {sim.error === 'mismatch' && (
                <span role="alert" className="block">
                    <Banner
                        status="warning"
                        title={t('replayMismatch')}
                        description={t('replayMismatchDesc', { n: lastTurn })}
                    />
                </span>
            )}
            <BattleLayout
                main={<>
                    <HStack gap={3} vAlign="center" hAlign="between" wrap="wrap">
                        <FieldBar frame={f} sideName={sideName} />
                        <HStack gap={2} vAlign="center" wrap="wrap">
                            <Selector
                                label={t('speed')}
                                isLabelHidden
                                variant="secondary"
                                size="sm"
                                startIcon="clock"
                                value={String(speed)}
                                onChange={v => setSpeed(Number(v))}
                                options={SPEEDS.map(s => ({ value: String(s.value), label: t(s.label) }))}
                            />
                            <Button
                                size="sm"
                                variant={sound ? 'secondary' : 'ghost'}
                                icon={sound ? <Icon icon="check" /> : undefined}
                                label={t('sound')}
                                tooltip={t('soundTip')}
                                aria-pressed={sound}
                                onClick={() => setSound(!sound)}
                            />
                            <Button size="sm" variant="ghost" label={t('exit')} href="/battle" />
                        </HStack>
                    </HStack>

                    <BattleScene frame={f} foeHpMode={spectating ? 'toggle' : 'percent'} showFoeTera={spectating}>
                        {atEnd && !playing && result && (
                            <SceneOverlay title={result}>
                                <Button variant="primary" label={t('replayRestart')} onClick={restart} />
                                <Button label={t('replayPrevTurn')} icon={<Icon icon="chevronLeft" />} onClick={prevTurn} />
                                <Button variant="ghost" label={t('replayToSimulator')} href="/battle" />
                            </SceneOverlay>
                        )}
                    </BattleScene>

                    <Card padding={3}>
                        <VStack gap={2}>
                            <HStack gap={2} vAlign="center" hAlign="between" wrap="wrap">
                                <Text type="label" maxLines={1}>{players}</Text>
                                <HStack gap={2} vAlign="center">
                                    {atEnd && result && <Token size="sm" color="blue" label={result} />}
                                    <Text type="supporting" color="secondary" hasTabularNumbers>
                                        {t('replayTurnOf', { n: f.turn, total: lastTurn })}
                                    </Text>
                                </HStack>
                            </HStack>
                            <Slider
                                label={t('replayTimeline')}
                                isLabelHidden
                                min={0}
                                max={Math.max(1, lastTurn)}
                                value={f.turn}
                                isDisabled={lastTurn === 0}
                                valueDisplay="tooltip"
                                formatValue={n => t('turn', { n })}
                                onChange={(v: number) => go(turnEnd(sim, v))}
                            />
                            <HStack gap={2} vAlign="center" hAlign="center">
                                <Button label={t('replayFirst')} isIconOnly icon={<Icon icon="chevronsLeft" />} tooltip={t('replayFirst')} isDisabled={cursor <= 1} onClick={() => go(1)} />
                                <Button label={t('replayPrevTurn')} isIconOnly icon={<Icon icon="chevronLeft" />} tooltip={t('replayPrevTurn')} isDisabled={cursor <= 1} onClick={prevTurn} />
                                <Button
                                    variant="primary"
                                    label={playing ? t('pause') : t('play')}
                                    aria-pressed={playing}
                                    onClick={togglePlay}
                                    className="min-w-28"
                                />
                                <Button label={t('replayNextTurn')} isIconOnly icon={<Icon icon="chevronRight" />} tooltip={t('replayNextTurn')} isDisabled={atEnd} onClick={nextTurn} />
                                <Button label={t('replayLast')} isIconOnly icon={<Icon icon="chevronsRight" />} tooltip={t('replayLast')} isDisabled={atEnd} onClick={() => go(total)} />
                            </HStack>
                            <span className="hidden sm:block">
                                <Text type="supporting" color="secondary" justify="center">{t('replayKeysHint')}</Text>
                            </span>
                        </VStack>
                    </Card>
                </>}
                log={<>
                    <Heading level={2}>{t('battleLog')}</Heading>
                    <BattleLog frames={sim.frames} revealed={cursor} sideName={sideName} />
                </>}
            />
        </VStack>
    )
}
