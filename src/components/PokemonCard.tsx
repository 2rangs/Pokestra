import { memo } from "react"
import { ClickableCard } from "@astryxdesign/core/ClickableCard"
import { Text } from "@astryxdesign/core/Text"
import { VStack } from "@astryxdesign/core/VStack"
import { HStack } from "@astryxdesign/core/HStack"
import { useLang, useT } from "../i18n"
import { pokedexMessages } from "../i18n/messages/pokedex"
import {
    type DexPokemon,
    formLabel as getFormLabel,
    getSpeciesId,
    pokemonName,
} from "../lib/dex"
import { pokemonImageCandidates } from "../lib/images"
import { PokeImage } from "./ui/PokeImage"
import { TypeChip } from "./ui/TypeChip"
import { GenderDiffMark } from "./pokedex/GenderDiffMark"
import { dexNumber } from "./pokedex/format"

type Props = {
    pokemon: DexPokemon
    /** 정렬 기준 값(능력치·종족값 합계)을 카드 하단에 강조 (없으면 표시하지 않음 — 설명 없는 숫자는 상세/표에서) */
    highlightLabel?: string
    highlightValue?: number
}

/** 포켓몬 이미지: 표시 크기에 맞춰 도트/공식 일러스트 순서로 시도 */
export function PokemonImage({ p, className, size }: { p: DexPokemon; className: string; size: number }) {
    return <PokeImage sources={pokemonImageCandidates(p.id, size, { sprite: p.sprite })} alt="" size={size} className={`${className} rounded-md`} />
}

function PokemonCardImpl({ pokemon: p, highlightLabel, highlightValue }: Props) {
    const lang = useLang()
    const t = useT(pokedexMessages)
    const formLabel = getFormLabel(p, lang)
    const name = pokemonName(p, lang)
    const no = dexNumber(getSpeciesId(p))

    const highlight =
        highlightLabel !== undefined && highlightValue !== undefined ? (
            <Text type="supporting" textWrap="nowrap">
                {highlightLabel}{" "}
                <Text type="supporting" color="primary" weight="semibold" hasTabularNumbers>
                    {highlightValue}
                </Text>
            </Text>
        ) : null

    // 카드: 번호(+정렬 값) → 그림 → 이름(폼) → 타입 한 줄. 꾸밈 칸 없이 정보만, 줄마다 한 가지.
    // 좁은 화면(sm 미만)에서는 게임 도감 목록처럼 한 줄: 번호 · 박스 아이콘 · 이름 · 타입.
    // 같은 요소를 CSS 로만 바꿔서 무한 스크롤·포커스 이동(a[href] 순서)이 그대로 동작한다.
    return (
        <ClickableCard href={`/pokemon/${p.id}`} label={`${no} ${name}${formLabel ? ` (${formLabel})` : ""}`} padding={2} className="h-full">
            <VStack gap={1.5} hAlign="stretch" className="max-sm:flex-row max-sm:items-center max-sm:gap-2">
                <HStack gap={1} vAlign="center" justify="between" className="max-sm:w-15 max-sm:shrink-0 max-sm:flex-col max-sm:items-start max-sm:gap-0">
                    <Text type="supporting" hasTabularNumbers textWrap="nowrap">
                        {no}
                    </Text>
                    {highlight}
                </HStack>
                <HStack justify="center" vAlign="center" className="shrink-0">
                    <PokemonImage p={p} size={40} className="size-10 sm:hidden" />
                    <PokemonImage p={p} size={72} className="h-18 w-18 max-sm:hidden" />
                </HStack>
                <VStack gap={0} className="min-w-0 max-sm:flex-1">
                    <HStack gap={1} vAlign="center">
                        <Text weight="semibold" maxLines={1}>
                            {name}
                        </Text>
                        {p.genderDiff && <GenderDiffMark t={t} />}
                    </HStack>
                    {formLabel && (
                        <Text type="supporting" maxLines={1}>
                            {formLabel}
                        </Text>
                    )}
                </VStack>
                <HStack gap={1} vAlign="center" className="max-sm:shrink-0">
                    {p.types.map((type) => (
                        <TypeChip key={type} type={type} size="sm" />
                    ))}
                </HStack>
            </VStack>
        </ClickableCard>
    )
}

export const PokemonCard = memo(PokemonCardImpl)
