import { type ReactNode, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router"
import { Button } from "@astryxdesign/core/Button"
import { Card } from "@astryxdesign/core/Card"
import { EmptyState } from "@astryxdesign/core/EmptyState"
import { Grid } from "@astryxdesign/core/Grid"
import { Heading } from "@astryxdesign/core/Heading"
import { HStack } from "@astryxdesign/core/HStack"
import { Icon } from "@astryxdesign/core/Icon"
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl"
import { Selector } from "@astryxdesign/core/Selector"
import { Switch } from "@astryxdesign/core/Switch"
import { Text } from "@astryxdesign/core/Text"
import { TextInput } from "@astryxdesign/core/TextInput"
import { ToggleButton } from "@astryxdesign/core/ToggleButton"
import { VStack } from "@astryxdesign/core/VStack"
import { PokemonCard } from "../../components/PokemonCard.tsx"
import { MoveFilter } from "../../components/pokedex/MoveFilter"
import { PokedexTable } from "../../components/pokedex/PokedexTable"
import { exactMove, norm } from "../../components/pokedex/search"
import { TypeIconDot } from "../../components/ui/shared"
import { type Lang, collator, useDocumentTitle, useLang, useT } from "../../i18n"
import { type PokedexKey, pokedexMessages } from "../../i18n/messages/pokedex"
import {
    ALL_POKEMON,
    GENERATIONS,
    TYPES,
    type DexPokemon,
    type StatKey,
    baseStatTotal,
    displayName,
    generationName,
    getGeneration,
    getSpeciesId,
    isAlternateForm,
    searchKey,
    statLabel,
    typeName,
} from "../../lib/dex"
import { MAX_SELECTED_TYPES, type PokedexSortKey, type SortDir, usePokedexStore } from "../../stores/pokedexStore"

const PAGE_SIZE = 60

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

type View = "grid" | "table"

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

/** 필터 묶음: 소제목 + (선택) 해제 버튼 */
function FilterGroup({
    id,
    label,
    hint,
    onClear,
    clearLabel,
    children,
}: {
    id: string
    label: string
    hint?: string
    onClear?: () => void
    clearLabel: string
    children: ReactNode
}) {
    return (
        <VStack gap={2} role="group" aria-labelledby={id}>
            <HStack justify="between" vAlign="center" gap={2}>
                <span>
                    <Text type="label" id={id}>
                        {label}
                    </Text>{" "}
                    {hint && <Text type="supporting">{hint}</Text>}
                </span>
                {onClear && <Button size="sm" variant="ghost" label={clearLabel} onClick={onClear} />}
            </HStack>
            {children}
        </VStack>
    )
}

// ── Page ──

export default function PokedexPage() {
    const lang = useLang()
    const t = useT(pokedexMessages)
    useDocumentTitle(t("title"))

    const [searchParams, setSearchParams] = useSearchParams()
    const view: View = searchParams.get("view") === "table" ? "table" : "grid"
    const setView = (v: View) =>
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev)
                if (v === "grid") next.delete("view")
                else next.set("view", v)
                return next
            },
            { replace: true },
        )

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
    // 초기화하면 기술 입력칸(자체 입력 상태를 가진 Typeahead)도 새로 그린다
    const [moveFilterKey, setMoveFilterKey] = useState(0)

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
        setMoveFilterKey((k) => k + 1)
        setFiltersOpen(false)
    }

    return (
        <VStack gap={5}>
            <VStack gap={1}>
                <Heading level={1}>{t("title")}</Heading>
                <Text color="secondary" as="p">
                    {t("subtitle")}
                </Text>
            </VStack>

            {/* ── 검색/필터 패널 ── */}
            <Card>
                <section aria-label={t("filters")}>
                    <VStack gap={4}>
                        <HStack gap={2} vAlign="end">
                            <span className="min-w-0 flex-1">
                                <TextInput
                                    type="search"
                                    label={t("searchLabel")}
                                    isLabelHidden
                                    value={nameSearch}
                                    onChange={(v) => setNameSearch(v)}
                                    placeholder={t("searchPlaceholder")}
                                    enterKeyHint="search"
                                    startIcon={<Icon icon="search" />}
                                    hasClear
                                    width="100%"
                                />
                            </span>
                            <span className="md:hidden">
                                <Button
                                    icon={<Icon icon="funnel" />}
                                    label={activeFilterCount > 0 ? `${t("filters")} ${activeFilterCount}` : t("filters")}
                                    tooltip={activeFilterCount > 0 ? t("activeFilters", { n: activeFilterCount }) : undefined}
                                    onClick={() => setFiltersOpen((v) => !v)}
                                    aria-expanded={filtersOpen}
                                    aria-controls="pokedex-filters"
                                />
                            </span>
                        </HStack>

                        <div id="pokedex-filters" className={`${filtersOpen ? "flex" : "hidden"} flex-col gap-5 md:flex`}>
                            <FilterGroup
                                id="pokedex-type-label"
                                label={t("type")}
                                hint={t("typeHint", { n: MAX_SELECTED_TYPES })}
                                onClear={selectedTypes.length > 0 ? clearTypes : undefined}
                                clearLabel={t("clearSelection")}
                            >
                                <Grid columns={{ minWidth: 104, repeat: "fill" }} gap={1.5}>
                                    {TYPES.map((type) => (
                                        <ToggleButton
                                            key={type.name}
                                            size="sm"
                                            label={typeName(type.name, lang)}
                                            icon={<TypeIconDot type={type.name} />}
                                            isPressed={selectedTypes.includes(type.name)}
                                            onPressedChange={() => toggleType(type.name)}
                                            className="w-full justify-start"
                                        >
                                            {typeName(type.name, lang)}
                                        </ToggleButton>
                                    ))}
                                </Grid>
                            </FilterGroup>

                            <FilterGroup
                                id="pokedex-gen-label"
                                label={t("generation")}
                                onClear={selectedGenerations.length > 0 ? clearGenerations : undefined}
                                clearLabel={t("clearSelection")}
                            >
                                <HStack gap={1.5} wrap="wrap">
                                    {GENERATIONS.map((g) => (
                                        <ToggleButton
                                            key={g.id}
                                            size="sm"
                                            label={generationName(g.id, lang)}
                                            isPressed={selectedGenerations.includes(g.id)}
                                            onPressedChange={() => toggleGeneration(g.id)}
                                        />
                                    ))}
                                </HStack>
                            </FilterGroup>

                            <Grid columns={{ minWidth: 280, repeat: "fit" }} gap={5}>
                                <MoveFilter key={moveFilterKey} />
                                <VStack gap={3}>
                                    <HStack gap={2} vAlign="end" wrap="wrap">
                                        <span className="min-w-40 flex-1">
                                            <Selector
                                                label={t("sortBy")}
                                                value={sortKey}
                                                onChange={(v) => setSortKey(v as PokedexSortKey)}
                                                options={SORT_OPTIONS.map((o) => ({ value: o.value, label: sortLabel(o.label, lang, t) }))}
                                                width="100%"
                                            />
                                        </span>
                                        <SegmentedControl label={t("toggleSortDir")} value={sortDir} onChange={(v) => setSortDir(v as SortDir)}>
                                            <SegmentedControlItem value="asc" label={t("asc")} icon={<Icon icon="arrowUp" size="sm" />} />
                                            <SegmentedControlItem value="desc" label={t("desc")} icon={<Icon icon="arrowDown" size="sm" />} />
                                        </SegmentedControl>
                                    </HStack>
                                    <Switch
                                        label={t("includeForms")}
                                        description={t("includeFormsHint")}
                                        value={includeForms}
                                        onChange={(v) => setIncludeForms(v)}
                                    />
                                </VStack>
                            </Grid>
                        </div>
                    </VStack>
                </section>
            </Card>

            {/* ── 결과 헤더 ── */}
            <HStack justify="between" vAlign="center" gap={2} wrap="wrap">
                <span aria-live="polite" aria-atomic className={`flex flex-wrap items-baseline gap-x-3 ${isSearching ? "opacity-60" : ""}`}>
                    <Text weight="semibold" hasTabularNumbers>
                        {t("resultCount", { n: results.length })}
                    </Text>
                    {hasMore && (
                        <Text type="supporting" hasTabularNumbers>
                            {t("showingCount", { n: visibleCount })}
                        </Text>
                    )}
                </span>
                <HStack gap={2} vAlign="center">
                    <Button variant="ghost" size="sm" label={t("reset")} onClick={reset} isDisabled={!isDirty} />
                    <SegmentedControl size="sm" label={t("viewMode")} value={view} onChange={(v) => setView(v as View)}>
                        <SegmentedControlItem value="grid" label={t("viewGrid")} />
                        <SegmentedControlItem value="table" label={t("viewTable")} />
                    </SegmentedControl>
                </HStack>
            </HStack>

            {/* ── 결과 ── */}
            {results.length === 0 ? (
                <EmptyState
                    title={t("emptyTitle")}
                    description={t("emptyBody")}
                    headingLevel={2}
                    actions={isDirty ? <Button variant="primary" label={t("reset")} onClick={reset} /> : undefined}
                />
            ) : view === "table" ? (
                <div className={`transition-opacity ${isSearching ? "opacity-60" : ""}`}>
                    <PokedexTable pokemon={visible.map((e) => e.p)} sortStat={sortKey === "total" ? "total" : highlightStat} />
                </div>
            ) : (
                <div className={`transition-opacity ${isSearching ? "opacity-60" : ""}`}>
                    <Grid columns={{ minWidth: 150, repeat: "fill" }} gap={3}>
                        {visible.map((e) => (
                            <PokemonCard
                                key={e.p.id}
                                pokemon={e.p}
                                highlight={
                                    highlightStat ? { label: statLabel(highlightStat, lang, true), value: e.p.stats[highlightStat] } : undefined
                                }
                            />
                        ))}
                    </Grid>
                </div>
            )}

            {hasMore && (
                <div ref={sentinelRef} className="flex justify-center pt-2">
                    <Button label={t("loadMore", { n: results.length - visibleCount })} onClick={() => setPage(page + 1)} />
                </div>
            )}
        </VStack>
    )
}
