/**
 * 기술/특성/스프라이트 페이지에서 함께 쓰는 작은 UI 조각들.
 */
import { memo, useId, useState, type ReactNode, type RefObject } from 'react'
import { Link } from 'react-router'
import { useLang, useT } from '../../i18n'
import { commonMessages } from '../../i18n/messages/common'
import { TYPE_COLOR } from '../../lib/dex'
import { type DexPokemon, displayName, getSpeciesId, typeName } from '../../lib/dex'
import { padDexNo } from './text'

// ── 타입 배지 ──

const KNOWN_TYPE_ICONS = new Set([
    'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
    'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
])

/** 배경색이 밝으면 어두운 글자 */
function isLight(hex: string): boolean {
    const h = hex.replace('#', '')
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    return 0.299 * r + 0.587 * g + 0.114 * b > 0.72
}

export function TypeBadge({ type, size = 'sm' }: { type: string; size?: 'sm' | 'md' }) {
    const lang = useLang()
    const color = TYPE_COLOR[type] ?? '#94a3b8'
    const light = isLight(color)
    return (
        <span
            className={[
                'inline-flex shrink-0 items-center gap-1 rounded-md font-bold leading-none whitespace-nowrap',
                size === 'md' ? 'px-2 py-1 text-xs' : 'px-1.5 py-0.5 text-[11px]',
                light ? 'text-slate-900' : 'text-white',
            ].join(' ')}
            style={{ backgroundColor: color }}
        >
            {KNOWN_TYPE_ICONS.has(type) && (
                <img
                    src={`${import.meta.env.BASE_URL}assets/types/${type}.svg`}
                    alt=""
                    aria-hidden
                    className={size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'}
                />
            )}
            {typeName(type, lang)}
        </span>
    )
}

// ── 분류(물리/특수/변화) 배지 ──

const CLASS_STYLE: Record<string, string> = {
    physical: 'bg-orange-50 text-orange-700 ring-orange-200',
    special: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    status: 'bg-slate-100 text-slate-600 ring-slate-200',
}

export function ClassBadge({ label, damageClass }: { label: string; damageClass: string }) {
    return (
        <span
            className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-none ring-1 ring-inset ${CLASS_STYLE[damageClass] ?? CLASS_STYLE.status}`}
        >
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
    /** 활성 시 배경색 (타입 칩 등) */
    color?: string
}) {
    const style = active && color ? { backgroundColor: color, borderColor: color, color: isLight(color) ? '#0f172a' : '#fff' } : undefined
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            style={style}
            className={[
                'shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400',
                active
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900',
            ].join(' ')}
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
        <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-0.5">
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={value === o.value}
                    onClick={() => onChange(o.value)}
                    className={[
                        'rounded-[10px] px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400',
                        value === o.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
                    ].join(' ')}
                >
                    {o.label}
                </button>
            ))}
        </div>
    )
}

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
    return (
        <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-bold text-slate-500">
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
            <select
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
            >
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
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
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
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-9 pr-16 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100 [&::-webkit-search-cancel-button]:hidden"
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                    {t('clear')}
                </button>
            )}
        </div>
    )
}

// ── 페이지 머리 / 빈 상태 / 뒤로 ──

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
    return (
        <header className="mb-5">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
            {children}
        </header>
    )
}

export function EmptyState({ children }: { children?: ReactNode }) {
    const t = useT(commonMessages)
    return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center text-sm text-slate-400">
            {children ?? t('noResults')}
        </div>
    )
}

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
    return (
        <Link
            to={to}
            className="mb-4 inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
            <span aria-hidden>←</span>
            {children}
        </Link>
    )
}

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center">
            <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</dt>
            <dd className="mt-1 text-xl font-extrabold tabular-nums text-slate-900">{value}</dd>
            {hint && <dd className="text-[11px] text-slate-400">{hint}</dd>}
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
        <div ref={sentinelRef} className="mt-4 flex justify-center">
            <button
                type="button"
                onClick={onMore}
                className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:border-slate-300 hover:text-slate-900"
            >
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
        <Link
            to={`/pokemon/${p.id}`}
            className="group flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pr-2.5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50">
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
                    <span className="text-sm text-slate-300" aria-hidden>
                        ?
                    </span>
                )}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-slate-800 group-hover:text-red-500">{name}</span>
                <span className="flex items-center gap-1 text-[10px] tabular-nums text-slate-400">
                    {padDexNo(getSpeciesId(p))}
                    {badge}
                </span>
            </span>
        </Link>
    )
}

export const PokemonChip = memo(PokemonChipImpl)
