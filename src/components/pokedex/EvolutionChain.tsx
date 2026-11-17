import { Text } from "@astryxdesign/core/Text"
import { ClickableCard } from "@astryxdesign/core/ClickableCard"
import { Card } from "@astryxdesign/core/Card"
import { VStack } from "@astryxdesign/core/VStack"
import { getIdFromUrl } from "../../common/utils"
import type { EvolutionChainLink, EvolutionDetail } from "../../hooks/usePokemon"
import type { Lang, TFunction } from "../../i18n"
import type { PokedexKey } from "../../i18n/messages/pokedex"
import { itemName } from "../../lib/battle"
import { findDexPokemonByName, getDexPokemon, moveName, officialArtworkUrl, pokemonName, titleCaseSlug, typeName } from "../../lib/dex"
import { dexNumber } from "./format"

type T = TFunction<PokedexKey>

function evoConditions(d: EvolutionDetail | undefined, lang: Lang, t: T): string[] {
    if (!d) return []
    const parts: string[] = []
    if (d.min_level) parts.push(t("evoLevel", { n: d.min_level }))
    if (d.trigger?.name === "trade") parts.push(t("evoTrade"))
    if (d.item) parts.push(itemName(d.item.name, lang))
    if (d.held_item) parts.push(t("evoHolding", { item: itemName(d.held_item.name, lang) }))
    if (d.min_happiness) parts.push(t("evoFriendship"))
    if (d.min_affection) parts.push(t("evoAffection"))
    if (d.known_move) parts.push(t("evoKnowsMove", { move: moveName(d.known_move.name, lang) }))
    if (d.known_move_type) parts.push(t("evoKnowsMoveType", { type: typeName(d.known_move_type.name, lang) }))
    if (d.time_of_day === "day") parts.push(t("evoDay"))
    if (d.time_of_day === "night") parts.push(t("evoNight"))
    if (d.time_of_day === "dusk") parts.push(t("evoDusk"))
    if (d.gender === 1) parts.push(t("evoFemale"))
    if (d.gender === 2) parts.push(t("evoMale"))
    if (d.location) parts.push(t("evoLocation"))
    if (d.trade_species) {
        const p = findDexPokemonByName(d.trade_species.name)
        parts.push(t("evoTradeFor", { name: p ? pokemonName(p, lang) : titleCaseSlug(d.trade_species.name) }))
    }
    if (d.needs_overworld_rain) parts.push(t("evoRain"))
    if (d.turn_upside_down) parts.push(t("evoUpsideDown"))
    if (parts.length === 0) parts.push(d.trigger?.name === "level-up" ? t("evoLevelUp") : t("evoSpecial"))
    return parts
}

function EvoNode({ link, currentSpeciesId, lang }: { link: EvolutionChainLink; currentSpeciesId: number | undefined; lang: Lang }) {
    const id = getIdFromUrl(link.species.url) ?? 0
    const p = getDexPokemon(id)
    const name = p ? pokemonName(p, lang) : titleCaseSlug(link.species.name)
    const current = id === currentSpeciesId
    const body = (
        <VStack gap={1} hAlign="center">
            <img src={officialArtworkUrl(id)} alt="" loading="lazy" width={64} height={64} className="h-16 w-16 object-contain" />
            <Text type="supporting" hasTabularNumbers>
                {dexNumber(id)}
            </Text>
            <Text weight={current ? "bold" : "medium"} maxLines={1}>
                {name}
            </Text>
        </VStack>
    )
    if (p && !current) {
        return (
            <ClickableCard href={`/pokemon/${id}`} label={`${dexNumber(id)} ${name}`} padding={2} width={120}>
                {body}
            </ClickableCard>
        )
    }
    return (
        <span aria-current={current ? "page" : undefined} className="block">
            <Card padding={2} width={120} variant={current ? "muted" : "default"}>
                {body}
            </Card>
        </span>
    )
}

/** 진화 단계: 도판 + 가는 선 위의 조건 */
function Connector({ conditions }: { conditions: string[] }) {
    return (
        <span className="flex w-28 shrink-0 flex-col items-center gap-1 py-2 text-center sm:py-0">
            <span aria-hidden className="h-6 w-px bg-border sm:h-px sm:w-full" />
            <span className="flex flex-col">
                {conditions.map((c) => (
                    <Text key={c} type="supporting">
                        {c}
                    </Text>
                ))}
            </span>
        </span>
    )
}

export function EvolutionTree({ link, currentSpeciesId, lang, t }: { link: EvolutionChainLink; currentSpeciesId: number | undefined; lang: Lang; t: T }) {
    return (
        <span className="flex flex-col items-center sm:flex-row sm:items-center">
            <EvoNode link={link} currentSpeciesId={currentSpeciesId} lang={lang} />
            {link.evolves_to.length > 0 && (
                <span className="flex flex-col items-center gap-3 sm:items-start">
                    {link.evolves_to.map((child) => (
                        <span key={child.species.name} className="flex flex-col items-center sm:flex-row">
                            <Connector conditions={evoConditions(child.evolution_details[0], lang, t)} />
                            <EvolutionTree link={child} currentSpeciesId={currentSpeciesId} lang={lang} t={t} />
                        </span>
                    ))}
                </span>
            )}
        </span>
    )
}
