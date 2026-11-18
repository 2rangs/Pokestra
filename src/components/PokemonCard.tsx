import { memo } from "react"
import { ClickableCard } from "@astryxdesign/core/ClickableCard"
import { Text } from "@astryxdesign/core/Text"
import { VStack } from "@astryxdesign/core/VStack"
import { HStack } from "@astryxdesign/core/HStack"
import { type Lang, useLang, useT } from "../i18n"
import { pokedexMessages } from "../i18n/messages/pokedex"
import {
    type DexPokemon,
    baseStatTotal,
    formLabel as getFormLabel,
    getSpeciesId,
    pokemonName,
} from "../lib/dex"
import { pokemonImageCandidates } from "../lib/images"
import { PokeImage } from "./ui/PokeImage"
import { TypeTag } from "./ui/shared"
import { dexNumber } from "./pokedex/format"

type Props = {
    pokemon: DexPokemon
    /** 정렬 기준 능력치 등 카드 하단에 강조할 값 (없으면 종족값 합계) */
    highlight?: { label: string; value: number }
}

/** 보조 이름: 한국어/일본어 화면에서는 영어 이름, 영어 화면에서는 일본어 이름 */
function secondaryName(p: DexPokemon, lang: Lang): string {
    return (lang === "en" ? p.nameJa : p.nameEn) ?? ""
}

/** 포켓몬 이미지: 표시 크기에 맞춰 도트/공식 일러스트 순서로 시도 */
export function PokemonImage({ p, className, size }: { p: DexPokemon; className: string; size: number }) {
    return <PokeImage sources={pokemonImageCandidates(p.id, size, { sprite: p.sprite })} alt="" size={size} className={`${className} rounded-md`} />
}

function PokemonCardImpl({ pokemon: p, highlight }: Props) {
    const lang = useLang()
    const t = useT(pokedexMessages)
    const formLabel = getFormLabel(p, lang)
    const name = pokemonName(p, lang)
    const no = dexNumber(getSpeciesId(p))
    const stat = highlight ?? { label: t("total"), value: baseStatTotal(p) }
    const sub = secondaryName(p, lang)

    return (
        <ClickableCard href={`/pokemon/${p.id}`} label={`${no} ${name}${formLabel ? ` (${formLabel})` : ""}`} padding={3} className="h-full">
            <VStack gap={2} hAlign="stretch">
                <HStack justify="between" vAlign="center" gap={2}>
                    <Text type="supporting" hasTabularNumbers>
                        {no}
                    </Text>
                    <Text type="supporting" hasTabularNumbers>
                        {stat.label} <Text type="supporting" color="primary" weight="semibold" hasTabularNumbers>{stat.value}</Text>
                    </Text>
                </HStack>
                <span className="flex justify-center">
                    <PokemonImage p={p} size={96} className="h-20 w-20 sm:h-24 sm:w-24" />
                </span>
                <VStack gap={0.5}>
                    <Text weight="semibold" maxLines={1}>
                        {name}
                    </Text>
                    <Text type="supporting" maxLines={1}>
                        {formLabel ?? <span lang={lang === "en" ? "ja" : "en"}>{sub || " "}</span>}
                    </Text>
                </VStack>
                <HStack gap={1} wrap="wrap">
                    {p.types.map((type) => (
                        <TypeTag key={type} type={type} size="xs" />
                    ))}
                </HStack>
            </VStack>
        </ClickableCard>
    )
}

export const PokemonCard = memo(PokemonCardImpl)
