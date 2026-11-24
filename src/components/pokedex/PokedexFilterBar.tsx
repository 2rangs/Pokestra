import { useRef } from "react"
import { Button } from "@astryxdesign/core/Button"
import { HStack } from "@astryxdesign/core/HStack"
import { Icon } from "@astryxdesign/core/Icon"
import { MultiSelector } from "@astryxdesign/core/MultiSelector"
import { IconButton } from "@astryxdesign/core/IconButton"
import { Selector } from "@astryxdesign/core/Selector"
import { TextInput } from "@astryxdesign/core/TextInput"
import { Token } from "@astryxdesign/core/Token"
import { useSlashFocus } from "../../hooks/useSlashFocus"
import { type Lang, useLang, useT } from "../../i18n"
import { type PokedexKey, pokedexMessages } from "../../i18n/messages/pokedex"
import { GENERATIONS, TYPES, type StatKey, generationName, moveName, statLabel, typeName } from "../../lib/dex"
import { MAX_SELECTED_TYPES, type PokedexSortKey, usePokedexStore } from "../../stores/pokedexStore"
import { TypeGlyph, TypeMark } from "../ui/TypeChip"
import { typeTokenColor } from "../ui/typeChipModel"
import { MoveFilter } from "./MoveFilter"

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

const STAT_KEY_SET: ReadonlySet<string> = new Set<StatKey>(["hp", "attack", "defense", "spAtk", "spDef", "speed"])

function sortLabel(label: PokedexKey | StatKey, lang: Lang, t: (k: PokedexKey) => string): string {
    return STAT_KEY_SET.has(label) ? statLabel(label as StatKey, lang) : t(label as PokedexKey)
}

/**
 * 도감 필터 바 (헤더 아래 고정).
 * 1줄: 검색(넓게) · 타입 · 세대 · 기술 · 정렬(+방향). 좁은 화면은 검색 + "필터" 버튼, 나머지는 펼쳐서.
 * 2줄(적용 중일 때만): 고른 필터를 칩으로 — ✕ 로 하나씩 해제, "모두 지우기".
 */
