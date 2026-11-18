import { useRef } from "react"
import { Button } from "@astryxdesign/core/Button"
import { Icon } from "@astryxdesign/core/Icon"
import { MultiSelector } from "@astryxdesign/core/MultiSelector"
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl"
import { Selector } from "@astryxdesign/core/Selector"
import { Switch } from "@astryxdesign/core/Switch"
import { Text } from "@astryxdesign/core/Text"
import { TextInput } from "@astryxdesign/core/TextInput"
import { ToggleButton } from "@astryxdesign/core/ToggleButton"
import { useSlashFocus } from "../../hooks/useSlashFocus"
import { type Lang, useLang, useT } from "../../i18n"
import { type PokedexKey, pokedexMessages } from "../../i18n/messages/pokedex"
import { GENERATIONS, TYPES, type StatKey, generationName, statLabel, typeName } from "../../lib/dex"
import { MAX_SELECTED_TYPES, type PokedexSortKey, type SortDir, usePokedexStore } from "../../stores/pokedexStore"
import { TypeIconDot } from "../ui/shared"
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

/** 헤더 아래에 붙는 2줄 필터 바: 검색·세대·기술·정렬 / 타입·폼 포함 */
export function PokedexFilterBar({
    moveFilterKey,
    activeFilterCount,
    open,
    onToggleOpen,
}: {
    moveFilterKey: number
    activeFilterCount: number
    open: boolean
    onToggleOpen: () => void
}) {
    const lang = useLang()
    const t = useT(pokedexMessages)
    const searchRef = useRef<HTMLSpanElement | null>(null)
    useSlashFocus(searchRef)

    const nameSearch = usePokedexStore((s) => s.nameSearch)
    const selectedTypes = usePokedexStore((s) => s.selectedTypes)
    const selectedGenerations = usePokedexStore((s) => s.selectedGenerations)
    const includeForms = usePokedexStore((s) => s.includeForms)
    const sortKey = usePokedexStore((s) => s.sortKey)
    const sortDir = usePokedexStore((s) => s.sortDir)
    const setNameSearch = usePokedexStore((s) => s.setNameSearch)
    const setGenerations = usePokedexStore((s) => s.setGenerations)
    const toggleType = usePokedexStore((s) => s.toggleType)
    const clearTypes = usePokedexStore((s) => s.clearTypes)
    const setIncludeForms = usePokedexStore((s) => s.setIncludeForms)
    const setSortKey = usePokedexStore((s) => s.setSortKey)
    const setSortDir = usePokedexStore((s) => s.setSortDir)

    return (
        <section
            id="pokedex-filter-bar"
            aria-label={t("filters")}
            className="sticky top-21.5 z-30 -mx-4 flex flex-col gap-2 border-b border-border bg-body px-4 py-2 sm:-mx-6 sm:px-6 lg:top-12"
        >
            <span className="flex flex-wrap items-end gap-2">
                <span ref={searchRef} className="order-1 min-w-0 flex-1">
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
                <span className="order-2 md:hidden">
                    <Button
                        icon={<Icon icon="funnel" />}
                        label={activeFilterCount > 0 ? `${t("filters")} ${activeFilterCount}` : t("filters")}
                        tooltip={activeFilterCount > 0 ? t("activeFilters", { n: activeFilterCount }) : undefined}
                        onClick={onToggleOpen}
                        aria-expanded={open}
                        aria-controls="pokedex-filter-more"
                    />
                </span>
                <span
                    id="pokedex-filter-more"
                    className={`${open ? "flex" : "hidden"} order-3 w-full items-end gap-2 overflow-x-auto *:shrink-0 md:order-2 md:flex md:w-auto md:overflow-visible`}
                >
                    <MultiSelector
                        label={t("generation")}
                        isLabelHidden
                        placeholder={t("generation")}
                        width={160}
                        options={GENERATIONS.map((g) => ({ value: String(g.id), label: generationName(g.id, lang) }))}
                        value={selectedGenerations.map(String)}
                        onChange={(v) => setGenerations(v.map(Number))}
                        triggerDisplay="count"
                        formatValue={(items) =>
                            items.length === 1 ? items[0].label : `${t("generation")} ${items.length}`
                        }
                    />
                    <MoveFilter key={moveFilterKey} compact />
                    <Selector
                        label={t("sortBy")}
                        isLabelHidden
                        width={160}
                        value={sortKey}
                        onChange={(v) => setSortKey(v as PokedexSortKey)}
                        options={SORT_OPTIONS.map((o) => ({ value: o.value, label: sortLabel(o.label, lang, t) }))}
                    />
                    <SegmentedControl label={t("toggleSortDir")} value={sortDir} onChange={(v) => setSortDir(v as SortDir)}>
                        <SegmentedControlItem value="asc" label={t("asc")} icon={<Icon icon="arrowUp" size="sm" />} />
                        <SegmentedControlItem value="desc" label={t("desc")} icon={<Icon icon="arrowDown" size="sm" />} />
                    </SegmentedControl>
                </span>
            </span>

            <span
                role="group"
                aria-labelledby="pokedex-type-label"
                className={`${open ? "flex" : "hidden"} items-center gap-2 overflow-x-auto *:shrink-0 md:flex`}
            >
                <Text type="label" id="pokedex-type-label">
                    {t("type")}
                </Text>
                <Text type="supporting">{t("typeHint", { n: MAX_SELECTED_TYPES })}</Text>
                {TYPES.map((type) => (
                    <ToggleButton
                        key={type.name}
                        size="sm"
                        isIconOnly
                        icon={<TypeIconDot type={type.name} />}
                        label={typeName(type.name, lang)}
                        isPressed={selectedTypes.includes(type.name)}
                        onPressedChange={() => toggleType(type.name)}
                    />
                ))}
                {selectedTypes.length > 0 && (
                    <Button size="sm" variant="ghost" label={t("clearSelection")} onClick={clearTypes} />
                )}
                <span className="ms-auto">
                    <Switch
                        label={t("includeForms")}
                        labelTooltip={t("includeFormsHint")}
                        value={includeForms}
                        onChange={(v) => setIncludeForms(v)}
                    />
                </span>
            </span>
        </section>
    )
}
