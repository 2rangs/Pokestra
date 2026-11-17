import { type ReactNode, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { PokemonCard } from "../../components/PokemonCard.tsx"
import {
    ALL_POKEMON,
    GENERATIONS,
    MOVES,
    MOVE_BY_NAME,
    STAT_LABEL_KO,
    TYPES,
    type DexMove,
    type DexPokemon,
    type StatKey,
    baseStatTotal,
    getGeneration,
    getSpeciesId,
    isAlternateForm,
} from "../../lib/dex"
import { MAX_SELECTED_TYPES, type PokedexSortKey, usePokedexStore } from "../../stores/pokedexStore"

const PAGE_SIZE = 60
const MAX_MOVE_SUGGESTIONS = 8

const SORT_OPTIONS: { value: PokedexSortKey; label: string }[] = [
    { value: "id", label: "도감번호" },
    { value: "name", label: "이름" },
    { value: "total", label: "종족값 합계" },
    { value: "hp", label: "HP" },
    { value: "attack", label: "공격" },
    { value: "defense", label: "방어" },
    { value: "spAtk", label: "특공" },
    { value: "spDef", label: "특방" },
    { value: "speed", label: "스피드" },
]

const DAMAGE_CLASS_KO: Record<string, string> = { physical: "물리", special: "특수", status: "변화" }

// ── 검색 인덱스 (모듈 로드 시 1회) ──

interface IndexedPokemon {
    p: DexPokemon
    nameKo: string
    nameEn: string
    speciesId: number
    generation: number
    total: number
    isForm: boolean
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/[\s_]+/g, "-")
const normalizeKo = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "")

const INDEX: IndexedPokemon[] = ALL_POKEMON.map((p) => ({
    p,
    nameKo: normalizeKo(p.nameKo),
    nameEn: p.name,
    speciesId: getSpeciesId(p),
    generation: getGeneration(p),
    total: baseStatTotal(p),
    isForm: isAlternateForm(p),
}))

const koCollator = new Intl.Collator("ko")

