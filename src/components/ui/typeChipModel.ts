import type { TokenColor } from '@astryxdesign/core/Token'
import { TYPE_COLOR_CLASSES } from '../../lib/typeColorClasses'

/** pokestra 테마가 Token 에 `color:<type>` 변형을 가진 타입 (18 + 스텔라) */
export const THEMED_TYPES = [
    'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
    'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy', 'stellar',
] as const
export type ThemedType = (typeof THEMED_TYPES)[number]

/** 아이콘이 있는 18 타입 (public/assets/types/square·glyph, scripts/type-icons.py) */
export const TYPE_ICON_TYPES: ReadonlySet<string> = new Set(THEMED_TYPES.filter((t) => t !== 'stellar'))

export const isThemedType = (type: string): type is ThemedType => (THEMED_TYPES as readonly string[]).includes(type)

/** Token color: 테마 타입 변형, 모르는 타입은 gray */
export function typeTokenColor(type: string): TokenColor {
    return isThemedType(type) ? (type as TokenColor) : 'gray'
}

/** 타입 색 테두리 클래스 (모르면 기본 테두리) */
export function typeBorderClass(type: string): string {
    return TYPE_COLOR_CLASSES[type]?.border ?? 'border-border'
}

export type Multiplier = 0 | 0.25 | 0.5 | 1 | 2 | 4

/** 배수 글자: ×4 ×2 ×1 ×½ ×¼ ×0 */
export function multiplierLabel(m: number): string {
    if (m === 0.5) return '×½'
    if (m === 0.25) return '×¼'
    return `×${m}`
}

export type MultiplierTone = 'danger' | 'warning' | 'neutral' | 'safe' | 'strong-safe' | 'immune'

/**
 * 의미 색 단계. defense(받는 쪽): ×4 위험, ×2 주의, ×½ 안전, ×¼ 매우 안전, ×0 무효.
 * attack(때리는 쪽)은 뒤집는다: ×4/×2 가 좋고(안전 색) ×½/×¼ 주의, ×0 위험.
 */
export function multiplierTone(m: number, perspective: 'defense' | 'attack' = 'defense'): MultiplierTone {
    if (m === 1) return 'neutral'
    if (perspective === 'defense') {
        if (m >= 4) return 'danger'
        if (m > 1) return 'warning'
        if (m === 0) return 'immune'
        return m <= 0.25 ? 'strong-safe' : 'safe'
    }
    if (m >= 4) return 'strong-safe'
    if (m > 1) return 'safe'
    if (m === 0) return 'danger'
    return 'warning'
}

/** 의미 단계 → Astryx Token 기본 색 */
export const TONE_TOKEN_COLOR: Record<MultiplierTone, TokenColor> = {
    danger: 'red',
    warning: 'orange',
    neutral: 'default',
    safe: 'green',
    'strong-safe': 'teal',
    immune: 'gray',
}

/** 메시지 키 (typeChipMessages) */
export function multiplierMessageKey(m: number, perspective: 'defense' | 'attack' = 'defense') {
    if (perspective === 'defense') {
        if (m >= 4) return 'quadWeak' as const
        if (m > 1) return 'weak' as const
        if (m === 1) return 'neutral' as const
        if (m === 0) return 'immune' as const
        return m <= 0.25 ? ('quadResist' as const) : ('resist' as const)
    }
    if (m >= 4) return 'quadSuperEffective' as const
    if (m > 1) return 'superEffective' as const
    if (m === 1) return 'neutral' as const
    if (m === 0) return 'noEffect' as const
    return m <= 0.25 ? ('quadNotVeryEffective' as const) : ('notVeryEffective' as const)
}
