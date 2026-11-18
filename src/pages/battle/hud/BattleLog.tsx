import { useEffect, useMemo, useRef } from 'react'
import type { PlayerID } from '@kyasi/pokebattle-engine'
import { Text } from '@astryxdesign/core/Text'
import { useLang } from '../../../i18n'
import { frameText, type Frame } from '../useBattleSession'
import { useBattleT } from './util'

// ─── 로그 ────────────────────────────────────────────────────
export function BattleLog({ frames, revealed, sideName }: {
    frames: Frame[]
    /** 보여줄 프레임 수 (재생 중이면 일부만) */
    revealed: number
    sideName?: (p: PlayerID) => string
}) {
    const lang = useLang()
    const t = useBattleT()
    const ref = useRef<HTMLDivElement>(null)
    // 문장은 현재 언어로 그릴 때마다 만든다 → 언어를 바꾸면 지난 로그도 바뀐다
    const lines = useMemo(
        () => frames.slice(0, revealed)
            .map(f => ({ f, text: frameText(f, lang, sideName) }))
            .filter((x): x is { f: Frame; text: string } => x.text !== null),
        [frames, revealed, lang, sideName],
    )
    useEffect(() => {
        const el = ref.current
        if (el) el.scrollTop = el.scrollHeight
    }, [lines.length])
    return (
        <div
            ref={ref}
            role="log"
            aria-live="polite"
            aria-label={t('battleLog')}
            tabIndex={0}
            className="h-72 overflow-y-auto overscroll-contain rounded-md border border-border bg-surface px-3 py-2 text-sm lg:h-160"
        >
            {lines.length === 0 && <Text color="secondary">{t('logEmpty')}</Text>}
            <ul className="flex flex-col gap-0.5">
                {lines.map(({ f, text }) => {
                    const e = f.event
                    if (e.type === 'turn_start') {
                        return (
                            <li key={f.index} className="mt-3 border-t border-border pt-2 first:mt-0 first:border-t-0 first:pt-0">
                                <Text type="label" color="secondary">{text}</Text>
                            </li>
                        )
                    }
                    const key = e.type === 'faint' || (e.type === 'damage' && (e.crit || (e.effectiveness ?? 1) > 1))
                    const tone = e.type === 'battle_end' ? 'mt-2 font-bold text-accent'
                        : key ? 'font-medium text-error'
                            : e.type === 'move_use' ? 'font-semibold text-primary'
                                : 'text-secondary'
                    return <li key={f.index} className={tone}>{text}</li>
                })}
            </ul>
        </div>
    )
}
