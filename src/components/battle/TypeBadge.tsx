import { TYPE_COLOR, typeNameL } from '../../lib/battle'
import { useLang } from '../../i18n'

const DARK_TEXT = new Set(['electric', 'ice', 'rock', 'flying', 'normal', 'steel', 'ground', 'bug', 'grass', 'fairy', 'psychic', 'fire'])

/** 타입 배지. 이름은 현재 언어로 표시한다 */
export function TypeBadge({ type, size = 'sm', className = '', title }: {
    type: string
    size?: 'xs' | 'sm'
    className?: string
    title?: string
}) {
    const lang = useLang()
    const color = TYPE_COLOR[type] ?? '#94a3b8'
    const pad = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
    const name = typeNameL(type, lang)
    return (
        <span
            className={`inline-flex items-center rounded-md font-bold text-white leading-none whitespace-nowrap ${pad} ${className}`}
            style={{ background: color, textShadow: DARK_TEXT.has(type) ? '0 1px 1px rgba(0,0,0,.45)' : '0 1px 1px rgba(0,0,0,.25)' }}
            title={title}
            lang={lang}
        >
            {name}
        </span>
    )
}
