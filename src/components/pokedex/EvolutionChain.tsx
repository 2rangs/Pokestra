import { Fragment } from "react"
import { Text } from "@astryxdesign/core/Text"
import { ClickableCard } from "@astryxdesign/core/ClickableCard"
import { Card } from "@astryxdesign/core/Card"
import { VStack } from "@astryxdesign/core/VStack"
import { HStack } from "@astryxdesign/core/HStack"
import { Divider } from "@astryxdesign/core/Divider"
import { Grid } from "@astryxdesign/core/Grid"
import { getIdFromUrl } from "../../common/utils"
import type { EvolutionChainLink, EvolutionDetail } from "../../hooks/usePokemon"
import type { Lang, TFunction } from "../../i18n"
import type { PokedexKey } from "../../i18n/messages/pokedex"
import { itemName } from "../../lib/battle"
import { pokemonImageCandidates } from "../../lib/images"
import { PokeImage } from "../ui/PokeImage"
import { findDexPokemonByName, getDexPokemon, moveName, pokemonName, titleCaseSlug, typeName } from "../../lib/dex"
import { dexNumber } from "./format"

type T = TFunction<PokedexKey>

/** 진화 카드 폭 (px): 휴대폰에서도 3단계가 가로 한 줄(넘치면 가로 스크롤) */
const CARD_W = 104

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
            <PokeImage sources={pokemonImageCandidates(id, 64, { sprite: p?.sprite })} alt="" size={64} className="h-16 w-16" />
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
            <ClickableCard href={`/pokemon/${id}`} label={`${dexNumber(id)} ${name}`} padding={2} width={CARD_W}>
                {body}
            </ClickableCard>
        )
    }
    return (
        <span aria-current={current ? "page" : undefined} className="block">
            <Card padding={2} width={CARD_W} variant={current ? "muted" : "default"}>
                {body}
            </Card>
        </span>
    )
}

/** 진화 단계 사이: 가는 선 위에 조건. 남는 폭은 선이 나눠 가져 줄을 채운다 */
function Connector({ conditions }: { conditions: string[] }) {
    return (
        <VStack gap={1} hAlign="stretch" className="min-w-20 flex-1 px-1 text-center">
            <Divider />
            {conditions.map((c) => (
                <Text key={c} type="supporting">
                    {c}
                </Text>
            ))}
        </VStack>
    )
}

/** 갈래가 없는 진화(대부분)면 단계 목록, 갈래가 있으면 null */
function linearPath(link: EvolutionChainLink): EvolutionChainLink[] | null {
    const out = [link]
    let cur = link
    while (cur.evolves_to.length === 1) {
        cur = cur.evolves_to[0]
        out.push(cur)
    }
    return cur.evolves_to.length === 0 ? out : null
}

/** 진화 트리: 항상 가로(왼쪽 → 오른쪽). 한 줄 진화는 연결선이 남는 폭을 똑같이 나누고, 갈래(이브이 등)는 세로로 쌓는다 */
export function EvolutionTree({ link, currentSpeciesId, lang, t, isRoot = true }: { link: EvolutionChainLink; currentSpeciesId: number | undefined; lang: Lang; t: T; isRoot?: boolean }) {
    const path = isRoot ? linearPath(link) : null
    // 한 단계에서 여러 갈래로 끝나는 진화(이브이 등): 갈래를 줄바꿈 격자로 (조건은 카드 위)
    const fan = link.evolves_to.length > 1 && link.evolves_to.every((c) => c.evolves_to.length === 0)
    if (fan) {
        return (
            <HStack gap={3} vAlign="center" className={isRoot ? "w-full min-w-max lg:min-w-0" : "flex-1"}>
                <EvoNode link={link} currentSpeciesId={currentSpeciesId} lang={lang} />
                <Grid columns={{ minWidth: CARD_W, repeat: "fill" }} gap={3} className="min-w-80 flex-1 border-s border-border ps-3">
                    {link.evolves_to.map((child) => (
                        <VStack key={child.species.name} gap={1} hAlign="center" justify="end">
                            <Text type="supporting" justify="center" maxLines={2}>
                                {evoConditions(child.evolution_details[0], lang, t).join(" · ")}
                            </Text>
                            <EvoNode link={child} currentSpeciesId={currentSpeciesId} lang={lang} />
                        </VStack>
                    ))}
                </Grid>
            </HStack>
        )
    }
    if (path) {
        return (
            <HStack vAlign="center" className="w-full min-w-max">
                {path.map((step, i) => (
                    <Fragment key={step.species.name}>
                        {i > 0 && <Connector conditions={evoConditions(step.evolution_details[0], lang, t)} />}
                        <EvoNode link={step} currentSpeciesId={currentSpeciesId} lang={lang} />
                    </Fragment>
                ))}
            </HStack>
        )
    }
    return (
        <HStack vAlign="center" className={isRoot ? "w-full min-w-max" : "flex-1"}>
            <EvoNode link={link} currentSpeciesId={currentSpeciesId} lang={lang} />
            {link.evolves_to.length > 0 && (
                <VStack gap={3} className="flex-1">
                    {link.evolves_to.map((child) => (
                        <HStack key={child.species.name} vAlign="center">
                            <Connector conditions={evoConditions(child.evolution_details[0], lang, t)} />
                            <EvolutionTree link={child} currentSpeciesId={currentSpeciesId} lang={lang} t={t} isRoot={false} />
                        </HStack>
                    ))}
                </VStack>
            )}
        </HStack>
    )
}
