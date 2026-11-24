import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router"
import { Button } from "@astryxdesign/core/Button"
import { EmptyState } from "@astryxdesign/core/EmptyState"
import { Grid } from "@astryxdesign/core/Grid"
import { Heading } from "@astryxdesign/core/Heading"
import { HStack } from "@astryxdesign/core/HStack"
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl"
import { Text } from "@astryxdesign/core/Text"
import { Switch } from "@astryxdesign/core/Switch"
import { VStack } from "@astryxdesign/core/VStack"
import { PokemonCard } from "../../components/PokemonCard.tsx"
import { PokedexFilterBar } from "../../components/pokedex/PokedexFilterBar"
import { PokedexTable } from "../../components/pokedex/PokedexTable"
import { exactMove, norm } from "../../components/pokedex/search"
import { collator, useDocumentTitle, useLang, useT } from "../../i18n"
import { pokedexMessages } from "../../i18n/messages/pokedex"
import {
    ALL_POKEMON,
    type DexPokemon,
    type StatKey,
    baseStatTotal,
    displayName,
    getGeneration,
    getSpeciesId,
    isAlternateForm,
    searchKey,
    statLabel,
} from "../../lib/dex"
import { type PokedexSortKey, usePokedexStore } from "../../stores/pokedexStore"

const PAGE_SIZE = 60

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

    const setPage = usePokedexStore((s) => s.setPage)
    const resetFilters = usePokedexStore((s) => s.resetFilters)

    const [filtersOpen, setFiltersOpen] = useState(false)
    // 초기화하면 기술 입력칸(자체 입력 상태를 가진 Typeahead)도 새로 그린다
    const [moveFilterKey, setMoveFilterKey] = useState(0)

    const deferredName = useDeferredValue(nameSearch)
    const moveSlug = selectedMove ?? exactMove(moveSearch)

    // 붙어 있는 필터 바 아래에서 필터를 바꾸면 결과가 줄어 빈 화면이 남는다 → 첫 결과를 바 바로 아래로 되돌린다
    const filterSignature = [selectedGenerations.join(), includeForms, selectedTypes.join(), moveSlug, deferredName, sortKey, sortDir].join("|")
    const lastSignature = useRef(filterSignature)
    useEffect(() => {
        if (lastSignature.current === filterSignature) return
        lastSignature.current = filterSignature
        const bar = document.getElementById("pokedex-filter-bar")
        const head = document.getElementById("pokedex-results-head")
        const header = document.querySelector("header")
        if (!bar || !head || !header) return
        const headerBottom = header.getBoundingClientRect().bottom
        if (bar.getBoundingClientRect().top > headerBottom + 1) return
        const top = head.getBoundingClientRect().top + window.scrollY - headerBottom - bar.getBoundingClientRect().height
        window.scrollTo({ top: Math.max(0, top) })
    }, [filterSignature])

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

    // 무한 스크롤: 다음 페이지 분량의 빈 자리(data-slot)를 카드 뒤에 잡아 두고, 그 자리가 화면 근처로 오면 한 페이지만 더 불러온다.
    // 자리 덕에 문서 높이와 바닥 푸터가 불러올 때 밀리지 않는다(레이아웃 이동 없음).
    const resultsRef = useRef<HTMLSpanElement | null>(null)
    const focusIndex = useRef<number | null>(null)
    useEffect(() => {
        const root = resultsRef.current
        if (!root || !hasMore) return
        const io = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) setPage(usePokedexStore.getState().page + 1)
            },
            { rootMargin: "600px 0px" },
        )
        for (const el of root.querySelectorAll("[data-slot]")) io.observe(el)
        return () => io.disconnect()
    }, [hasMore, visibleCount, results, view, setPage])
    // "더 보기"를 눌렀다면 새로 생긴 첫 카드로 포커스를 옮긴다
    useEffect(() => {
        const i = focusIndex.current
        if (i == null || visibleCount <= i) return
        focusIndex.current = null
        resultsRef.current?.querySelectorAll<HTMLElement>("a[href]")[i]?.focus({ preventScroll: false })
    }, [visibleCount])
    const loadMore = () => {
        focusIndex.current = visibleCount
        setPage(page + 1)
    }

    const highlightStat: StatKey | null =
        sortKey === "id" || sortKey === "name" || sortKey === "total" ? null : sortKey

    const highlightLabelText = highlightStat
        ? statLabel(highlightStat, lang, true)
        : sortKey === "total"
          ? t("cardTotal")
          : undefined

    const activeFilterCount =
        selectedTypes.length + selectedGenerations.length + (moveSlug ? 1 : 0) + (includeForms ? 1 : 0)
    const isDirty =
        activeFilterCount > 0 || nameSearch.trim() !== "" || moveSearch !== "" || selectedMove != null || sortKey !== "id" || sortDir !== "asc"

    // 필터 칩의 "모두 지우기": 타입·세대·기술만 (검색어·정렬은 그대로)
    const clearFilterChips = () => {
        const s = usePokedexStore.getState()
        s.clearTypes()
        s.setGenerations([])
        s.setSelectedMove(null)
        setMoveFilterKey((k) => k + 1)
    }

    const reset = () => {
        resetFilters()
        setMoveFilterKey((k) => k + 1)
        setFiltersOpen(false)
    }

    return (
        <VStack gap={4}>
            <HStack gap={3} vAlign="end" wrap="wrap">
                <Heading level={1}>{t("title")}</Heading>
                <HStack className="hidden sm:flex">
                    <Text color="secondary">{t("subtitle")}</Text>
                </HStack>
            </HStack>

            <PokedexFilterBar
                moveFilterKey={moveFilterKey}
                activeFilterCount={activeFilterCount}
                open={filtersOpen}
                onToggleOpen={() => setFiltersOpen((v) => !v)}
                onClearAll={clearFilterChips}
            />

            {/* ── 결과 헤더 ── */}
            <HStack id="pokedex-results-head" justify="between" vAlign="center" gap={2} wrap="wrap">
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
                <HStack gap={3} vAlign="center">
                    <Switch
                        label={t("includeForms")}
                        labelTooltip={t("includeFormsHint")}
                        value={includeForms}
                        onChange={(v) => usePokedexStore.getState().setIncludeForms(v)}
                    />
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
                <VStack ref={resultsRef} className={`transition-opacity ${isSearching ? "opacity-60" : ""}`}>
                    <PokedexTable pokemon={visible.map((e) => e.p)} sortStat={sortKey === "total" ? "total" : highlightStat} />
                    {hasMore && (
                        <HStack justify="center" paddingBlock={2}>
                            <Button label={t("loadMore", { n: results.length - visibleCount })} onClick={loadMore} />
                        </HStack>
                    )}
                    {hasMore && <HStack data-slot={visibleCount} aria-hidden className="h-px" />}
                </VStack>
            ) : (
                <VStack ref={resultsRef} className={`transition-opacity ${isSearching ? "opacity-60" : ""}`}>
                    <Grid columns={{ minWidth: 180, max: 6 }} gap={4} className="max-sm:grid-cols-1 max-sm:gap-1.5">
                        {visible.map((e) => (
                            <PokemonCard
                                key={e.p.id}
                                pokemon={e.p}
                                highlightLabel={highlightLabelText}
                                highlightValue={
                                    highlightStat ? e.p.stats[highlightStat] : sortKey === "total" ? e.total : undefined
                                }
                            />
                        ))}
                    </Grid>
                    {hasMore && (
                        <HStack justify="center" paddingBlock={2}>
                            <Button label={t("loadMore", { n: results.length - visibleCount })} onClick={loadMore} />
                        </HStack>
                    )}
                    {hasMore && (
                        <Grid columns={{ minWidth: 180, max: 6 }} gap={4} aria-hidden className="max-sm:grid-cols-1 max-sm:gap-1.5">
                            {results.slice(visibleCount, visibleCount + PAGE_SIZE).map((e, i) => (
                                <HStack key={e.p.id} data-slot={visibleCount + i} className="h-17 sm:h-72" />
                            ))}
                        </Grid>
                    )}
                </VStack>
            )}

        </VStack>
    )
}
