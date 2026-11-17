/**
 * "연구 노트" 디자인 시스템의 공용 조각.
 * 색/폰트 토큰과 .sheet/.chip/.btn 등의 클래스는 src/styles.css 에 있다.
 *
 * - PageTitle: 명조 제목 + (선택) 빨간 펜 메모
 * - SectionTitle: 오른쪽으로 줄이 이어지는 소제목
 * - PenNote: 손글씨 빨간 펜 메모 (강조할 곳에만 아껴 쓴다)
 * - TypeTag: 타입 아이콘 + 이름 + 색연필 밑줄
 * - StatBar: 눈금 있는 능력치 막대
 * - Plate: 표본 도판 틀 (번호 캡션)
 */
import type { CSSProperties, ElementType, ReactNode } from 'react'
import { useLang } from '../../i18n'
import { typeName } from '../../lib/dex'
import { cx, typeColor } from './notebookUtils'


// ── 제목 ──

export function PageTitle({
    title,
    lead,
    note,
    children,
    className,
}: {
    title: ReactNode
    /** 제목 아래 한두 줄 설명 */
    lead?: ReactNode
    /** 제목 옆 빨간 펜 메모 */
    note?: ReactNode
    children?: ReactNode
    className?: string
}) {
    return (
        <header className={cx('mb-8', className)}>
            <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
                <h1 className="font-serif text-3xl leading-tight font-bold text-ink sm:text-[2.6rem]">{title}</h1>
                {note && <PenNote className="mb-1 -rotate-2 text-xl sm:text-2xl">{note}</PenNote>}
            </div>
            {lead && <p className="mt-2 max-w-[62ch] text-[0.95rem] text-ink-soft">{lead}</p>}
            {children}
        </header>
    )
}

export function SectionTitle({
    children,
    as: Tag = 'h2',
    aside,
    id,
    className,
}: {
    children: ReactNode
    as?: ElementType
    /** 오른쪽 끝 (개수, 버튼 등) */
    aside?: ReactNode
    id?: string
    className?: string
}) {
    return (
        <div className={cx('mb-3 flex items-baseline gap-3', className)}>
            <Tag id={id} className="shrink-0 font-serif text-lg font-bold text-ink sm:text-xl">
                {children}
            </Tag>
            <span aria-hidden className="h-px flex-1 translate-y-[-0.3em] bg-rule-strong" />
            {aside && <div className="shrink-0 text-sm text-ink-soft">{aside}</div>}
        </div>
    )
}

export function PenNote({ children, className, as: Tag = 'span' }: { children: ReactNode; className?: string; as?: ElementType }) {
    return <Tag className={cx('pen-note inline-block', className)}>{children}</Tag>
}

// ── 타입 ──

const KNOWN_TYPE_ICONS = new Set([
    'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
    'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
])

export function TypeIconDot({ type, className = 'h-4 w-4' }: { type: string; className?: string }) {
    if (!KNOWN_TYPE_ICONS.has(type)) {
        return <span aria-hidden className={cx('inline-block rounded-full', className)} style={{ background: typeColor(type) }} />
    }
    return (
        <img
            src={`${import.meta.env.BASE_URL}assets/types/${type}.svg`}
            alt=""
            aria-hidden
            className={cx('shrink-0', className)}
            width={16}
            height={16}
        />
    )
}

/** 타입 표시: 아이콘 + 이름 + 색연필 밑줄 */
export function TypeTag({
    type,
    size = 'sm',
    label,
    title,
    className,
}: {
    type: string
    size?: 'xs' | 'sm' | 'md' | 'lg'
    /** 이름 대신 쓸 글자 (예: 테라 타입) */
    label?: ReactNode
    title?: string
    className?: string
}) {
    const lang = useLang()
    const color = typeColor(type)
    const s = {
        xs: { text: 'text-[11px]', icon: 'h-3 w-3', gap: 'gap-1' },
        sm: { text: 'text-xs', icon: 'h-3.5 w-3.5', gap: 'gap-1' },
        md: { text: 'text-sm', icon: 'h-4 w-4', gap: 'gap-1.5' },
        lg: { text: 'text-base', icon: 'h-5 w-5', gap: 'gap-1.5' },
    }[size]
    return (
        <span
            title={title}
            className={cx('inline-flex shrink-0 items-center font-semibold whitespace-nowrap text-ink', s.text, s.gap, className)}
        >
            <TypeIconDot type={type} className={s.icon} />
            <span
                className="leading-tight"
                style={{
                    textDecorationLine: 'underline',
                    textDecorationColor: color,
                    textDecorationThickness: size === 'lg' ? 3 : 2,
                    textUnderlineOffset: size === 'lg' ? 5 : 3,
                }}
            >
                {label ?? typeName(type, lang)}
            </span>
        </span>
    )
}

// ── 능력치 막대 ──

/** 0~max 막대. 25 단위 눈금. highlight 이면 빨간 펜 */
export function StatBar({
    value,
    max = 255,
    highlight,
    color,
    className,
    label,
}: {
    value: number
    max?: number
    highlight?: boolean
    /** 막대 색 (기본: 잉크) */
    color?: string
    className?: string
    label?: string
}) {
    const pct = Math.max(0, Math.min(100, (value / max) * 100))
    const tick = (25 / max) * 100
    const style: CSSProperties = {
        backgroundImage: `repeating-linear-gradient(to right, transparent 0 calc(${tick}% - 1px), var(--color-rule) calc(${tick}% - 1px) ${tick}%)`,
    }
    return (
        <div
            className={cx('relative h-2.5 w-full overflow-hidden rounded-[1px] border-b border-rule-strong', className)}
            style={style}
            role="meter"
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-label={label}
        >
            <div
                className="absolute inset-y-0 left-0"
                style={{ width: `${pct}%`, background: color ?? (highlight ? 'var(--color-pen)' : 'var(--color-ink)') }}
            />
        </div>
    )
}

// ── 도판 ──

/** 표본 도판 캡션: "No. 0006" 같은 번호 */
export function PlateNo({ children, className }: { children: ReactNode; className?: string }) {
    return <span className={cx('font-serif text-xs tnum text-ink-faint', className)}>{children}</span>
}

// ── 상태 ──

export function Spinner({ label, className }: { label?: string; className?: string }) {
    return (
        <div role="status" className={cx('flex items-center justify-center gap-2 py-10 text-sm text-ink-soft', className)}>
            <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-rule-strong border-t-pen" />
            {label}
        </div>
    )
}

/** 빈 상태: 점선 상자 + 빨간 펜 한 줄 */
export function EmptyNote({ children, action }: { children: ReactNode; action?: ReactNode }) {
    return (
        <div className="flex flex-col items-center gap-3 rounded-[3px] border border-dashed border-rule-strong px-4 py-12 text-center">
            <PenNote className="-rotate-1 text-xl">{children}</PenNote>
            {action}
        </div>
    )
}

