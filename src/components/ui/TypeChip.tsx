/**
 * 타입 배지(TypeChip)와 상성 배수 칩(MultiplierChip).
 *
 * - 배경·글자 색은 pokestra 테마의 Token `color:<type>` 변형(--pokestra-type-<type>-bg/on)에서 온다.
 *   라이트/다크 모두 글자 대비 4.5:1 이상 (src/lib/typeColors.test.ts).
 * - 기존 components/battle/TypeBadge, ui/shared 의 TypeTag 와는 별개의 새 컴포넌트다.
 *   (사용처 교체는 밀도 트랙 머지 후 진행)
 */
import { Token } from '@astryxdesign/core/Token'
import { useLang, useT } from '../../i18n'
import { typeChipMessages } from '../../i18n/messages/typeChips'
import { typeName } from '../../lib/dex'
import {
    TONE_TOKEN_COLOR,
    TYPE_ICON_TYPES,
    multiplierLabel,
    multiplierMessageKey,
    multiplierTone,
    typeBorderClass,
    typeTokenColor,
} from './typeChipModel'
import { cx } from './utils'

export type TypeChipSize = 'sm' | 'md'

const ICON_CLASS: Record<TypeChipSize, string> = { sm: 'size-3.5', md: 'size-4' }

/** 타입 아이콘(원형 SVG). 아이콘이 없는 타입은 그리지 않는다. */
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

/** 타입 배지: 타입 아이콘 + 이름, 배경이 타입 색 (Astryx Token) */
export function TypeChip({ type, size = 'md', label, iconOnly = false, href, className }: TypeChipProps) {
    const lang = useLang()
    const name = label ?? typeName(type, lang)
    return (
        <Token
            label={name}
            size={size}
            color={typeTokenColor(type)}
            icon={<TypeGlyph type={type} size={size} />}
            isLabelHidden={iconOnly}
            href={href}
            className={cx('shrink-0', className)}
        />
    )
}

export type MultiplierChipProps = {
    /** 상성 배수: 4, 2, 1, 0.5, 0.25, 0 */
    multiplier: number
    /** 공격 타입: 아이콘과 타입 색 테두리를 더한다 */
    type?: string
    /** defense: 받는 피해(×4 위험), attack: 주는 피해(×4 좋음). 기본 defense */
    perspective?: 'defense' | 'attack'
    size?: TypeChipSize
    className?: string
}

/** 상성 배수 칩: 의미 색(위험/주의/안전) 배경 + (타입이 있으면) 타입 아이콘·타입 색 테두리 */
export function MultiplierChip({ multiplier, type, perspective = 'defense', size = 'sm', className }: MultiplierChipProps) {
    const lang = useLang()
    const t = useT(typeChipMessages)
    const tone = multiplierTone(multiplier, perspective)
    const meaning = t(multiplierMessageKey(multiplier, perspective))
    const label = multiplierLabel(multiplier)
    return (
        <Token
            label={label}
            size={size}
            color={TONE_TOKEN_COLOR[tone]}
            icon={type ? <TypeGlyph type={type} size={size} /> : undefined}
            description={type ? `${typeName(type, lang)} ${label}: ${meaning}` : `${label}: ${meaning}`}
            className={cx('shrink-0 font-semibold tabular-nums', type && cx('border', typeBorderClass(type)), className)}
        />
    )
}
