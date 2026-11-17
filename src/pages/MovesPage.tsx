import { useDeferredValue, useMemo, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import {
    BackLink,
    ClassBadge,
    EmptyState,
    FieldLabel,
    FilterChip,
    LoadMore,
    PageHeader,
    PokemonChip,
    SearchField,
    Segmented,
    SelectField,
    StatTile,
    TypeBadge,
} from '../components/dex/DexUi'
import { buildSearchKey, cleanDesc, foldSearch } from '../components/dex/text'
import { useProgressive } from '../components/dex/useProgressive'
import { collator, LANGS, useDocumentTitle, useLang, useT, type Lang } from '../i18n'
import { commonMessages } from '../i18n/messages/common'
import { movesMessages } from '../i18n/messages/moves'
import { TYPE_COLOR } from '../lib/dex'
import {
    damageClassName,
    type DexMove,
    generationName,
    getSpeciesId,
    isAlternateForm,
    localText,
    MOVE_BY_NAME,
    MOVES,
    moveName,
    pokemonWithMove,
    TYPES,
    typeName,
} from '../lib/dex'

// ── 데이터 (모듈 로드 시 1회) ──

const LIST_MOVES: readonly DexMove[] = MOVES.filter((m) => m.type !== 'shadow')
const SEARCH_INDEX = new Map(
    LIST_MOVES.map((m) => [m.name, buildSearchKey(m.name, m.hasKoreanName ? m.nameKo : null, m.nameEn, m.nameJa)]),
)
const MOVE_TYPES = TYPES.map((t) => t.name).filter((t) => LIST_MOVES.some((m) => m.type === t))
const MOVE_GENS = [...new Set(LIST_MOVES.map((m) => m.generation).filter((g): g is number => g != null))].sort((a, b) => a - b)
const CLASSES = ['physical', 'special', 'status'] as const

type SortKey = 'name' | 'power' | 'accuracy' | 'pp' | 'id'
const SORT_KEYS: readonly SortKey[] = ['name', 'power', 'accuracy', 'pp', 'id']
const DEFAULT_DIR: Record<SortKey, 'asc' | 'desc'> = { name: 'asc', id: 'asc', power: 'desc', accuracy: 'desc', pp: 'desc' }

function numericValue(m: DexMove, key: Exclude<SortKey, 'name'>): number | null {
    if (key === 'id') return m.id
    return m[key]
}

const fmt = (v: number | null, suffix = '') => (v == null ? '—' : `${v}${suffix}`)

export default function MovesPage() {
    const { slug } = useParams()
    return slug ? <MoveDetail slug={slug} /> : <MoveList />
}

// ── 목록 ──

function MoveList() {
    const lang = useLang()
    const t = useT(movesMessages)
    const tc = useT(commonMessages)
    const location = useLocation()
    const [params, setParams] = useSearchParams()
    useDocumentTitle(t('title'))

    const q = params.get('q') ?? ''
    const type = params.get('type') ?? ''
    const cls = params.get('cls') ?? ''
    const gen = params.get('gen') ?? ''
    const sortParam = params.get('sort') as SortKey | null
    const sort: SortKey = sortParam && SORT_KEYS.includes(sortParam) ? sortParam : 'name'
    const dir = params.get('dir') === 'desc' || params.get('dir') === 'asc' ? (params.get('dir') as 'asc' | 'desc') : DEFAULT_DIR[sort]

    const update = (patch: Record<string, string | null>) =>
        setParams(
            (prev) => {
                const next = new URLSearchParams(prev)
                for (const [k, v] of Object.entries(patch)) {
                    if (v) next.set(k, v)
                    else next.delete(k)
                }
                return next
            },
            { replace: true },
        )

    const deferredQ = useDeferredValue(q)

    const filtered = useMemo(() => {
        const needle = foldSearch(deferredQ)
        const genNum = gen ? Number(gen) : null
        const list = LIST_MOVES.filter(
            (m) =>
                (!type || m.type === type) &&
                (!cls || m.damageClass === cls) &&
                (genNum == null || m.generation === genNum) &&
                (!needle || SEARCH_INDEX.get(m.name)!.includes(needle)),
        )
        const sign = dir === 'asc' ? 1 : -1
        if (sort === 'name') {
            const c = collator(lang)
            const names = new Map(list.map((m) => [m.name, moveName(m.name, lang)]))
            list.sort((a, b) => sign * c.compare(names.get(a.name)!, names.get(b.name)!))
        } else {
            list.sort((a, b) => {
                const va = numericValue(a, sort)
                const vb = numericValue(b, sort)
                // 값 없음(—)은 방향과 상관없이 맨 뒤
                if (va == null && vb == null) return a.id - b.id
                if (va == null) return 1
                if (vb == null) return -1
                return sign * (va - vb) || a.id - b.id
            })
        }
        return list
    }, [deferredQ, type, cls, gen, sort, dir, lang])

    const resetKey = [deferredQ, type, cls, gen, sort, dir, lang].join('|')
    const { shown, hasMore, more, sentinelRef } = useProgressive(filtered.length, resetKey, 60)
    const hasFilters = !!(q || type || cls || gen)

    return (
        <div>
            <PageHeader title={t('title')} subtitle={t('subtitle', { n: LIST_MOVES.length })} />

            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <SearchField
                    value={q}
                    onChange={(v) => update({ q: v })}
                    label={t('searchLabel')}
                    placeholder={t('searchPlaceholder')}
                />

                <div>
                    <FieldLabel>{t('filterType')}</FieldLabel>
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('filterType')}>
                        <FilterChip active={!type} onClick={() => update({ type: null })}>
                            {tc('all')}
                        </FilterChip>
                        {MOVE_TYPES.map((ty) => (
                            <FilterChip
                                key={ty}
                                active={type === ty}
                                color={TYPE_COLOR[ty]}
                                onClick={() => update({ type: type === ty ? null : ty })}
                            >
                                {typeName(ty, lang)}
                            </FilterChip>
                        ))}
                    </div>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <FieldLabel>{t('filterClass')}</FieldLabel>
                        <Segmented
                            label={t('filterClass')}
                            value={cls || 'all'}
                            onChange={(v) => update({ cls: v === 'all' ? null : v })}
                            options={[
                                { value: 'all', label: tc('all') },
                                ...CLASSES.map((c) => ({ value: c, label: damageClassName(c, lang) })),
                            ]}
                        />
                    </div>
                    <div className="w-32">
                        <SelectField label={t('filterGen')} value={gen} onChange={(v) => update({ gen: v || null })}>
                            <option value="">{tc('all')}</option>
                            {MOVE_GENS.map((g) => (
                                <option key={g} value={g}>
                                    {generationName(g, lang)}
                                </option>
                            ))}
                        </SelectField>
                    </div>
                    <div className="flex items-end gap-1.5">
                        <div className="w-32">
                            <SelectField
                                label={t('sortBy')}
                                value={sort}
                                onChange={(v) => update({ sort: v === 'name' ? null : v, dir: null })}
                            >
                                <option value="name">{t('sortName')}</option>
                                <option value="power">{t('sortPower')}</option>
                                <option value="accuracy">{t('sortAccuracy')}</option>
                                <option value="pp">{t('sortPp')}</option>
                                <option value="id">{t('sortId')}</option>
                            </SelectField>
                        </div>
                        <button
                            type="button"
                            onClick={() => update({ dir: dir === 'asc' ? 'desc' : 'asc' })}
                            aria-label={t('toggleDirection')}
                            title={dir === 'asc' ? t('ascending') : t('descending')}
                            className="flex h-[38px] w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                        >
                            <span aria-hidden>{dir === 'asc' ? '↑' : '↓'}</span>
                        </button>
                    </div>
                    {hasFilters && (
                        <button
                            type="button"
                            onClick={() => update({ q: null, type: null, cls: null, gen: null })}
                            className="ml-auto rounded-full px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50"
                        >
                            {t('resetFilters')}
                        </button>
                    )}
                </div>
            </section>

            <p className="mt-5 mb-2 px-1 text-xs font-semibold text-slate-400" aria-live="polite">
                {tc('results', { n: filtered.length })}
            </p>

            {filtered.length === 0 ? (
                <EmptyState />
            ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div
                        className="hidden grid-cols-[minmax(0,1fr)_6.5rem_5rem_repeat(3,3.5rem)] gap-x-3 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-bold text-slate-400 sm:grid"
                        aria-hidden
                    >
                        <span>{t('colMove')}</span>
                        <span>{t('type')}</span>
                        <span>{t('category')}</span>
                        <span className="text-right">{t('power')}</span>
                        <span className="text-right">{t('accuracy')}</span>
                        <span className="text-right">{t('pp')}</span>
                    </div>
                    <ul aria-label={t('list')} className="divide-y divide-slate-100">
                        {filtered.slice(0, shown).map((m) => (
                            <MoveRow key={m.name} move={m} lang={lang} search={location.search} />
                        ))}
                    </ul>
                </div>
            )}
            <LoadMore hasMore={hasMore} onMore={more} sentinelRef={sentinelRef} />
        </div>
    )
}

