import { TYPE_COLOR, typeNameKo } from '../../lib/battle'

export function TypeBadge({ type, size = 'sm', className = '' }: { type: string; size?: 'xs' | 'sm'; className?: string }) {
    const color = TYPE_COLOR[type] ?? '#94a3b8'
    const pad = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
    return (
        <span
            className={`inline-flex items-center rounded-md font-bold text-white leading-none whitespace-nowrap ${pad} ${className}`}
            style={{ background: color, textShadow: '0 1px 1px rgba(0,0,0,.25)' }}
        >
            {typeNameKo(type)}
        </span>
    )
}