function matchesName(e: IndexedPokemon, rawQuery: string): boolean {
    const q = rawQuery.trim()
    if (!q) return true
    const num = q.replace(/^#/, "")
    if (/^\d+$/.test(num)) return e.speciesId === Number(num)
    return e.nameKo.includes(normalizeKo(q)) || e.nameEn.includes(normalize(q))
}

function findMoveSuggestions(query: string): DexMove[] {
    const ko = normalizeKo(query)
    const en = normalize(query)
    if (!ko) return []
    const starts: DexMove[] = []
    const contains: DexMove[] = []
    for (const m of MOVES) {
        const mKo = normalizeKo(m.nameKo)
        if (mKo.startsWith(ko) || m.name.startsWith(en)) starts.push(m)
        else if (mKo.includes(ko) || m.name.includes(en)) contains.push(m)
        if (starts.length >= MAX_MOVE_SUGGESTIONS) break
    }
    return [...starts, ...contains].slice(0, MAX_MOVE_SUGGESTIONS)
}

/** 입력이 기술 이름과 정확히 일치하면 그 기술 slug */
function exactMove(query: string): string | null {
    const ko = normalizeKo(query)
    const en = normalize(query)
    if (!ko) return null
    if (MOVE_BY_NAME.has(en)) return en
    return MOVES.find((m) => normalizeKo(m.nameKo) === ko)?.name ?? null
}

function sortValue(e: IndexedPokemon, key: PokedexSortKey): number {
    if (key === "id") return e.speciesId
    if (key === "total") return e.total
    if (key === "name") return 0
    return e.p.stats[key]
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
    const moveSearch = usePokedexStore((s) => s.moveSearch)
    const selectedMove = usePokedexStore((s) => s.selectedMove)
    const setMoveSearch = usePokedexStore((s) => s.setMoveSearch)
    const setSelectedMove = usePokedexStore((s) => s.setSelectedMove)
    const [open, setOpen] = useState(false)
    const [active, setActive] = useState(0)

    const suggestions = useMemo(
        () => (selectedMove ? [] : findMoveSuggestions(moveSearch)),
        [moveSearch, selectedMove],
    )
    const resolved = selectedMove ?? exactMove(moveSearch)
    const resolvedMove = resolved ? MOVE_BY_NAME.get(resolved) : undefined
    const showDropdown = open && suggestions.length > 0

    const pick = (m: DexMove) => {
        setSelectedMove(m.name, m.nameKo)
        setOpen(false)
    }

    return (
        <div className="relative">
            <div className="relative">
                <input
                    type="search"
                    value={moveSearch}
                    placeholder="기술 이름 (예: 지진, earthquake)"
                    onChange={(e) => {
                        setMoveSearch(e.target.value)
                        setActive(0)
                        setOpen(true)
                    }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setOpen(false)}
                    onKeyDown={(e) => {
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
                        } else if (e.key === "Escape") {
                            setOpen(false)
                        }
                    }}
                    role="combobox"
                    aria-expanded={showDropdown}
                    aria-autocomplete="list"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
                />
            </div>
            {resolvedMove && (
                <p className="mt-1 text-[11px] text-slate-500">
                    <span className="font-semibold text-red-500">{resolvedMove.nameKo}</span> 을(를) 배우는 포켓몬만 표시
                </p>
            )}
            {!resolvedMove && moveSearch.trim() && !showDropdown && (
                <p className="mt-1 text-[11px] text-slate-400">목록에서 기술을 선택하세요</p>
            )}
            {showDropdown && (
                <ul
                    role="listbox"
                    className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                >
                    {suggestions.map((m, i) => (
                        <li key={m.name} role="option" aria-selected={i === active}>
                            <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onMouseEnter={() => setActive(i)}
                                onClick={() => pick(m)}
                                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${i === active ? "bg-slate-100" : ""}`}
                            >
                                <span className={`${m.type} h-2.5 w-2.5 shrink-0 rounded-full`} aria-hidden />
                                <span className="font-semibold text-slate-800">{m.nameKo}</span>
                                <span className="truncate text-xs text-slate-400">{m.name}</span>
                                <span className="ml-auto shrink-0 text-[10px] text-slate-400">
                                    {DAMAGE_CLASS_KO[m.damageClass] ?? m.damageClass}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

// ── Page ──

export default function PokedexPage() {
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

    const results = useMemo(() => {
        const gens = new Set(selectedGenerations)
        const filtered = INDEX.filter(
            (e) =>
                (includeForms || !e.isForm) &&
                (gens.size === 0 || gens.has(e.generation)) &&
                selectedTypes.every((t) => e.p.types.includes(t)) &&
                (!moveSlug || e.p.moves.includes(moveSlug)) &&
                matchesName(e, deferredName),
        )
        const dir = sortDir === "asc" ? 1 : -1
        filtered.sort((a, b) => {
            const primary =
                sortKey === "name"
                    ? koCollator.compare(a.p.nameKo, b.p.nameKo)
                    : sortValue(a, sortKey) - sortValue(b, sortKey)
            if (primary !== 0) return primary * dir
            // 동률이면 도감번호 → id 오름차순
            return a.speciesId - b.speciesId || a.p.id - b.p.id
        })
        return filtered
    }, [selectedGenerations, includeForms, selectedTypes, moveSlug, deferredName, sortKey, sortDir])

    const visibleCount = Math.min(results.length, page * PAGE_SIZE)
    const visible = results.slice(0, visibleCount)
    const hasMore = visibleCount < results.length

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
    const isDirty = activeFilterCount > 0 || nameSearch.trim() !== "" || moveSearch !== "" || sortKey !== "id" || sortDir !== "asc"

    return (
        <div className="space-y-4">
            <div className="flex items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">포켓몬 도감</h1>
                    <p className="mt-0.5 text-sm text-slate-500">이름·번호·타입·세대·기술로 찾아보세요</p>
                </div>
            </div>

            {/* ── 검색/필터 패널 ── */}
            <section className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <svg viewBox="0 0 20 20" fill="none" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden>
                            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
                            <path d="m14 14 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <input
                            type="search"
                            value={nameSearch}
                            onChange={(e) => setNameSearch(e.target.value)}
                            placeholder="이름 또는 번호 (피카츄, pikachu, 25)"
                            aria-label="포켓몬 이름 또는 번호 검색"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => setFiltersOpen((v) => !v)}
                        aria-expanded={filtersOpen}
                        className="relative shrink-0 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 md:hidden"
                    >
                        필터
                        {activeFilterCount > 0 && (
                            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>

                <div className={`${filtersOpen ? "block" : "hidden"} space-y-4 md:block`}>
                    <div>
                        <SectionLabel
                            aside={
                                selectedTypes.length > 0 && (
                                    <button type="button" onClick={clearTypes} className="text-[11px] font-semibold text-slate-400 hover:text-red-500">
                                        해제
                                    </button>
                                )
                            }
                        >
                            타입 <span className="font-normal text-slate-400">(최대 {MAX_SELECTED_TYPES}개, 모두 가진 포켓몬)</span>
                        </SectionLabel>
                        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-9">
                            {TYPES.map((t) => {
                                const active = selectedTypes.includes(t.name)
                                return (
                                    <button
                                        key={t.name}
                                        type="button"
                                        onClick={() => toggleType(t.name)}
                                        aria-pressed={active}
                                        className={[
                                            "flex items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[11px] font-bold transition",
                                            active
                                                ? `${t.name} text-white shadow-sm ring-2 ring-slate-900/70 ring-offset-1`
                                                : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                                        ].join(" ")}
                                    >
                                        <img
                                            src={`${import.meta.env.BASE_URL}assets/types/${t.name}.svg`}
                                            alt=""
                                            aria-hidden
                                            className={`hidden h-3.5 w-3.5 sm:block ${active ? "" : "opacity-60 invert"}`}
                                        />
                                        {t.nameKo}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div>
                        <SectionLabel
                            aside={
                                selectedGenerations.length > 0 && (
                                    <button type="button" onClick={clearGenerations} className="text-[11px] font-semibold text-slate-400 hover:text-red-500">
                                        해제
                                    </button>
                                )
                            }
                        >
                            세대
                        </SectionLabel>
                        <div className="flex flex-wrap gap-1.5">
                            {GENERATIONS.map((g) => (
                                <Chip key={g.id} active={selectedGenerations.includes(g.id)} onClick={() => toggleGeneration(g.id)}>
                                    {g.nameKo}
                                </Chip>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <SectionLabel>배울 수 있는 기술</SectionLabel>
                            <MoveFilter />
                        </div>
                        <div>
                            <SectionLabel>정렬</SectionLabel>
                            <div className="flex gap-2">
                                <select
                                    value={sortKey}
                                    onChange={(e) => setSortKey(e.target.value as PokedexSortKey)}
                                    aria-label="정렬 기준"
                                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
                                >
                                    {SORT_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                                    className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-slate-300"
                                    aria-label="정렬 방향 전환"
                                >
                                    {sortDir === "asc" ? "오름차순 ↑" : "내림차순 ↓"}
                                </button>
                            </div>
                            <label className="mt-3 flex cursor-pointer select-none items-center gap-2 text-sm text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={includeForms}
                                    onChange={(e) => setIncludeForms(e.target.checked)}
                                    className="peer sr-only"
                                />
                                <span className="relative h-5 w-9 rounded-full bg-slate-200 transition peer-checked:bg-red-500 peer-focus-visible:ring-2 peer-focus-visible:ring-red-200 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4" />
                                폼 포함 <span className="text-xs text-slate-400">(메가진화·리전폼 등)</span>
                            </label>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 결과 헤더 ── */}
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-slate-500">
                    <span className="font-bold tabular-nums text-slate-900">{results.length.toLocaleString()}</span>마리
                    {results.length > 0 && (
                        <span className="text-slate-400"> · {visibleCount.toLocaleString()}마리 표시 중</span>
                    )}
                </p>
                <button
                    type="button"
                    onClick={() => {
                        resetFilters()
                        setFiltersOpen(false)
                    }}
                    disabled={!isDirty}
                    className="rounded-lg px-2.5 py-1 text-sm font-semibold text-red-500 transition hover:bg-red-50 disabled:cursor-default disabled:text-slate-300 disabled:hover:bg-transparent"
                >
                    초기화
                </button>
            </div>

            {/* ── 결과 그리드 ── */}
            {results.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
                    조건에 맞는 포켓몬이 없어요.
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
                    {visible.map((e) => (
                        <PokemonCard
                            key={e.p.id}
                            pokemon={e.p}
                            highlight={highlightStat ? { label: STAT_LABEL_KO[highlightStat], value: e.p.stats[highlightStat] } : undefined}
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
                        더 보기 ({(results.length - visibleCount).toLocaleString()}마리 남음)
                    </button>
                </div>
            )}
        </div>
    )
}
