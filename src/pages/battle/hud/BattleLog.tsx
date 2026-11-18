// ─── 배틀 로그: 턴별 묶음 (지난 턴은 접힘) + 중요 사건 강조 ─────────
// 프레임 목록과 보여줄 개수만 받는다 (리플레이 화면에서도 같은 로그를 쓴다).
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PlayerID } from '@kyasi/pokebattle-engine'
import { Collapsible } from '@astryxdesign/core/Collapsible'
import { HStack } from '@astryxdesign/core/HStack'
import { ScrollableArea } from '@astryxdesign/core/ScrollableArea'
import { VStack } from '@astryxdesign/core/VStack'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { groupLogByTurn, logTone, type LogSummary, type LogTone } from '../../../lib/battleHud'
import { useLang } from '../../../i18n'
import { cx } from '../../../components/ui/utils'
import { frameText, type Frame } from '../useBattleSession'
import { useBattleT } from './util'

const TONE: Record<LogTone, string> = {
    key: 'font-bold text-error',
    accent: 'font-bold text-accent',
    move: 'mt-1 font-semibold text-primary first:mt-0',
    normal: 'text-primary',
    dim: 'text-secondary',
}

/** 바닥에서 이만큼 안쪽이면 "맨 아래를 보는 중"으로 본다 (rem 단위 → px 은 런타임 계산) */
const STICK_REM = 2

export function BattleLog({ frames, revealed, sideName }: {
    frames: Frame[]
    /** 보여줄 프레임 수 (재생 중이면 일부만) */
    revealed: number
    sideName?: (p: PlayerID) => string
}) {
    const lang = useLang()
    const t = useBattleT()
    const ref = useRef<HTMLDivElement>(null)
    /** 사용자가 위로 스크롤해 읽는 중이면 false → 새 줄이 와도 끌어내리지 않고, 지난 턴도 접지 않는다 */
    const [stuck, setStuck] = useState(true)
    /** 위로 스크롤하기 시작한 때의 "최근 묶음" 시작 위치 (그동안은 이 앞만 자동으로 접는다) */
    const [pinnedFrom, setPinnedFrom] = useState(0)
    /** 사용자가 직접 펼치거나 접은 묶음 (나머지는 최근 두 턴만 펼침) */
    const [toggled, setToggled] = useState<Record<string, boolean>>({})
    // 새 배틀(재대결)이면 상태 초기화: 묶음 key(t0, t1 …)가 이전 배틀 것과 겹치지 않게
    const first = frames[0]
    const [battleOf, setBattleOf] = useState(first)
    if (battleOf !== first) {
        setBattleOf(first)
        setToggled({})
        setStuck(true)
        setPinnedFrom(0)
    }

    // 문장은 현재 언어로 그릴 때마다 만든다 → 언어를 바꾸면 지난 로그도 바뀐다
    const groups = useMemo(
        () => groupLogByTurn(frames.slice(0, revealed)).map(g => ({
            ...g,
            lines: g.items
                .map(f => ({ f, text: frameText(f, lang, sideName) }))
                .filter((x): x is { f: Frame; text: string } => x.text !== null),
        })),
        [frames, revealed, lang, sideName],
    )
    const lineCount = groups.reduce((n, g) => n + g.lines.length, 0)

    const recentFrom = stuck ? groups.length - 2 : pinnedFrom

    useEffect(() => {
        const el = ref.current
        if (el && stuck) el.scrollTop = el.scrollHeight
    }, [lineCount, groups.length, stuck])

    const onScroll = () => {
        const el = ref.current
        if (!el) return
        const rem = parseFloat(getComputedStyle(el).fontSize) || 16
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= STICK_REM * rem
        if (atBottom === stuck) return
        if (!atBottom) setPinnedFrom(groups.length - 2)
        setStuck(atBottom)
    }

    return (
        <ScrollableArea
            ref={ref}
            label={t('battleLog')}
            overscroll="contain"
            onScroll={onScroll}
            paddingInline={3}
            paddingBlock={2}
            className="h-72 rounded-md border border-border bg-surface text-sm lg:h-160"
        >
            <VStack role="log" aria-live="polite" aria-label={t('battleLog')}>
            {lineCount === 0 && <Text color="secondary">{t('logEmpty')}</Text>}
            {groups.map((g, i) => {
                const recent = i >= recentFrom
                const isOpen = toggled[g.key] ?? recent
                const title = g.turn === 0 ? t('logStart') : t('turn', { n: g.turn })
                if (g.lines.length === 0 && !recent) return null
                return (
                    <Collapsible
                        key={g.key}
                        chevronPosition="start"
                        isOpen={isOpen}
                        onOpenChange={open => setToggled(s => ({ ...s, [g.key]: open }))}
                        trigger={
                            <HStack gap={1.5} vAlign="center" wrap="wrap">
                                <Text type="label" color="secondary">{title}</Text>
                                {!isOpen && <SummaryTokens s={g.summary} />}
                            </HStack>
                        }
                    >
                        <ul className="flex flex-col gap-0.5 pb-2">
                            {g.lines.map(({ f, text }) => (
                                <li key={f.index} className={cx(TONE[logTone(f.event)], f.event.type === 'battle_end' && 'mt-2')}>{text}</li>
                            ))}
                        </ul>
                    </Collapsible>
                )
            })}
            </VStack>
        </ScrollableArea>
    )
}

/** 접힌 턴의 요약: 기절·급소·효과 굉장 횟수 */
function SummaryTokens({ s }: { s: LogSummary }) {
    const t = useBattleT()
    const items = [
        { n: s.faints, label: t('sumFaint', { n: s.faints }) },
        { n: s.crits, label: t(s.crits === 1 ? 'sumCritOne' : 'sumCrit', { n: s.crits }) },
        { n: s.supers, label: t('sumSuper', { n: s.supers }) },
    ].filter(x => x.n > 0)
    return <>{items.map(x => <Token key={x.label} size="sm" color="red" label={x.label} />)}</>
}
