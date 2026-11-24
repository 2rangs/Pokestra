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
import { TYPE_COLOR_CLASSES } from "../lib/typeColorClasses"
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

/** 보조 이름: 한국어/일본어 화면에서는 영어 이름, 영어 화면에서는 일본어 이름 */
function secondaryName(p: DexPokemon, lang: Lang): string {
    return (lang === "en" ? p.nameJa : p.nameEn) ?? ""
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
    const sub = secondaryName(p, lang)
    // 이미지 칸: 주 타입의 아주 옅은 면 (pokestra 테마 토큰)
    const typeSurface = TYPE_COLOR_CLASSES[p.types[0]]?.subtle ?? "bg-muted"

    // 좁은 화면(sm 미만)에서는 게임 도감 목록처럼 한 줄: 번호 · 박스 아이콘 · 이름 · 타입.
    // 같은 요소를 CSS 로만 바꿔서 무한 스크롤·포커스 이동(a[href] 순서)이 그대로 동작한다.
    return (
        <ClickableCard href={`/pokemon/${p.id}`} label={`${no} ${name}${formLabel ? ` (${formLabel})` : ""}`} padding={2} className="h-full">
            <VStack gap={1} hAlign="stretch" className="max-sm:flex-row max-sm:items-center max-sm:gap-2">
                <Text type="supporting" hasTabularNumbers textWrap="nowrap" className="max-sm:w-15 max-sm:shrink-0">
                    {no}
                </Text>
                <HStack justify="center" vAlign="center" className={`shrink-0 rounded-md ${typeSurface}`}>
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
                    <Text type="supporting" maxLines={1}>
                        {formLabel ?? <span lang={lang === "en" ? "ja" : "en"}>{sub || " "}</span>}
                    </Text>
                </VStack>
                <HStack gap={1} wrap="wrap" vAlign="center" className="max-sm:shrink-0 max-sm:flex-col max-sm:items-end max-sm:gap-0.5">
                    {p.types.map((type) => (
                        <TypeChip key={type} type={type} size="sm" />
                    ))}
                    {highlightLabel !== undefined && highlightValue !== undefined && (
                        <Text type="supporting" textWrap="nowrap" className="ms-auto">
                            {highlightLabel}{" "}
                            <Text type="supporting" color="primary" weight="semibold" hasTabularNumbers>
                                {highlightValue}
                            </Text>
                        </Text>
                    )}
                </HStack>
            </VStack>
        </ClickableCard>
    )
}

export const PokemonCard = memo(PokemonCardImpl)
