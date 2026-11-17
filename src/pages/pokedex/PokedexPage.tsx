import { type ReactNode, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { PokemonCard } from "../../components/PokemonCard.tsx"
import { type Lang, collator, useDocumentTitle, useLang, useT } from "../../i18n"
import { commonMessages } from "../../i18n/messages/common"
import { type PokedexKey, pokedexMessages } from "../../i18n/messages/pokedex"
import {
    ALL_POKEMON,
    GENERATIONS,
    MOVES,
    MOVE_BY_NAME,
    TYPES,
    type DexMove,
    type DexPokemon,
    type StatKey,
    baseStatTotal,
    damageClassName,
    displayName,
    generationName,
    getGeneration,
    getSpeciesId,
    isAlternateForm,
    moveName,
    searchKey,
    statLabel,
    typeName,
} from "../../lib/dex"
import { MAX_SELECTED_TYPES, type PokedexSortKey, usePokedexStore } from "../../stores/pokedexStore"

const PAGE_SIZE = 60
const MAX_MOVE_SUGGESTIONS = 8

/** 정렬 옵션 (라벨: 메시지 키 또는 스탯) */
const SORT_OPTIONS: { value: PokedexSortKey; label: PokedexKey | StatKey }[] = [
    { value: "id", label: "sortId" },
    { value: "name", label: "sortName" },
    { value: "total", label: "sortTotal" },
    { value: "hp", label: "hp" },
    { value: "attack", label: "attack" },
    { value: "defense", label: "defense" },
    { value: "spAtk", label: "spAtk" },
    { value: "spDef", label: "spDef" },
    { value: "speed", label: "speed" },
]

// ── 검색 정규화 ──

/** 히라가나 → 가타카나 (ぴかちゅう ≒ ピカチュウ) */
function toKatakana(s: string): string {
    return s.replace(/[ぁ-ゖ]/g,(c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
}

/** 소문자 + 공백/구분자 제거 + 가타카나 통일 (모든 언어 공통) */
function norm(s: string): string {
    return toKatakana(s.normalize("NFKC").toLowerCase()).replace(/[\s\-_.'’:・]+/g, "")
}

// ── 검색 인덱스 (모듈 로드 시 1회) ──

interface IndexedPokemon {
    p: DexPokemon
    /** 모든 언어 이름 + slug 를 정규화한 문자열 */
    key: string
    speciesId: number
    generation: number
    total: number
    isForm: boolean
}

const INDEX: IndexedPokemon[] = ALL_POKEMON.map((p) => ({
    p,
    key: searchKey(p)
        .split(" ")
        .map(norm)
        .join(" "),
    speciesId: getSpeciesId(p),
    generation: getGeneration(p),
    total: baseStatTotal(p),
    isForm: isAlternateForm(p),
}))

function matchesName(e: IndexedPokemon, rawQuery: string): boolean {
    const q = rawQuery.trim()
    if (!q) return true
    const num = q.replace(/^(#|no\.?)\s*/i, "")
    if (/^\d+$/.test(num)) return e.speciesId === Number(num)
    const n = norm(q)
    return n === "" || e.key.includes(n)
}

/** 기술 검색 키: slug / 영어 / 한국어 / 일본어 */
const MOVE_INDEX: { m: DexMove; keys: string[] }[] = MOVES.map((m) => ({
    m,
    keys: [m.name, m.nameEn, m.hasKoreanName ? m.nameKo : null, m.nameJa].filter((x): x is string => !!x).map(norm),
}))

function findMoveSuggestions(query: string): DexMove[] {
    const q = norm(query)
    if (!q) return []
    const starts: DexMove[] = []
    const contains: DexMove[] = []
    for (const { m, keys } of MOVE_INDEX) {
        if (keys.some((k) => k.startsWith(q))) starts.push(m)
        else if (contains.length < MAX_MOVE_SUGGESTIONS && keys.some((k) => k.includes(q))) contains.push(m)
        if (starts.length >= MAX_MOVE_SUGGESTIONS) break
    }
    return [...starts, ...contains].slice(0, MAX_MOVE_SUGGESTIONS)
}

/** 입력이 (어느 언어로든) 기술 이름과 정확히 일치하면 그 기술 slug */
function exactMove(query: string): string | null {
    const q = norm(query)
    if (!q) return null
    return MOVE_INDEX.find(({ keys }) => keys.includes(q))?.m.name ?? null
}

function sortValue(e: IndexedPokemon, key: PokedexSortKey): number {
    if (key === "id") return e.speciesId
    if (key === "total") return e.total
    if (key === "name") return 0
    return e.p.stats[key]
}

const STAT_KEY_SET: ReadonlySet<string> = new Set<StatKey>(["hp", "attack", "defense", "spAtk", "spDef", "speed"])

function sortLabel(label: PokedexKey | StatKey, lang: Lang, t: (k: PokedexKey) => string): string {
    return STAT_KEY_SET.has(label) ? statLabel(label as StatKey, lang) : t(label as PokedexKey)
}

// ── UI 조각 ──

function Chip({
    active,
    onClick,
    children,
    className = "",
}: {
    active: boolean
    onClick: () => void
    children: ReactNode
    className?: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={[
                "rounded-full border px-2.5 py-1 text-xs font-semibold transition",
                active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
                className,
            ].join(" ")}
        >
            {children}
        </button>
    )
}

function SectionLabel({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
    return (
        <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">{children}</span>
            {aside}
        </div>
    )
}

function MoveFilter() {
    const lang = useLang()
    const t = useT(pokedexMessages)
    const tc = useT(commonMessages)
    const moveSearch = usePokedexStore((s) => s.moveSearch)
    const selectedMove = usePokedexStore((s) => s.selectedMove)
    const setMoveSearch = usePokedexStore((s) => s.setMoveSearch)
    const setSelectedMove = usePokedexStore((s) => s.setSelectedMove)
    const [open, setOpen] = useState(false)
    const [active, setActive] = useState(0)

    // 선택된 기술은 현재 언어 이름으로 보여 준다 (언어를 바꿔도 따라감)
    const inputValue = selectedMove ? moveName(selectedMove, lang) : moveSearch
    const suggestions = useMemo(
        () => (selectedMove ? [] : findMoveSuggestions(moveSearch)),
        [moveSearch, selectedMove],
    )
    const resolved = selectedMove ?? exactMove(moveSearch)
    const resolvedMove = resolved ? MOVE_BY_NAME.get(resolved) : undefined
    const showDropdown = open && suggestions.length > 0
    const listId = "move-filter-listbox"

    const pick = (m: DexMove) => {
        setSelectedMove(m.name)
        setOpen(false)
    }

    return (
        <div className="relative">
            <div className="relative">
                <input
                    type="text"
                    inputMode="search"
                    autoComplete="off"
                    value={inputValue}
                    placeholder={t("movePlaceholder")}
                    aria-label={t("moveLabel")}
                    onChange={(e) => {
                        setMoveSearch(e.target.value)
                        setActive(0)
                        setOpen(true)
                    }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setOpen(false)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") {
                            if (showDropdown) setOpen(false)
                            else if (inputValue) setMoveSearch("")
                            return
                        }
                        if (!showDropdown) return
                        if (e.key === "ArrowDown") {
                            e.preventDefault()
                            setActive((i) => (i + 1) % suggestions.length)
                        } else if (e.key === "ArrowUp") {
                            e.preventDefault()
                            setActive((i) => (i - 1 + suggestions.length) % suggestions.length)
                        } else if (e.key === "Enter") {
                            e.preventDefault()
                            pick(suggestions[Math.min(active, suggestions.length - 1)])
                        }
                    }}
                    role="combobox"
                    aria-expanded={showDropdown}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={showDropdown ? `${listId}-${active}` : undefined}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
                />
                {inputValue && (
                    <button
                        type="button"
                        onClick={() => setMoveSearch("")}
                        aria-label={t("clearMove")}
                        title={tc("clear")}
                        className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                            <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
                        </svg>
                    </button>
                )}
            </div>
            <div aria-live="polite">
                {resolvedMove && (
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className={`${resolvedMove.type} h-2 w-2 shrink-0 rounded-full`} aria-hidden />
                        <span>{t("moveActive", { move: moveName(resolvedMove.name, lang) })}</span>
                    </p>
                )}
                {!resolvedMove && moveSearch.trim() && !showDropdown && (
                    <p className="mt-1 text-[11px] text-slate-400">
                        {suggestions.length === 0 ? t("moveNoMatch") : t("movePick")}
                    </p>
                )}
            </div>
            {showDropdown && (
                <ul
                    id={listId}
                    role="listbox"
                    aria-label={t("learnableMove")}
                    className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                >
                    {suggestions.map((m, i) => {
                        const sub = lang === "en" ? null : m.nameEn
                        return (
                            <li
                                key={m.name}
                                id={`${listId}-${i}`}
                                role="option"
                                aria-selected={i === active}
                                onMouseDown={(e) => e.preventDefault()}
                                onMouseEnter={() => setActive(i)}
                                onClick={() => pick(m)}
                                className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm ${i === active ? "bg-slate-100" : ""}`}
                            >
                                <span className={`${m.type} h-2.5 w-2.5 shrink-0 rounded-full`} title={typeName(m.type, lang)} aria-hidden />
                                <span className="shrink-0 font-semibold text-slate-800">{moveName(m.name, lang)}</span>
                                {sub && (
                                    <span className="truncate text-xs text-slate-400" lang="en">
                                        {sub}
                                    </span>
                                )}
                                <span className="ml-auto shrink-0 text-[10px] text-slate-400">{damageClassName(m.damageClass, lang)}</span>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}

function ClearButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
    return (
        <button type="button" onClick={onClick} className="rounded px-1 text-[11px] font-semibold text-slate-400 hover:text-red-500">
            {children}
        </button>
    )
}

// ── Page ──

export default function PokedexPage() {
    const lang = useLang()
    const t = useT(pokedexMessages)
    useDocumentTitle(t("title"))

    const nameSearch = usePokedexStore((s) => s.nameSearch)
    const moveSearch = usePokedexStore((s) => s.moveSearch)
    const selectedMove = usePokedexStore((s) => s.selectedMove)
    const selectedTypes = usePokedexStore((s) => s.selectedTypes)
    const selectedGenerations = usePokedexStore((s) => s.selectedGenerations)
    const includeForms = usePokedexStore((s) => s.includeForms)
    const sortKey = usePokedexStore((s) => s.sortKey)
    const sortDir = usePokedexStore((s) => s.sortDir)
    const page = usePokedexStore((s) => s.page)

    const setNameSearch = usePokedexStore((s) => s.setNameSearch)
    const toggleType = usePokedexStore((s) => s.toggleType)
    const clearTypes = usePokedexStore((s) => s.clearTypes)
    const toggleGeneration = usePokedexStore((s) => s.toggleGeneration)
    const clearGenerations = usePokedexStore((s) => s.clearGenerations)
    const setIncludeForms = usePokedexStore((s) => s.setIncludeForms)
    const setSortKey = usePokedexStore((s) => s.setSortKey)
    const setSortDir = usePokedexStore((s) => s.setSortDir)
    const setPage = usePokedexStore((s) => s.setPage)
    const resetFilters = usePokedexStore((s) => s.resetFilters)

    const [filtersOpen, setFiltersOpen] = useState(false)

    const deferredName = useDeferredValue(nameSearch)
    const moveSlug = selectedMove ?? exactMove(moveSearch)

    // 이름순 정렬용: 현재 언어의 표시 이름
    const names = useMemo(() => new Map(INDEX.map((e) => [e.p.id, displayName(e.p, lang)])), [lang])

    const results = useMemo(() => {
        const gens = new Set(selectedGenerations)
        const filtered = INDEX.filter(
            (e) =>
                (includeForms || !e.isForm) &&
                (gens.size === 0 || gens.has(e.generation)) &&
                selectedTypes.every((type) => e.p.types.includes(type)) &&
                (!moveSlug || e.p.moves.includes(moveSlug)) &&
                matchesName(e, deferredName),
        )
        const dir = sortDir === "asc" ? 1 : -1
        const coll = collator(lang)
        filtered.sort((a, b) => {
            const primary =
                sortKey === "name"
                    ? coll.compare(names.get(a.p.id) ?? "", names.get(b.p.id) ?? "")
                    : sortValue(a, sortKey) - sortValue(b, sortKey)
            if (primary !== 0) return primary * dir
            // 동률이면 도감번호 → id 오름차순
            return a.speciesId - b.speciesId || a.p.id - b.p.id
        })
        return filtered
    }, [selectedGenerations, includeForms, selectedTypes, moveSlug, deferredName, sortKey, sortDir, lang, names])

    const visibleCount = Math.min(results.length, page * PAGE_SIZE)
    const visible = results.slice(0, visibleCount)
    const hasMore = visibleCount < results.length
    const isSearching = deferredName !== nameSearch

    // 무한 스크롤: 하단 센티넬이 보이면 다음 페이지
    const sentinelRef = useRef<HTMLDivElement | null>(null)
    useEffect(() => {
        const el = sentinelRef.current
        if (!el || !hasMore) return
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) setPage(page + 1)
            },
            { rootMargin: "600px 0px" },
        )
        io.observe(el)
        return () => io.disconnect()
    }, [hasMore, page, setPage])

    const highlightStat: StatKey | null =
        sortKey === "id" || sortKey === "name" || sortKey === "total" ? null : sortKey

    const activeFilterCount =
        selectedTypes.length + selectedGenerations.length + (moveSlug ? 1 : 0) + (includeForms ? 1 : 0)
    const isDirty =
        activeFilterCount > 0 || nameSearch.trim() !== "" || moveSearch !== "" || selectedMove != null || sortKey !== "id" || sortDir !== "asc"

    const reset = () => {
        resetFilters()
        setFiltersOpen(false)
    }

    return (
        <div className="space-y-4">
            <div className="flex items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{t("title")}</h1>
                    <p className="mt-0.5 text-sm text-slate-500">{t("subtitle")}</p>
                </div>
            </div>

            {/* ── 검색/필터 패널 ── */}
            <section aria-label={t("filters")} className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
                <div className="flex gap-2">
                    <div className="relative min-w-0 flex-1">
                        <svg viewBox="0 0 20 20" fill="none" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden>
                            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
                            <path d="m14 14 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <input
                            type="search"
                            value={nameSearch}
                            onChange={(e) => setNameSearch(e.target.value)}
                            placeholder={t("searchPlaceholder")}
                            aria-label={t("searchLabel")}
                            enterKeyHint="search"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => setFiltersOpen((v) => !v)}
                        aria-expanded={filtersOpen}
                        aria-controls="pokedex-filters"
                        className="relative shrink-0 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 md:hidden"
                    >
                        {t("filters")}
                        {activeFilterCount > 0 && (
                            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                                <span aria-hidden>{activeFilterCount}</span>
                                <span className="sr-only">{t("activeFilters", { n: activeFilterCount })}</span>
                            </span>
                        )}
                    </button>
                </div>

                <div id="pokedex-filters" className={`${filtersOpen ? "block" : "hidden"} space-y-4 md:block`}>
                    <div role="group" aria-labelledby="pokedex-type-label">
                        <SectionLabel
                            aside={selectedTypes.length > 0 && <ClearButton onClick={clearTypes}>{t("clearSelection")}</ClearButton>}
                        >
                            <span id="pokedex-type-label">{t("type")}</span>{" "}
                            <span className="font-normal text-slate-400">{t("typeHint", { n: MAX_SELECTED_TYPES })}</span>
                        </SectionLabel>
                        <div className="grid grid-cols-3 gap-1.5 min-[400px]:grid-cols-6 sm:grid-cols-9">
                            {TYPES.map((type) => {
                                const active = selectedTypes.includes(type.name)
                                return (
                                    <button
                                        key={type.name}
                                        type="button"
                                        onClick={() => toggleType(type.name)}
                                        aria-pressed={active}
                                        className={[
                                            "flex min-w-0 items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[11px] font-bold transition",
                                            active
                                                ? `${type.name} text-white shadow-sm ring-2 ring-slate-900/70 ring-offset-1`
                                                : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                                        ].join(" ")}
                                    >
                                        <img
                                            src={`${import.meta.env.BASE_URL}assets/types/${type.name}.svg`}
                                            alt=""
                                            aria-hidden
                                            className={`hidden h-3.5 w-3.5 shrink-0 sm:block ${active ? "" : "opacity-60 invert"}`}
                                        />
                                        <span className="truncate">{typeName(type.name, lang)}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div role="group" aria-labelledby="pokedex-gen-label">
                        <SectionLabel
                            aside={
                                selectedGenerations.length > 0 && <ClearButton onClick={clearGenerations}>{t("clearSelection")}</ClearButton>
                            }
                        >
                            <span id="pokedex-gen-label">{t("generation")}</span>
                        </SectionLabel>
                        <div className="flex flex-wrap gap-1.5">
                            {GENERATIONS.map((g) => (
                                <Chip key={g.id} active={selectedGenerations.includes(g.id)} onClick={() => toggleGeneration(g.id)}>
                                    {generationName(g.id, lang)}
                                </Chip>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <SectionLabel>{t("learnableMove")}</SectionLabel>
                            <MoveFilter />
                        </div>
                        <div>
                            <SectionLabel>{t("sort")}</SectionLabel>
                            <div className="flex gap-2">
                                <select
                                    value={sortKey}
                                    onChange={(e) => setSortKey(e.target.value as PokedexSortKey)}
                                    aria-label={t("sortBy")}
                                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
                                >
                                    {SORT_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>
                                            {sortLabel(o.label, lang, t)}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                                    className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-slate-300"
                                    title={t("toggleSortDir")}
                                >
                                    {sortDir === "asc" ? t("asc") : t("desc")}
                                </button>
                            </div>
                            <label className="mt-3 flex cursor-pointer select-none flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={includeForms}
                                    onChange={(e) => setIncludeForms(e.target.checked)}
                                    className="peer sr-only"
                                />
                                <span
                                    aria-hidden
                                    className="relative h-5 w-9 shrink-0 rounded-full bg-slate-200 transition peer-checked:bg-red-500 peer-focus-visible:ring-2 peer-focus-visible:ring-red-200 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4"
                                />
                                {t("includeForms")} <span className="text-xs text-slate-400">{t("includeFormsHint")}</span>
                            </label>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 결과 헤더 ── */}
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-slate-500" aria-live="polite" aria-atomic>
                    <span className={`font-bold tabular-nums text-slate-900 transition-opacity ${isSearching ? "opacity-50" : ""}`}>
                        {t("resultCount", { n: results.length })}
                    </span>
                    {hasMore && <span className="text-slate-400"> · {t("showingCount", { n: visibleCount })}</span>}
                </p>
                <button
                    type="button"
                    onClick={reset}
                    disabled={!isDirty}
                    className="rounded-lg px-2.5 py-1 text-sm font-semibold text-red-500 transition hover:bg-red-50 disabled:cursor-default disabled:text-slate-300 disabled:hover:bg-transparent"
                >
                    {t("reset")}
                </button>
            </div>

            {/* ── 결과 그리드 ── */}
            {results.length === 0 ? (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
                    <svg viewBox="0 0 48 48" className="h-12 w-12 text-slate-200" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                        <circle cx="24" cy="24" r="21" />
                        <path d="M3 24h42" />
                        <circle cx="24" cy="24" r="6" fill="white" />
                    </svg>
                    <p className="mt-3 text-sm font-bold text-slate-700">{t("emptyTitle")}</p>
                    <p className="mt-1 text-sm text-slate-400">{t("emptyBody")}</p>
                    {isDirty && (
                        <button
                            type="button"
                            onClick={reset}
                            className="mt-4 rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-red-500"
                        >
                            {t("reset")}
                        </button>
                    )}
                </div>
            ) : (
                <div
                    className={`grid grid-cols-2 gap-2.5 transition-opacity sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 ${isSearching ? "opacity-60" : ""}`}
                >
                    {visible.map((e) => (
                        <PokemonCard
                            key={e.p.id}
                            pokemon={e.p}
                            highlight={
                                highlightStat ? { label: statLabel(highlightStat, lang, true), value: e.p.stats[highlightStat] } : undefined
                            }
                        />
                    ))}
                </div>
            )}

            {hasMore && (
                <div ref={sentinelRef} className="flex justify-center pt-2">
                    <button
                        type="button"
                        onClick={() => setPage(page + 1)}
                        className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300"
                    >
                        {t("loadMore", { n: results.length - visibleCount })}
                    </button>
                </div>
            )}
        </div>
    )
}
