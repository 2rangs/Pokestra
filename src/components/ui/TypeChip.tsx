/**
 * 타입 배지(TypeChip)와 상성 배수 칩(MultiplierChip).
 *
 * - 타입 배지: 진한 타입 색 단색 + 흰 문양·흰 글자 (pokestra 테마 Token `color:<type>` 변형).
 *   라이트/다크 모두 글자 대비 4.5:1 이상 (src/lib/typeColors.test.ts).
 * - 화면의 색은 타입에만 쓴다. 상성 배수는 흑백(굵기·글자색)으로 위험도를 구분한다.
 */
import { Token } from '@astryxdesign/core/Token'
import { useLang, useT } from '../../i18n'
import { typeChipMessages } from '../../i18n/messages/typeChips'
import { typeName } from '../../lib/dex'
import { Text } from '@astryxdesign/core/Text'
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden'
import { TYPE_GLYPHS } from './typeGlyphs'
import { TYPE_ICON_TYPES, multiplierLabel, multiplierMessageKey, multiplierTone, typeTokenColor } from './typeChipModel'
import { cx } from './utils'

export type TypeChipSize = 'sm' | 'md'

const ICON_CLASS: Record<TypeChipSize, string> = { sm: 'size-3.5', md: 'size-4' }
/**
 * Token 크기는 한 단계 위로: Token sm(20px)은 14px 글자에 비해 낮아 글자가 눌려 보인다.
 * 우리 sm → Token md, md → Token lg.
 */
const TOKEN_SIZE = { sm: 'md', md: 'lg' } as const

/** 타입 아이콘(색 원 + 흰 문양 SVG): 필터 버튼·검색 후보처럼 중립 바탕 위에서. 아이콘이 없는 타입은 그리지 않는다. */
export function TypeGlyph({ type, size = 'md' }: { type: string; size?: TypeChipSize }) {
    if (!TYPE_ICON_TYPES.has(type)) return null
    return (
        <img
            src={`${import.meta.env.BASE_URL}assets/types/${type}.svg`}
            alt=""
            aria-hidden
            width={16}
            height={16}
            className={cx('shrink-0', ICON_CLASS[size])}
        />
    )
}

/** 타입 문양만 (currentColor): 타입 색 배지 위의 흰 문양 */
export function TypeMark({ type, size = 'md' }: { type: string; size?: TypeChipSize }) {
    const shapes = TYPE_GLYPHS[type]
    if (!shapes) return null
    return (
        <svg viewBox="0 0 128 128" fill="currentColor" aria-hidden className={cx('shrink-0 drop-shadow-sm', ICON_CLASS[size])}>
            {shapes.map(([tag, a], i) =>
                tag === 'path' ? <path key={i} d={a.d} /> : tag === 'polygon' ? <polygon key={i} points={a.points} /> : <circle key={i} cx={a.cx} cy={a.cy} r={a.r} />,
            )}
        </svg>
    )
}

export type TypeChipProps = {
    /** 타입 slug (fire, water …, stellar). 모르는 타입은 회색 */
    type: string
    /** sm: 표·목록 행, md: 머리말·카드 (기본 md) */
    size?: TypeChipSize
    /** 표시 이름 대신 쓸 글자 (기본: 현재 언어의 타입 이름) */
    label?: string
    /** 아이콘만 보이고 이름은 스크린리더에만 */
    iconOnly?: boolean
    /** 링크로 쓸 때 */
    href?: string
    className?: string
}

/** 타입 배지: 진한 타입 색 단색 + 흰 문양 + 흰 이름 (Astryx Token) */
export function TypeChip({ type, size = 'md', label, iconOnly = false, href, className }: TypeChipProps) {
    const lang = useLang()
    const name = label ?? typeName(type, lang)
    return (
        <Token
            label={name}
            size={TOKEN_SIZE[size]}
            color={typeTokenColor(type)}
            icon={<TypeMark type={type} size={size} />}
            isLabelHidden={iconOnly}
            href={href}
            className={cx('shrink-0', className)}
        />
    )
}

export type MultiplierChipProps = {
    /** 상성 배수: 4, 2, 1, 0.5, 0.25, 0 */
    multiplier: number
    /** defense: 받는 피해(×4 위험), attack: 주는 피해(×4 좋음). 기본 defense */
    perspective?: 'defense' | 'attack'
    className?: string
}

/**
 * 상성 배수: 흑백. 위험할수록(받는 쪽 ×4·×2) 진하고 굵게, 덜 위험할수록 흐리게.
 * 뜻은 스크린리더용 글자로 붙인다.
 */
export function MultiplierChip({ multiplier, perspective = 'defense', className }: MultiplierChipProps) {
    const t = useT(typeChipMessages)
    const tone = multiplierTone(multiplier, perspective)
    const strong = tone === 'danger' || tone === 'warning'
    return (
        <Text
            weight={tone === 'danger' ? 'bold' : strong ? 'semibold' : 'medium'}
            color={strong ? 'primary' : 'secondary'}
            hasTabularNumbers
            textWrap="nowrap"
            className={className}
        >
            {multiplierLabel(multiplier)}
            <VisuallyHidden> {t(multiplierMessageKey(multiplier, perspective))}</VisuallyHidden>
        </Text>
    )
}
