const TYPE_META: Record<string, { ko: string; icon: string }> = {
    normal:   { ko: '노말',   icon: '●' },
    fire:     { ko: '불꽃',   icon: '🔥' },
    water:    { ko: '물',     icon: '💧' },
    electric: { ko: '전기',   icon: '⚡' },
    grass:    { ko: '풀',     icon: '🌿' },
    ice:      { ko: '얼음',   icon: '❄️' },
    fighting: { ko: '격투',   icon: '✊' },
    poison:   { ko: '독',     icon: '☠️' },
    ground:   { ko: '땅',     icon: '⛰️' },
    flying:   { ko: '비행',   icon: '🕊️' },
    psychic:  { ko: '에스퍼', icon: '🔮' },
    bug:      { ko: '벌레',   icon: '🐛' },
    rock:     { ko: '바위',   icon: '🪨' },
    ghost:    { ko: '고스트', icon: '👻' },
    dragon:   { ko: '드래곤', icon: '🐲' },
    dark:     { ko: '악',     icon: '🌑' },
    steel:    { ko: '강철',   icon: '⚙️' },
    fairy:    { ko: '페어리', icon: '✨' },
}

interface TypeBadgeProps {
    type: string
    /** 사이드바 필터용 */
    selectable?: boolean
    selected?: boolean
    dimmed?: boolean
    onClick?: () => void
}

const TypeBadge = ({ type, selectable, selected, dimmed, onClick }: TypeBadgeProps) => {
    const meta = TYPE_META[type]
    if (!meta) return null

    const classes = [
        'type-badge',
        type,
        selectable && 'type-select-btn',
        selected && 'selected',
        dimmed && 'dimmed',
    ].filter(Boolean).join(' ')

    const Tag = selectable ? 'button' : 'span'

    return (
        <Tag className={classes} onClick={onClick}>
            <span className="type-icon">{meta.icon}</span>
            {meta.ko}
        </Tag>
    )
}

export { TYPE_META }
export default TypeBadge