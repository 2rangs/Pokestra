// ─── HUD 공용 조각 (이름·HP 막대·상태이상 칩) ───────────────────
import type { ReactNode } from 'react'
import { ProgressBar } from '@astryxdesign/core/ProgressBar'
import { Token } from '@astryxdesign/core/Token'
import { Tooltip } from '@astryxdesign/core/Tooltip'
import { statusLongName, statusName } from '../../../lib/battleLog'
import type { Lang } from '../../../i18n'
import { ratioOf, pctOf, type TokenColor } from './util'

const STATUS_COLOR: Record<string, TokenColor> = {
    burn: 'orange', freeze: 'cyan', paralysis: 'yellow', poison: 'purple', toxic: 'purple', sleep: 'gray',
}

export function StatusToken({ status, lang }: { status: string; lang: Lang }) {
    // Token 은 title 을 받지 않아 호버 설명용 감싸개 (교체 버튼 안에서도 쓰므로 포커스 가능하게 만들지 않는다)
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

/** 툴팁이 있는 칩: 키보드로도 닿도록 포커스 가능한 감싸개 (설명은 Token description 으로 스크린 리더에 그대로) */
export function TipChip({ tip, children }: { tip: string; children: ReactNode }) {
    return (
        <Tooltip content={tip}>
            <span tabIndex={0} className="inline-flex rounded-md outline-offset-2 focus-visible:outline-2 focus-visible:outline-accent">
                {children}
            </span>
        </Tooltip>
    )
}
