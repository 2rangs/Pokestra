import { useDeferredValue, useMemo, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import {
    BackLink,
    EmptyState,
    LoadMore,
    PageHeader,
    PokemonChip,
    SearchField,
    SelectField,
    StatTile,
} from '../components/dex/DexUi'
import { buildSearchKey, cleanDesc, foldSearch } from '../components/dex/text'
import { useProgressive } from '../components/dex/useProgressive'
import { collator, LANGS, useDocumentTitle, useLang, useT, type Lang } from '../i18n'
import { abilitiesMessages } from '../i18n/messages/abilities'
import { commonMessages } from '../i18n/messages/common'
import {
    ABILITIES,
    ABILITY_BY_NAME,
    abilityName,
    type DexAbility,
    type DexPokemon,
    generationName,
    getSpeciesId,
    isAlternateForm,
    localText,
    pokemonWithAbility,
} from '../lib/dex'

// ── 데이터 ──

const LIST_ABILITIES: readonly DexAbility[] = ABILITIES
const NAME_INDEX = new Map(LIST_ABILITIES.map((a) => [a.name, buildSearchKey(a.name, a.nameKo, a.nameEn, a.nameJa)]))
const ABILITY_GENS = [...new Set(LIST_ABILITIES.map((a) => a.generation).filter((g): g is number => g != null))].sort((a, b) => a - b)

export default function AbilitiesPage() {
    const { slug } = useParams()
    return slug ? <AbilityDetail slug={slug} /> : <AbilityList />
}

// ── 목록 ──

function AbilityList() {
    const lang = useLang()
    const t = useT(abilitiesMessages)
    const tc = useT(commonMessages)
    const location = useLocation()
    const [params, setParams] = useSearchParams()
    useDocumentTitle(t('title'))

    const q = params.get('q') ?? ''
    const gen = params.get('gen') ?? ''
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
        const c = collator(lang)
        const list = LIST_ABILITIES.filter((a) => {
            if (genNum != null && a.generation !== genNum) return false
            if (!needle) return true
            if (NAME_INDEX.get(a.name)!.includes(needle)) return true
            // 현재 언어 설명으로도 검색
            const d = localText(a.desc, lang)
            return !!d && foldSearch(d).includes(needle)
        })
        const names = new Map(list.map((a) => [a.name, abilityName(a.name, lang)]))
        // 이름이 먼저 맞은 결과를 앞에
        return list.sort((a, b) => {
            if (needle) {
                const na = NAME_INDEX.get(a.name)!.includes(needle) ? 0 : 1
                const nb = NAME_INDEX.get(b.name)!.includes(needle) ? 0 : 1
                if (na !== nb) return na - nb
            }
            return c.compare(names.get(a.name)!, names.get(b.name)!)
        })
    }, [deferredQ, gen, lang])

    const { shown, hasMore, more, sentinelRef } = useProgressive(filtered.length, `${deferredQ}|${gen}|${lang}`, 80)

    return (
        <div>
            <PageHeader title={t('title')} subtitle={t('subtitle', { n: LIST_ABILITIES.length })} />

            <section className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                    <SearchField
                        value={q}
                        onChange={(v) => update({ q: v })}
                        label={t('searchLabel')}
                        placeholder={t('searchPlaceholder')}
                    />
                </div>
                <div className="sm:w-40">
                    <SelectField label={t('filterGen')} value={gen} onChange={(v) => update({ gen: v || null })}>
                        <option value="">{tc('all')}</option>
                        {ABILITY_GENS.map((g) => (
                            <option key={g} value={g}>
                                {generationName(g, lang)}
                            </option>
                        ))}
                    </SelectField>
                </div>
            </section>

            <p className="mt-5 mb-2 px-1 text-xs font-semibold text-slate-400" aria-live="polite">
                {tc('results', { n: filtered.length })}
            </p>

            {filtered.length === 0 ? (
                <EmptyState />
            ) : (
                <ul aria-label={t('list')} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {filtered.slice(0, shown).map((a) => (
                        <AbilityRow key={a.name} ability={a} lang={lang} search={location.search} />
                    ))}
                </ul>
            )}
            <LoadMore hasMore={hasMore} onMore={more} sentinelRef={sentinelRef} />
        </div>
    )
}