function Num({ label, value }: { label: string; value: string }) {
    return (
        <div className="text-right">
            <div className="text-[10px] font-semibold text-slate-400 sm:hidden">{label}</div>
            <div className={`text-sm font-semibold tabular-nums ${value === '—' ? 'text-slate-300' : 'text-slate-700'}`}>{value}</div>
        </div>
    )
}

function MoveRow({ move: m, lang, search }: { move: DexMove; lang: Lang; search: string }) {
    const t = useT(movesMessages)
    const cls = damageClassName(m.damageClass, lang)
    return (
        <li>
            <Link
                to={`/moves/${m.name}${search}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3 py-2.5 transition hover:bg-slate-50 focus:outline-none focus-visible:bg-red-50 sm:grid-cols-[minmax(0,1fr)_6.5rem_5rem_repeat(3,3.5rem)] sm:px-4"
            >
                <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-900">{moveName(m.name, lang)}</div>
                    <div className="mt-1 flex flex-wrap gap-1 sm:hidden">
                        <TypeBadge type={m.type} />
                        <ClassBadge damageClass={m.damageClass} label={cls} />
                    </div>
                </div>
                <div className="hidden sm:block">
                    <TypeBadge type={m.type} />
                </div>
                <div className="hidden sm:block">
                    <ClassBadge damageClass={m.damageClass} label={cls} />
                </div>
                <div className="grid grid-cols-[2.5rem_2.75rem_2rem] gap-x-1.5 sm:contents">
                    <Num label={t('power')} value={fmt(m.power)} />
                    <Num label={t('accuracy')} value={fmt(m.accuracy)} />
                    <Num label={t('pp')} value={fmt(m.pp)} />
                </div>
            </Link>
        </li>
    )
}

// ── 상세 ──

function MoveDetail({ slug }: { slug: string }) {
    const lang = useLang()
    const t = useT(movesMessages)
    const location = useLocation()
    const move = MOVE_BY_NAME.get(slug)
    const valid = move && move.type !== 'shadow' ? move : null
    const name = valid ? moveName(valid.name, lang) : null
    useDocumentTitle(name ? `${name} · ${t('title')}` : t('notFound'))
    const backTo = `/moves${location.search}`

    if (!valid) {
        return (
            <div>
                <BackLink to={backTo}>{t('back')}</BackLink>
                <EmptyState>
                    <p className="text-base font-bold text-slate-700">{t('notFound')}</p>
                    <p className="mt-1">{t('notFoundBody')}</p>
                </EmptyState>
            </div>
        )
    }

    const m = valid
    const color = TYPE_COLOR[m.type] ?? '#94a3b8'
    const desc = cleanDesc(localText(m.desc, lang), lang)
    const others = LANGS.filter((l) => l !== lang)
        .map((l) => ({ l, n: moveName(m.name, l) }))
        .filter((o, i, arr) => o.n !== name && arr.findIndex((x) => x.n === o.n) === i)

    return (
        <div>
            <BackLink to={backTo}>{t('back')}</BackLink>

            <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="h-2" style={{ backgroundColor: color }} />
                <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-2">
                        <TypeBadge type={m.type} size="md" />
                        <ClassBadge damageClass={m.damageClass} label={damageClassName(m.damageClass, lang)} />
                    </div>
                    <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">{name}</h1>
                    {others.length > 0 && (
                        <p className="mt-1 text-sm text-slate-400">
                            <span className="sr-only">{t('otherNames')}: </span>
                            {others.map((o) => (
                                <span key={o.l} lang={o.l} className="mr-3">
                                    {o.n}
                                </span>
                            ))}
                        </p>
                    )}

                    <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                        <StatTile label={t('power')} value={fmt(m.power)} />
                        <StatTile label={t('accuracy')} value={fmt(m.accuracy, '%')} />
                        <StatTile label={t('pp')} value={fmt(m.pp)} />
                        <StatTile label={t('priority')} value={m.priority > 0 ? `+${m.priority}` : String(m.priority)} />
                        <div className="col-span-2 sm:col-span-1">
                            <StatTile
                                label={t('introduced')}
                                value={<span className="text-base">{m.generation ? generationName(m.generation, lang) : '—'}</span>}
                            />
                        </div>
                    </dl>

                    <section className="mt-5">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('description')}</h2>
                        <p className="mt-1.5 text-[15px] leading-relaxed text-slate-700">{desc ?? t('noDescription')}</p>
                    </section>
                </div>
            </article>

            <Learners key={m.name} slug={m.name} />
        </div>
    )
}

function Learners({ slug }: { slug: string }) {
    const t = useT(movesMessages)
    const [withForms, setWithForms] = useState(false)

    const all = useMemo(
        () => [...pokemonWithMove(slug)].sort((a, b) => getSpeciesId(a) - getSpeciesId(b) || a.id - b.id),
        [slug],
    )
    const base = useMemo(() => all.filter((p) => !isAlternateForm(p)), [all])
    const hasForms = base.length !== all.length
    const list = withForms || base.length === 0 ? all : base
    const { shown, hasMore, more, sentinelRef } = useProgressive(list.length, `${slug}|${withForms}`, 96)

    return (
        <section className="mt-6" aria-labelledby="learners-heading">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 id="learners-heading" className="text-lg font-bold text-slate-900">
                    {t('learners')} <span className="text-sm font-semibold text-slate-400">{t('learnersCount', { n: list.length })}</span>
                </h2>
                {hasForms && base.length > 0 && (
                    <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-500">
                        <input
                            type="checkbox"
                            checked={withForms}
                            onChange={(e) => setWithForms(e.target.checked)}
                            className="h-4 w-4 accent-red-500"
                        />
                        {t('includeForms')}
                    </label>
                )}
            </div>
            {list.length === 0 ? (
                <EmptyState>{t('noLearners')}</EmptyState>
            ) : (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {list.slice(0, shown).map((p) => (
                        <li key={p.id}>
                            <PokemonChip pokemon={p} />
                        </li>
                    ))}
                </ul>
            )}
            <LoadMore hasMore={hasMore} onMore={more} sentinelRef={sentinelRef} />
        </section>
    )
}
