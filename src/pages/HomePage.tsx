import { useId, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { TypeBadge } from '../components/dex/DexUi'
import { artworkUrl, buildSearchKey, foldSearch, padDexNo } from '../components/dex/text'
import { formatNumber, useDocumentTitle, useLang, useT } from '../i18n'
import { homeMessages } from '../i18n/messages/home'
import {
    ABILITIES,
    ALL_POKEMON,
    baseStatTotal,
    type DexPokemon,
    displayName,
    GENERATIONS,
    getSpeciesId,
    isAlternateForm,
    MOVES,
    TYPES,
} from '../lib/dex'
import { usePokedexStore } from '../stores/pokedexStore'

type HomeKey = keyof typeof homeMessages.ko

const FEATURES: { to: string; title: HomeKey; desc: HomeKey; emoji: string; tone: string }[] = [
    { to: '/pokedex', title: 'featPokedexTitle', desc: 'featPokedexDesc', emoji: '📖', tone: 'from-red-50' },
    { to: '/battle', title: 'featBattleTitle', desc: 'featBattleDesc', emoji: '⚔️', tone: 'from-sky-50' },
    { to: '/calc', title: 'featCalcTitle', desc: 'featCalcDesc', emoji: '🧮', tone: 'from-amber-50' },
    { to: '/moves', title: 'featMovesTitle', desc: 'featMovesDesc', emoji: '💥', tone: 'from-orange-50' },
    { to: '/abilities', title: 'featAbilitiesTitle', desc: 'featAbilitiesDesc', emoji: '✨', tone: 'from-violet-50' },
    { to: '/sprites', title: 'featSpritesTitle', desc: 'featSpritesDesc', emoji: '🖼️', tone: 'from-emerald-50' },
]

// ── 데이터 ──

interface Indexed {
    p: DexPokemon
    speciesId: number
    form: boolean
    key: string
}

const INDEX: readonly Indexed[] = ALL_POKEMON.map((p) => ({
    p,
    speciesId: getSpeciesId(p),
    form: isAlternateForm(p),
    key: buildSearchKey(p.name, p.nameKo, p.nameEn, p.nameJa),
}))

const SPECIES = ALL_POKEMON.filter((p) => !isAlternateForm(p))
const POTD_POOL = SPECIES.filter((p) => p.sprite)

const STATS = {
    species: SPECIES.length,
    forms: ALL_POKEMON.length - SPECIES.length,
    moves: MOVES.filter((m) => m.type !== 'shadow').length,
    abilities: ABILITIES.length,
    types: TYPES.length,
    gens: GENERATIONS.length,
}

const MAX_SUGGESTIONS = 6

function findPokemon(query: string): DexPokemon[] {
    const raw = query.trim().replace(/^#/, '')
    if (!raw) return []
    if (/^\d+$/.test(raw)) {
        const n = Number(raw)
        return INDEX.filter((e) => e.speciesId === n)
            .sort((a, b) => Number(a.form) - Number(b.form))
            .slice(0, MAX_SUGGESTIONS)
            .map((e) => e.p)
    }
    const needle = foldSearch(raw)
    if (!needle) return []
    const scored: { e: Indexed; score: number }[] = []
    for (const e of INDEX) {
        const names = e.key.split('\u0000')
        let score = -1
        if (names.some((n) => n === needle)) score = 0
        else if (names.some((n) => n.startsWith(needle))) score = 1
        else if (e.key.includes(needle)) score = 2
        if (score >= 0) scored.push({ e, score: score * 2 + Number(e.form) })
    }
    return scored
        .sort((a, b) => a.score - b.score || a.e.speciesId - b.e.speciesId || a.e.p.id - b.e.p.id)
        .slice(0, MAX_SUGGESTIONS)
        .map((x) => x.e.p)
}

/** 오늘 날짜(로컬) → 결정적인 포켓몬 */
function todayKey(): string {
    const d = new Date()
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function pokemonOfDay(key: string): DexPokemon {
    // FNV-1a
    let h = 0x811c9dc5
    for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i)
        h = Math.imul(h, 0x01000193)
    }
    return POTD_POOL[(h >>> 0) % POTD_POOL.length]
}

// ── 페이지 ──

export default function HomePage() {
    const lang = useLang()
    const t = useT(homeMessages)
    useDocumentTitle(null)

    return (
        <div className="space-y-12">
            <Hero />

            <section aria-labelledby="explore-heading">
                <h2 id="explore-heading" className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
                    {t('sectionExplore')}
                </h2>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
                    {FEATURES.map((f) => (
                        <Link
                            key={f.to}
                            to={f.to}
                            className={`group rounded-3xl border border-slate-200 bg-gradient-to-b ${f.tone} to-white p-4 transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 sm:p-5`}
                        >
                            <span className="text-2xl sm:text-3xl" aria-hidden>
                                {f.emoji}
                            </span>
                            <h3 className="mt-2 text-sm font-bold text-slate-900 group-hover:text-red-500 sm:mt-3 sm:text-lg">{t(f.title)}</h3>
                            <p className="mt-1 text-xs leading-snug text-slate-500 sm:text-sm">{t(f.desc)}</p>
                        </Link>
                    ))}
                </div>
            </section>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                <div className="md:col-span-2">
                    <PokemonOfTheDay />
                </div>
                <section aria-labelledby="stats-heading" className="md:col-span-3">
                    <h2 id="stats-heading" className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
                        {t('statsHeading')}
                    </h2>
                    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                        {(
                            [
                                ['statsSpecies', STATS.species, '/pokedex'],
                                ['statsForms', STATS.forms, '/sprites?forms=1'],
                                ['statsMoves', STATS.moves, '/moves'],
                                ['statsAbilities', STATS.abilities, '/abilities'],
                                ['statsTypes', STATS.types, '/moves'],
                                ['statsGens', STATS.gens, '/pokedex'],
                            ] as const
                        ).map(([label, n, to]) => (
                            <li key={label}>
                                <Link
                                    to={to}
                                    className="block h-full rounded-2xl border border-slate-200 bg-white px-4 py-4 transition hover:border-slate-300 hover:shadow-sm"
                                >
                                    <span className="block text-2xl font-extrabold tabular-nums text-slate-900 sm:text-3xl">{formatNumber(n, lang)}</span>
                                    <span className="mt-0.5 block text-xs font-semibold text-slate-500">{t(label)}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </div>
    )
}

function Hero() {
    const lang = useLang()
    const t = useT(homeMessages)
    const navigate = useNavigate()
    const setNameSearch = usePokedexStore((s) => s.setNameSearch)
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const [active, setActive] = useState(0)
    const inputId = useId()
    const listId = useId()

    const suggestions = useMemo(() => findPokemon(query), [query])
    const trimmed = query.trim()
    // 마지막 항목: 도감에서 검색
    const optionCount = trimmed ? suggestions.length + 1 : 0
    const showList = open && optionCount > 0

    const goPokedex = () => {
        setNameSearch(trimmed)
        navigate('/pokedex')
    }
    const choose = (i: number) => {
        if (i < suggestions.length) navigate(`/pokemon/${suggestions[i].id}`)
        else goPokedex()
    }

    return (
        <section className="relative z-10 rounded-[2rem] border border-slate-200 bg-gradient-to-br from-red-50 via-white to-sky-50 px-5 pt-10 pb-8 text-center sm:px-10 sm:pt-14 sm:pb-12">
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]">
                <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full border-[28px] border-red-500/10" />
                <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full border-[28px] border-sky-500/10" />
            </div>
            <p className="relative text-xs font-bold uppercase tracking-widest text-red-500">{t('heroEyebrow')}</p>
            <h1 className="relative mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                {t('heroTitle')} <span className="text-red-500">Pokestra</span>
            </h1>
            <p className="relative mx-auto mt-3 max-w-xl text-sm text-slate-500 sm:text-base">
                {t('heroSubtitle', { species: STATS.species, forms: STATS.forms, moves: STATS.moves })}
            </p>

            <form
                role="search"
                className="relative mx-auto mt-6 max-w-lg text-left"
                onSubmit={(e) => {
                    e.preventDefault()
                    if (!trimmed) return
                    choose(showList ? Math.min(active, optionCount - 1) : 0)
                }}
            >
                <label htmlFor={inputId} className="sr-only">
                    {t('searchLabel')}
                </label>
                <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-200/60 focus-within:border-red-300 focus-within:ring-4 focus-within:ring-red-100">
                    <input
                        id={inputId}
                        type="text"
                        value={query}
                        placeholder={t('searchPlaceholder')}
                        autoComplete="off"
                        role="combobox"
                        aria-expanded={showList}
                        aria-controls={listId}
                        aria-autocomplete="list"
                        aria-activedescendant={showList ? `${listId}-${active}` : undefined}
                        onChange={(e) => {
                            setQuery(e.target.value)
                            setActive(0)
                            setOpen(true)
                        }}
                        onFocus={() => setOpen(true)}
                        onBlur={() => setOpen(false)}
                        onKeyDown={(e) => {
                            if (!showList) return
                            if (e.key === 'ArrowDown') {
                                e.preventDefault()
                                setActive((i) => (i + 1) % optionCount)
                            } else if (e.key === 'ArrowUp') {
                                e.preventDefault()
                                setActive((i) => (i - 1 + optionCount) % optionCount)
                            } else if (e.key === 'Escape') {
                                setOpen(false)
                            }
                        }}
                        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                    <button
                        type="submit"
                        className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-500"
                    >
                        {t('searchSubmit')}
                    </button>
                </div>

                {showList && (
                    <ul
                        id={listId}
                        role="listbox"
                        aria-label={t('searchLabel')}
                        className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-xl"
                    >
                        {suggestions.map((p, i) => (
                            <li
                                key={p.id}
                                id={`${listId}-${i}`}
                                role="option"
                                aria-selected={active === i}
                                onMouseDown={(e) => {
                                    e.preventDefault()
                                    choose(i)
                                }}
                                onMouseEnter={() => setActive(i)}
                                className={`flex cursor-pointer items-center gap-3 px-3 py-1.5 ${active === i ? 'bg-red-50' : ''}`}
                            >
                                {p.sprite ? (
                                    <img src={p.sprite} alt="" width={40} height={40} className="h-10 w-10 shrink-0 object-contain [image-rendering:pixelated]" />
                                ) : (
                                    <span className="h-10 w-10 shrink-0" />
                                )}
                                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{displayName(p, lang)}</span>
                                <span className="shrink-0 text-xs tabular-nums text-slate-400">{padDexNo(getSpeciesId(p))}</span>
                            </li>
                        ))}
                        <li
                            id={`${listId}-${suggestions.length}`}
                            role="option"
                            aria-selected={active === suggestions.length}
                            onMouseDown={(e) => {
                                e.preventDefault()
                                goPokedex()
                            }}
                            onMouseEnter={() => setActive(suggestions.length)}
                            className={`flex cursor-pointer items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-sm font-semibold text-red-500 ${active === suggestions.length ? 'bg-red-50' : ''}`}
                        >
                            <span aria-hidden>🔍</span>
                            <span className="truncate">{t('searchAll', { q: trimmed })}</span>
                        </li>
                    </ul>
                )}
            </form>
        </section>
    )
}

function PokemonOfTheDay() {
    const lang = useLang()
    const t = useT(homeMessages)
    const [key] = useState(todayKey)
    const p = useMemo(() => pokemonOfDay(key), [key])
    const [failed, setFailed] = useState(false)
    const name = displayName(p, lang)

    return (
        <section aria-labelledby="potd-heading" className="h-full">
            <h2 id="potd-heading" className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
                {t('potdTitle')}
            </h2>
            <Link
                to={`/pokemon/${p.id}`}
                className="group relative flex items-center gap-4 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 md:flex-col md:text-center"
            >
                <div className="relative flex h-28 w-28 shrink-0 items-center justify-center md:h-40 md:w-40">
                    <span aria-hidden className="absolute inset-2 rounded-full bg-red-100/60" />
                    <img
                        src={failed ? (p.sprite ?? '') : artworkUrl(p.id)}
                        alt={name}
                        loading="lazy"
                        onError={() => setFailed(true)}
                        className="relative h-full w-full object-contain drop-shadow-md transition-transform group-hover:scale-105"
                    />
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-semibold tabular-nums text-slate-400">{padDexNo(getSpeciesId(p))}</p>
                    <p className="truncate text-xl font-extrabold text-slate-900 group-hover:text-red-500">{name}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1 md:justify-center">
                        {p.types.map((ty) => (
                            <TypeBadge key={ty} type={ty} />
                        ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                        {t('potdTotal')} <span className="font-bold tabular-nums text-slate-800">{baseStatTotal(p)}</span>
                    </p>
                    <p className="mt-2 text-xs font-bold text-red-500">
                        {t('potdCta')} <span aria-hidden>→</span>
                    </p>
                </div>
            </Link>
        </section>
    )
}