function AbilityRow({ ability: a, lang, search }: { ability: DexAbility; lang: Lang; search: string }) {
    const t = useT(abilitiesMessages)
    const desc = cleanDesc(localText(a.desc, lang), lang)
    const count = pokemonWithAbility(a.name).length
    return (
        <li>
            <Link
                to={`/abilities/${a.name}${search}`}
                className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
                <div className="flex items-start justify-between gap-2">
                    <h2 className="min-w-0 truncate text-base font-bold text-slate-900 group-hover:text-red-500">
                        {abilityName(a.name, lang)}
                    </h2>
                    {a.generation != null && (
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                            {generationName(a.generation, lang)}
                        </span>
                    )}
                </div>
                <p className="mt-1 line-clamp-2 text-sm leading-snug text-slate-500">{desc ?? t('noDescription')}</p>
                <p className="mt-auto pt-2 text-[11px] font-semibold text-slate-400">{t('pokemonCount', { n: count })}</p>
            </Link>
        </li>
    )
}

// ── 상세 ──

interface Holder {
    p: DexPokemon
    hidden: boolean
}

function AbilityDetail({ slug }: { slug: string }) {
    const lang = useLang()
    const t = useT(abilitiesMessages)
    const location = useLocation()
    const ability = ABILITY_BY_NAME.get(slug)
    const name = ability ? abilityName(ability.name, lang) : null
    useDocumentTitle(name ? `${name} · ${t('title')}` : t('notFound'))
    const backTo = `/abilities${location.search}`

    if (!ability) {
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

    const a = ability
    const desc = cleanDesc(localText(a.desc, lang), lang)
    const others = LANGS.filter((l) => l !== lang)
        .map((l) => ({ l, n: abilityName(a.name, l) }))
        .filter((o, i, arr) => o.n !== name && arr.findIndex((x) => x.n === o.n) === i)

    return (
        <div>
            <BackLink to={backTo}>{t('back')}</BackLink>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{name}</h1>
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
                <section className="mt-4">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('description')}</h2>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-slate-700">{desc ?? t('noDescription')}</p>
                </section>
                {a.generation != null && (
                    <dl className="mt-5 grid max-w-xs grid-cols-1">
                        <StatTile label={t('introduced')} value={<span className="text-base">{generationName(a.generation, lang)}</span>} />
                    </dl>
                )}
            </article>

            <Holders key={a.name} slug={a.name} />
        </div>
    )
}

function Holders({ slug }: { slug: string }) {
    const t = useT(abilitiesMessages)
    const [withForms, setWithForms] = useState(false)

    const all = useMemo<Holder[]>(
        () =>
            pokemonWithAbility(slug)
                .map((p) => ({ p, hidden: !!p.abilities.find((x) => x.name === slug && x.hidden) && !p.abilities.some((x) => x.name === slug && !x.hidden) }))
                .sort((x, y) => getSpeciesId(x.p) - getSpeciesId(y.p) || x.p.id - y.p.id),
        [slug],
    )
    const base = useMemo(() => all.filter((h) => !isAlternateForm(h.p)), [all])
    const hasForms = base.length !== all.length
    const list = withForms || base.length === 0 ? all : base
    const standard = list.filter((h) => !h.hidden)
    const hidden = list.filter((h) => h.hidden)

    return (
        <section className="mt-6" aria-labelledby="holders-heading">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 id="holders-heading" className="text-lg font-bold text-slate-900">
                        {t('holders')}{' '}
                        <span className="text-sm font-semibold text-slate-400">{t('holdersCount', { n: list.length })}</span>
                    </h2>
                    {list.length > 0 && (
                        <p className="text-xs text-slate-400">{t('holdersSummary', { normal: standard.length, hidden: hidden.length })}</p>
                    )}
                </div>
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
                <EmptyState>{t('noHolders')}</EmptyState>
            ) : (
                <div className="space-y-5">
                    <HolderGroup title={t('standard')} items={standard} resetKey={`${slug}|${withForms}|s`} />
                    <HolderGroup title={t('hidden')} items={hidden} resetKey={`${slug}|${withForms}|h`} hidden />
                </div>
            )}
        </section>
    )
}

function HolderGroup({ title, items, resetKey, hidden }: { title: string; items: Holder[]; resetKey: string; hidden?: boolean }) {
    const t = useT(abilitiesMessages)
    const { shown, hasMore, more, sentinelRef } = useProgressive(items.length, resetKey, 96)
    if (items.length === 0) return null
    return (
        <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-600">
                {hidden && <span className="h-2 w-2 rounded-full bg-violet-500" aria-hidden />}
                {title}
                <span className="font-semibold text-slate-400">{items.length}</span>
            </h3>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {items.slice(0, shown).map((h) => (
                    <li key={h.p.id}>
                        <PokemonChip
                            pokemon={h.p}
                            badge={
                                h.hidden ? (
                                    <span className="rounded bg-violet-100 px-1 font-bold text-violet-700">{t('hiddenShort')}</span>
                                ) : undefined
                            }
                        />
                    </li>
                ))}
            </ul>
            <LoadMore hasMore={hasMore} onMore={more} sentinelRef={sentinelRef} />
        </div>
    )
}
