// ─── HUD 공용 조각 (이름·HP 막대·상태이상 칩) ───────────────────
import { ProgressBar } from '@astryxdesign/core/ProgressBar'
import { Token } from '@astryxdesign/core/Token'
import { statusLongName, statusName } from '../../../lib/battleLog'
import type { Lang } from '../../../i18n'
import { ratioOf, pctOf, type TokenColor } from './util'

const STATUS_COLOR: Record<string, TokenColor> = {
    burn: 'orange', freeze: 'cyan', paralysis: 'yellow', poison: 'purple', toxic: 'purple', sleep: 'gray',
}

export function StatusToken({ status, lang }: { status: string; lang: Lang }) {
    return (
        <span title={statusLongName(status, lang)} className="inline-flex">
            <Token size="sm" color={STATUS_COLOR[status] ?? 'gray'} label={statusName(status, lang)} description={statusLongName(status, lang)} />
        </span>
    )
}

/** HP 막대: 많으면 초록, 절반 이하 노랑, 1/5 이하 빨강 */
export function HpBar({ p, label }: { p: { hp: number; max_hp: number }; label: string }) {
    const ratio = ratioOf(p)
    return (
        <ProgressBar
            label={label}
            isLabelHidden
            value={pctOf(p)}
            max={100}
            variant={ratio > 0.5 ? 'success' : ratio > 0.2 ? 'warning' : 'error'}
        />
    )
}
