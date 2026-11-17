/**
 * 기술/특성/스프라이트 페이지에서 함께 쓰는 작은 UI 조각들.
 * 스타일은 "연구 노트" 디자인 시스템 (src/styles.css, src/components/ui/notebook.tsx).
 */
import { memo, useId, useState, type ReactNode, type RefObject } from 'react'
import { Link } from 'react-router'
import { useLang, useT } from '../../i18n'
import { commonMessages } from '../../i18n/messages/common'
import { type DexPokemon, displayName, getSpeciesId } from '../../lib/dex'
import { EmptyNote, PageTitle, TypeTag } from '../ui/notebook'
import { padDexNo } from './text'

// ── 타입 배지 ──

export function TypeBadge({ type, size = 'sm' }: { type: string; size?: 'sm' | 'md' }) {
    return <TypeTag type={type} size={size} />
}

// ── 분류(물리/특수/변화) 배지 ──

/** 물리 = 빨간 펜, 특수 = 잉크, 변화 = 연한 잉크. 글자 앞 기호로도 구분 */
const CLASS_STYLE: Record<string, { cls: string; mark: string }> = {
    physical: { cls: 'text-pen', mark: '◆' },
    special: { cls: 'text-ink', mark: '◎' },
    status: { cls: 'text-ink-faint', mark: '○' },
}

export function ClassBadge({ label, damageClass }: { label: string; damageClass: string }) {
    const s = CLASS_STYLE[damageClass] ?? CLASS_STYLE.status
    return (
        <span className={`inline-flex shrink-0 items-center gap-1 text-xs font-semibold whitespace-nowrap ${s.cls}`}>
            <span aria-hidden className="text-[0.7em]">
                {s.mark}
            </span>
            {label}
        </span>
    )
}

// ── 필터 칩 ──

export function FilterChip({
    active,
    onClick,
    children,
    color,
}: {
    active: boolean
    onClick: () => void
    children: ReactNode
    /** 타입 칩 등: 켜지면 아래에 이 색 밑줄 */
    color?: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className="chip"
            style={active && color ? { boxShadow: `inset 0 -3px 0 ${color}` } : undefined}
        >
            {children}
        </button>
    )
}

/** 두세 개 중 하나를 고르는 세그먼트 버튼 */
export function Segmented<V extends string>({
    label,
    value,
    options,
    onChange,
}: {
    label: string
    value: V
    options: { value: V; label: string }[]
    onChange: (v: V) => void
}) {
    return (
        <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1">
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={value === o.value}
                    onClick={() => onChange(o.value)}
                    className="chip"
                >
                    {o.label}
                </button>
            ))}
        </div>
    )
}

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
    return (
        <label htmlFor={htmlFor} className="mb-1 block text-xs font-semibold text-ink-soft">
            {children}
        </label>
    )
}

export function SelectField({
    label,
    value,
    onChange,
    children,
}: {
    label: string
    value: string
    onChange: (v: string) => void
    children: ReactNode
}) {
    const id = useId()
    return (
        <div className="min-w-0">
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="box-input w-full">
                {children}
            </select>
        </div>
    )
}

// ── 검색창 ──

export function SearchField({
    value,
    onChange,
    label,
    placeholder,
}: {
    value: string
    onChange: (v: string) => void
    label: string
    placeholder?: string
}) {
    const t = useT(commonMessages)
    const id = useId()
    return (
        <div className="relative">
            <label htmlFor={id} className="sr-only">
                {label}
            </label>
            <svg
                aria-hidden
                viewBox="0 0 20 20"
                className="pointer-events-none absolute top-1/2 left-0.5 h-4 w-4 -translate-y-1/2 text-ink-faint"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
            >
                <circle cx="9" cy="9" r="6" />
                <path d="m14 14 4 4" strokeLinecap="round" />
            </svg>
            <input
                id={id}
                type="search"
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                autoComplete="off"
                className="line-input !pr-16 !pl-7 text-base"
            />
            {value && (
                <button type="button" onClick={() => onChange('')} className="btn-text absolute top-1/2 right-0 -translate-y-1/2 text-xs">
                    {t('clear')}
                </button>
            )}
        </div>
    )
}

// ── 페이지 머리 / 빈 상태 / 뒤로 ──

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
    return (
        <PageTitle title={title} lead={subtitle}>
            {children}
        </PageTitle>
    )
}

export function EmptyState({ children }: { children?: ReactNode }) {
    const t = useT(commonMessages)
    return <EmptyNote>{children ?? t('noResults')}</EmptyNote>
}

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
    return (
        <Link to={to} className="btn-text mb-5 inline-flex items-center gap-1 text-sm">
            <span aria-hidden>←</span>
            {children}
        </Link>
    )
}

/** 측정값 한 칸: 작은 라벨 + 큰 숫자 (명조) */
export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
    return (
        <div className="border-l-2 border-rule-strong pl-3">
            <dt className="text-xs text-ink-soft">{label}</dt>
            <dd className="font-serif text-2xl font-bold tnum text-ink">{value}</dd>
            {hint && <dd className="text-[11px] text-ink-faint">{hint}</dd>}
        </div>
    )
}

// ── 더 보기 ──

export function LoadMore({
    hasMore,
    onMore,
    sentinelRef,
}: {
    hasMore: boolean
    onMore: () => void
    sentinelRef: RefObject<HTMLDivElement | null>
}) {
    const t = useT(commonMessages)
    if (!hasMore) return null
    return (
        <div ref={sentinelRef} className="mt-6 flex justify-center">
            <button type="button" onClick={onMore} className="btn btn-line">
                {t('showMore')}
            </button>
        </div>
    )
}

// ── 포켓몬 칩 (스프라이트 + 이름) ──

function PokemonChipImpl({ pokemon: p, badge }: { pokemon: DexPokemon; badge?: ReactNode }) {
    const lang = useLang()
    const [failed, setFailed] = useState(false)
    const name = displayName(p, lang)
    return (
        <Link to={`/pokemon/${p.id}`} className="plate group flex min-w-0 items-center gap-2 p-1.5 pr-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center">
                {p.sprite && !failed ? (
                    <img
                        src={p.sprite}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        width={40}
                        height={40}
                        onError={() => setFailed(true)}
                        className="h-10 w-10 object-contain [image-rendering:pixelated]"
                    />
                ) : (
                    <span className="text-sm text-ink-faint" aria-hidden>
                        ?
                    </span>
                )}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink group-hover:underline">{name}</span>
                <span className="flex items-center gap-1.5 text-[11px] tnum text-ink-faint">
                    {padDexNo(getSpeciesId(p))}
                    {badge}
                </span>
            </span>
        </Link>
    )
}

export const PokemonChip = memo(PokemonChipImpl)
