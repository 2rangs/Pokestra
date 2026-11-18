import { memo } from "react"
import { ClickableCard } from "@astryxdesign/core/ClickableCard"
import { Text } from "@astryxdesign/core/Text"
import { VStack } from "@astryxdesign/core/VStack"
import { HStack } from "@astryxdesign/core/HStack"
import { type Lang, useLang, useT } from "../i18n"
import { pokedexMessages } from "../i18n/messages/pokedex"
import {
    type DexPokemon,
    formLabel as getFormLabel,
    getSpeciesId,
    pokemonName,
} from "../lib/dex"
import { pokemonImageCandidates } from "../lib/images"
import { PokeImage } from "./ui/PokeImage"
import { TypeTag } from "./ui/shared"
import { GenderDiffMark } from "./pokedex/GenderDiffMark"
import { dexNumber } from "./pokedex/format"

type Props = {
    pokemon: DexPokemon
    /** 정렬 기준 값(능력치·종족값 합계)을 카드 하단에 강조 (없으면 표시하지 않음 — 설명 없는 숫자는 상세/표에서) */
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
    const sub = secondaryName(p, lang)

    return (
        <ClickableCard href={`/pokemon/${p.id}`} label={`${no} ${name}${formLabel ? ` (${formLabel})` : ""}`} padding={2} className="h-full">
            <VStack gap={1} hAlign="stretch">
                <Text type="supporting" hasTabularNumbers textWrap="nowrap">
                    {no}
                </Text>
                <HStack justify="center">
                    <PokemonImage p={p} size={72} className="h-18 w-18" />
                </HStack>
                <VStack gap={0}>
                    <HStack gap={1} vAlign="center">
                        <Text weight="semibold" maxLines={1}>
                            {name}
                        </Text>
                        {p.genderDiff && <GenderDiffMark t={t} />}
                    </HStack>
                    <Text type="supporting" maxLines={1}>
                        {formLabel ?? <span lang={lang === "en" ? "ja" : "en"}>{sub || " "}</span>}
                    </Text>
                </VStack>
                <HStack gap={1} wrap="wrap" vAlign="center">
                    {p.types.map((type) => (
                        <TypeTag key={type} type={type} size="xs" />
                    ))}
                    {highlight && (
                        <Text type="supporting" textWrap="nowrap" className="ms-auto">
                            {highlight.label}{" "}
                            <Text type="supporting" color="primary" weight="semibold" hasTabularNumbers>
                                {highlight.value}
                            </Text>
                        </Text>
                    )}
                </HStack>
            </VStack>
        </ClickableCard>
    )
}

export const PokemonCard = memo(PokemonCardImpl)