export function PokedexFilterBar({
    moveFilterKey,
    activeFilterCount,
    open,
    onToggleOpen,
    onClearAll,
}: {
    moveFilterKey: number
    activeFilterCount: number
    open: boolean
    onToggleOpen: () => void
    onClearAll: () => void
}) {
    const lang = useLang()
    const t = useT(pokedexMessages)
    const searchRef = useRef<HTMLSpanElement | null>(null)
    useSlashFocus(searchRef)

    const nameSearch = usePokedexStore((s) => s.nameSearch)
    const selectedTypes = usePokedexStore((s) => s.selectedTypes)
    const selectedGenerations = usePokedexStore((s) => s.selectedGenerations)
    const selectedMove = usePokedexStore((s) => s.selectedMove)
    const sortKey = usePokedexStore((s) => s.sortKey)
    const sortDir = usePokedexStore((s) => s.sortDir)
    const setNameSearch = usePokedexStore((s) => s.setNameSearch)
    const setGenerations = usePokedexStore((s) => s.setGenerations)
    const toggleType = usePokedexStore((s) => s.toggleType)
    const setTypes = usePokedexStore((s) => s.setTypes)
    const toggleGeneration = usePokedexStore((s) => s.toggleGeneration)
    const setSelectedMove = usePokedexStore((s) => s.setSelectedMove)
    const setSortKey = usePokedexStore((s) => s.setSortKey)
    const setSortDir = usePokedexStore((s) => s.setSortDir)

    const hasChips = selectedTypes.length > 0 || selectedGenerations.length > 0 || selectedMove != null

    return (
        <section
            id="pokedex-filter-bar"
            aria-label={t("filters")}
            className="sticky top-12.25 z-30 -mx-4 flex flex-col gap-2 border-b border-border bg-body px-4 py-3 sm:-mx-6 sm:px-6"
        >
            <HStack wrap="wrap" align="center" gap={2}>
                <HStack ref={searchRef} className="order-1 min-w-0 flex-1 basis-64">
                    <TextInput
                        type="search"
                        label={t("searchLabel")}
                        isLabelHidden
                        size="lg"
                        value={nameSearch}
                        onChange={(v) => setNameSearch(v)}
                        placeholder={t("searchPlaceholder")}
                        enterKeyHint="search"
                        startIcon={<Icon icon="search" />}
                        hasClear
                        width="100%"
                    />
                </HStack>
                <HStack className="order-2 md:hidden">
                    <Button
                        size="lg"
                        icon={<Icon icon="funnel" />}
                        label={activeFilterCount > 0 ? `${t("filters")} ${activeFilterCount}` : t("filters")}
                        tooltip={activeFilterCount > 0 ? t("activeFilters", { n: activeFilterCount }) : undefined}
                        onClick={onToggleOpen}
                        aria-expanded={open}
                        aria-controls="pokedex-filter-more"
                    />
                </HStack>
                <HStack
                    id="pokedex-filter-more"
                    gap={2}
                    align="center"
                    wrap="wrap"
                    className={`${open ? "flex" : "hidden"} order-3 w-full md:order-2 md:flex md:w-auto`}
                >
                    <MultiSelector
                        label={`${t("type")} ${t("typeHint", { n: MAX_SELECTED_TYPES })}`}
                        isLabelHidden
                        size="lg"
                        placeholder={t("type")}
                        width={140}
                        presentation="adaptive"
                        options={TYPES.map((ty) => ({ value: ty.name, label: typeName(ty.name, lang), icon: <TypeGlyph type={ty.name} /> }))}
                        value={selectedTypes}
                        onChange={(v) => setTypes(v)}
                        triggerDisplay="count"
                        formatValue={(items) => (items.length === 1 ? items[0].label : `${t("type")} ${items.length}`)}
                    />
                    <MultiSelector
                        label={t("generation")}
                        isLabelHidden
                        size="lg"
                        placeholder={t("generation")}
                        width={140}
                        presentation="adaptive"
                        options={GENERATIONS.map((g) => ({ value: String(g.id), label: generationName(g.id, lang) }))}
                        value={selectedGenerations.map(String)}
                        onChange={(v) => setGenerations(v.map(Number))}
                        triggerDisplay="count"
                        formatValue={(items) => (items.length === 1 ? items[0].label : `${t("generation")} ${items.length}`)}
                    />
                    <MoveFilter key={moveFilterKey} compact />
                    <HStack gap={1} vAlign="center">
                        <Selector
                            label={t("sortBy")}
                            isLabelHidden
                            size="lg"
                            width={150}
                            presentation="adaptive"
                            value={sortKey}
                            onChange={(v) => setSortKey(v as PokedexSortKey)}
                            options={SORT_OPTIONS.map((o) => ({ value: o.value, label: sortLabel(o.label, lang, t) }))}
                        />
                        <IconButton
                            size="lg"
                            variant="secondary"
                            label={`${t("toggleSortDir")}: ${sortDir === "asc" ? t("asc") : t("desc")}`}
                            tooltip={sortDir === "asc" ? t("asc") : t("desc")}
                            icon={<Icon icon={sortDir === "asc" ? "arrowUp" : "arrowDown"} />}
                            onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                        />
                    </HStack>
                </HStack>
            </HStack>

            {/* 적용 중인 필터: 칩마다 ✕ 로 해제 */}
            {hasChips && (
                <HStack gap={1.5} vAlign="center" wrap="wrap" aria-label={t("activeFilters", { n: activeFilterCount })}>
                    {selectedTypes.map((ty) => (
                        <Token
                            key={ty}
                            size="md"
                            color={typeTokenColor(ty)}
                            icon={<TypeMark type={ty} size="sm" />}
                            label={typeName(ty, lang)}
                            onRemove={() => toggleType(ty)}
                            description={t("removeFilter", { label: typeName(ty, lang) })}
                        />
                    ))}
                    {selectedGenerations.map((g) => (
                        <Token
                            key={g}
                            size="md"
                            label={generationName(g, lang)}
                            onRemove={() => toggleGeneration(g)}
                            description={t("removeFilter", { label: generationName(g, lang) })}
                        />
                    ))}
                    {selectedMove && (
                        <Token
                            size="md"
                            label={moveName(selectedMove, lang)}
                            onRemove={() => setSelectedMove(null)}
                            description={t("removeFilter", { label: moveName(selectedMove, lang) })}
                        />
                    )}
                    <Button variant="ghost" size="sm" label={t("clearAllFilters")} onClick={onClearAll} />
                </HStack>
            )}
        </section>
    )
}
