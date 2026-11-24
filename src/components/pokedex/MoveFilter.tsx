import { useEffect, useMemo } from "react"
import { Text } from "@astryxdesign/core/Text"
import { Typeahead } from "@astryxdesign/core/Typeahead"
import { TypeaheadItem } from "@astryxdesign/core/Typeahead"
import type { SearchSource, SearchableItem } from "@astryxdesign/core/Typeahead"
import { useLang, useT } from "../../i18n"
import { pokedexMessages } from "../../i18n/messages/pokedex"
import { type DexMove, MOVE_BY_NAME, damageClassName, moveName } from "../../lib/dex"
import { usePokedexStore } from "../../stores/pokedexStore"
import { TypeGlyph } from "../ui/TypeChip"
import { exactMove, findMoveSuggestions } from "./search"

type MoveItem = SearchableItem<DexMove>

/** 배울 수 있는 기술 필터 (모든 언어 이름으로 검색) */
export function MoveFilter({ compact }: { compact?: boolean }) {
    const lang = useLang()
    const t = useT(pokedexMessages)
    const moveSearch = usePokedexStore((s) => s.moveSearch)
    const selectedMove = usePokedexStore((s) => s.selectedMove)
    const setMoveSearch = usePokedexStore((s) => s.setMoveSearch)
    const setSelectedMove = usePokedexStore((s) => s.setSelectedMove)

    // 저장돼 있던 "고르지 않은 입력"은 입력칸에 되살릴 수 없으므로 확정하거나 비운다
    useEffect(() => {
        const s = usePokedexStore.getState()
        if (s.selectedMove || !s.moveSearch) return
        const exact = exactMove(s.moveSearch)
        if (exact) s.setSelectedMove(exact)
        else s.setMoveSearch("")
    }, [])

    const toItem = useMemo(
        () =>
            (m: DexMove): MoveItem => ({ id: m.name, label: moveName(m.name, lang), auxiliaryData: m }),
        [lang],
    )

    const source = useMemo<SearchSource<MoveItem>>(
        () => ({
            search: (q) => findMoveSuggestions(q).map(toItem),
            bootstrap: () => [],
        }),
        [toItem],
    )

    const selected = selectedMove ? MOVE_BY_NAME.get(selectedMove) : undefined
    const value = selected ? toItem(selected) : null

    const resolved = selectedMove ?? exactMove(moveSearch)
    const resolvedMove = resolved ? MOVE_BY_NAME.get(resolved) : undefined
    const hasSuggestions = !resolvedMove && moveSearch.trim() !== "" && findMoveSuggestions(moveSearch).length > 0

    return (
        <span className="flex flex-col gap-1">
            <Typeahead<MoveItem>
                label={t("learnableMove")}
                isLabelHidden={compact}
                width={compact ? 224 : undefined}
                status={
                    compact
                        ? resolvedMove
                            ? { type: "success", message: t("moveActive", { move: moveName(resolvedMove.name, lang) }) }
                            : moveSearch.trim()
                              ? { type: "warning", message: hasSuggestions ? t("movePick") : t("moveNoMatch") }
                              : undefined
                        : undefined
                }
                statusVariant={compact ? "tooltip" : undefined}
                placeholder={t("movePlaceholder")}
                searchSource={source}
                debounceMs={0}
                maxMenuItems={8}
                value={value}
                onChange={(item) => setSelectedMove(item?.id ?? null)}
                onChangeQuery={(q) => {
                    const s = usePokedexStore.getState()
                    if (q === s.moveSearch) return
                    // 선택 직후/편집 시작 때 들어오는 값은 선택을 유지한다
                    if (s.selectedMove && (q === "" || q === moveName(s.selectedMove, lang))) return
                    setMoveSearch(q)
                }}
                emptySearchText={t("moveNoMatch")}
                renderItem={(item) => (
                    <TypeaheadItem
                        item={item}
                        icon={item.auxiliaryData ? <TypeGlyph type={item.auxiliaryData.type} /> : undefined}
                        description={
                            item.auxiliaryData
                                ? [lang === "en" ? null : item.auxiliaryData.nameEn, damageClassName(item.auxiliaryData.damageClass, lang)]
                                      .filter(Boolean)
                                      .join(" · ")
                                : undefined
                        }
                    />
                )}
            />
            <span aria-live="polite" className={compact ? "sr-only" : undefined}>
                {resolvedMove ? (
                    <Text type="supporting">{t("moveActive", { move: moveName(resolvedMove.name, lang) })}</Text>
                ) : moveSearch.trim() ? (
                    <Text type="supporting">{hasSuggestions ? t("movePick") : t("moveNoMatch")}</Text>
                ) : null}
            </span>
        </span>
    )
}
