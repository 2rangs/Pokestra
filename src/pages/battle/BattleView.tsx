import { useEffect, useMemo, useRef } from 'react'
import type { PlayerID } from '@kyasi/pokebattle-engine'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { VStack } from '@astryxdesign/core/VStack'
import { Icon } from '@astryxdesign/core/Icon'
import { Selector } from '@astryxdesign/core/Selector'
import { Text } from '@astryxdesign/core/Text'
import { itemName, abilityNameL } from '../../lib/battle'
import { useDocumentTitle, useLang } from '../../i18n'
import { cx } from '../../components/ui/utils'
import type { BattleSession, Frame, PokeView } from './useBattleSession'
import { BattleScene } from './hud/BattleScene'
import { useBattleCries } from './hud/useBattleCries'
import { useBattleStore } from '../../stores/battleStore'
import { FieldBar } from './hud/FieldBar'
import { ActionPanel } from './hud/MovePanel'
import { BattleLog } from './hud/BattleLog'
import { HpBar } from './hud/common'
import { nameOf, pctOf, useBattleT } from './hud/util'

const SPEEDS = [
    { value: 900, label: 'speedSlow' },
    { value: 450, label: 'speedNormal' },
    { value: 180, label: 'speedFast' },
    { value: 40, label: 'speedVeryFast' },
] as const

// ─── 결과 ────────────────────────────────────────────────────
function ResultOverlay({ result, onRematch, onExit }: { result: string; onRematch: () => void; onExit: () => void }) {
    const t = useBattleT()
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => { ref.current?.querySelector('button')?.focus() }, [])
    return (
        <div
            ref={ref}
            role="alertdialog"
            aria-label={result}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 rounded-lg bg-surface/90 p-4 text-center"
        >
            <Heading level={2}>{result}</Heading>
            <HStack gap={2} hAlign="center" wrap="wrap">
                <Button variant="primary" label={t('rematch')} onClick={onRematch} />
                <Button label={t('backToTeam')} onClick={onExit} />
            </HStack>
        </div>
    )
}

// ─── 메인 뷰 ─────────────────────────────────────────────────
export function BattleView({ session, onExit, onRematch }: { session: BattleSession; onExit: () => void; onRematch: () => void }) {
    const lang = useLang()
    const t = useBattleT()
    const f = session.current
    const spectating = session.isAI('p1') && session.isAI('p2')
    const ended = session.phase === 'ended' && session.allRevealed

    const cpu1 = t('cpu1')
    const cpu2 = t('cpu2')
    const sideName = useMemo(
        () => (spectating ? (p: PlayerID) => (p === 'p1' ? cpu1 : cpu2) : undefined),
        [spectating, cpu1, cpu2],
    )

    const docTitle = f
        ? `${nameOf(f.p1.active, lang)} vs ${nameOf(f.p2.active, lang)} - ${t('turn', { n: f.turn })}`
        : t('title')
    useDocumentTitle(docTitle)

    const sound = useBattleStore(s => s.sound)
    const setSound = useBattleStore(s => s.setSound)
    useBattleCries(f, sound, session.speed)

    if (!f) return null

    const result = session.winner === 'draw' ? t('draw')
        : session.winner === 'p1' ? (spectating ? t('winnerIs', { name: cpu1 }) : t('win'))
            : spectating ? t('winnerIs', { name: cpu2 }) : t('lose')

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <VStack gap={3} className="min-w-0">
                <HStack gap={3} vAlign="center" hAlign="between" wrap="wrap">
                    <FieldBar frame={f} sideName={sideName} />
                    <HStack gap={2} vAlign="center" wrap="wrap">
                        <Selector
                            label={t('speed')}
                            isLabelHidden
                            variant="secondary"
                            size="sm"
                            startIcon="clock"
                            value={String(session.speed)}
                            onChange={v => session.setSpeed(Number(v))}
                            options={SPEEDS.map(s => ({ value: String(s.value), label: t(s.label) }))}
                        />
                        {spectating && (
                            <Button
                                size="sm"
                                label={session.paused ? t('play') : t('pause')}
                                aria-pressed={session.paused}
                                onClick={() => session.setPaused(!session.paused)}
                            />
                        )}
                        {!session.allRevealed && (
                            spectating
                                // 관전 모드는 버튼이 하나 더 있어 휴대폰에서 한 줄에 들어가도록 아이콘만
                                ? <Button size="sm" label={t('skip')} isIconOnly icon={<Icon icon="chevronsRight" />} tooltip={t('skip')} onClick={session.skip} />
                                : <Button size="sm" label={t('skip')} endContent={<Icon icon="chevronsRight" />} onClick={session.skip} />
                        )}
                        <Button
                            size="sm"
                            variant={sound ? 'secondary' : 'ghost'}
                            icon={sound ? <Icon icon="check" /> : undefined}
                            label={t('sound')}
                            tooltip={t('soundTip')}
                            aria-pressed={sound}
                            onClick={() => setSound(!sound)}
                        />
                        <Button size="sm" variant="ghost" label={t('exit')} onClick={onExit} />
                    </HStack>
                </HStack>

                {/* 배틀 필드: 상대는 위 오른쪽, 우리는 아래 왼쪽 */}
                <BattleScene frame={f} foeHpMode={spectating ? 'toggle' : 'percent'} showFoeTera={spectating}>
                    {ended && <ResultOverlay result={result} onRematch={onRematch} onExit={onExit} />}
                </BattleScene>

                {!spectating && (
                    <Card padding={3}>
                        <VStack gap={3}>
                            {session.error && (
                                <span role="alert" className="block">
                                    <Text color="inherit" className="text-error">{t('actionError', { msg: session.error })}</Text>
                                </span>
                            )}
                            <ActionPanel key={`${f.turn}-${session.allRevealed}`} session={session} player="p1" />
                        </VStack>
                    </Card>
                )}
                {spectating && <SpectatorDetails f={f} sideName={sideName!} />}
            </VStack>

            <VStack gap={2} className="min-w-0">
                <Heading level={2}>{t('battleLog')}</Heading>
                <BattleLog frames={session.frames} revealed={session.revealed} sideName={sideName} />
            </VStack>
        </div>
    )
}

function SpectatorDetails({ f, sideName }: { f: Frame; sideName: (p: PlayerID) => string }) {
    const lang = useLang()
    const t = useBattleT()
    const row = (p: PokeView) => {
        const name = nameOf(p, lang)
        return (
            <li key={p.id} className={cx('grid grid-cols-[minmax(0,6rem)_1fr_2.5rem] items-center gap-2 py-1', p.fainted && 'opacity-50')}>
                <Text type="supporting" weight="medium" maxLines={1}>{name}</Text>
                <HpBar p={p} label={t('hpLabel', { hp: p.hp, max: p.max_hp })} />
                <Text type="supporting" color="secondary" hasTabularNumbers justify="end">{pctOf(p)}%</Text>
                <span className="col-span-3 truncate text-xs text-secondary" title={t('itemOrAbility')}>
                    {p.item ? itemName(p.item, lang) : abilityNameL(p.ability, lang)}
                </span>
            </li>
        )
    }
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[f.p1, f.p2].map(s => (
                <Card key={s.id} padding={3}>
                    <VStack gap={2}>
                        <Text type="label">{sideName(s.id)}</Text>
                        <ul className="divide-y divide-border">{s.team.map(row)}</ul>
                    </VStack>
                </Card>
            ))}
        </div>
    )
}
