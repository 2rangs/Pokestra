import { memo } from "react"
import { ClickableCard } from "@astryxdesign/core/ClickableCard"
import { Text } from "@astryxdesign/core/Text"
import { VStack } from "@astryxdesign/core/VStack"
import { HStack } from "@astryxdesign/core/HStack"
import { useLang } from "../i18n"
import {
    type DexPokemon,
    formLabel as getFormLabel,
    getSpeciesId,
    pokemonName,
} from "../lib/dex"
import { pokemonImageCandidates } from "../lib/images"
import { PokeImage } from "./ui/PokeImage"
import { TypeChip } from "./ui/TypeChip"
import { dexNumber } from "./pokedex/format"

type Props = {
    pokemon: DexPokemon
    /** 정렬 기준 값(능력치·종족값 합계)을 카드 하단에 강조 (없으면 표시하지 않음 — 설명 없는 숫자는 상세/표에서) */
    highlightLabel?: string
    highlightValue?: number
    /** 좁은 화면에서도 카드 모양 유지 (홈의 가로 줄 등). 기본은 sm 미만에서 한 줄 행 */
    alwaysCard?: boolean
}

/** 포켓몬 이미지: 표시 크기에 맞춰 도트/공식 일러스트 순서로 시도 */
export function PokemonImage({ p, className, size }: { p: DexPokemon; className: string; size: number }) {
    return <PokeImage sources={pokemonImageCandidates(p.id, size, { sprite: p.sprite })} alt="" size={size} className={`${className} rounded-md`} />
}

function PokemonCardImpl({ pokemon: p, highlightLabel, highlightValue, alwaysCard = false }: Props) {
    /** 좁은 화면의 한 줄 행 배치용 클래스 (alwaysCard 면 쓰지 않는다) */
    const row = (cls: string) => (alwaysCard ? "" : cls)
    const lang = useLang()
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

    // 데스크톱 카드(갤러리): 옅은 판 위의 큰 그림 → 번호(+정렬 값) → 이름 → 타입. 왼쪽 정렬, 줄마다 한 가지.
    // 좁은 화면(sm 미만): 게임 도감 목록처럼 한 줄 — 박스 아이콘 · 번호/이름 · 타입.
    // 같은 요소를 CSS 로만 바꿔서 무한 스크롤·포커스 이동(a[href] 순서)이 그대로 동작한다.
    return (
        <ClickableCard href={`/pokemon/${p.id}`} label={`${no} ${name}${formLabel ? ` (${formLabel})` : ""}`} padding={3} className="h-full">
            <VStack gap={3} hAlign="stretch" className={row("max-sm:flex-row max-sm:items-center max-sm:gap-3")}>
                <HStack justify="center" vAlign="center" className={`shrink-0 rounded-lg bg-muted p-2 ${row("max-sm:bg-transparent max-sm:p-0")}`}>
                    {!alwaysCard && <PokemonImage p={p} size={40} className="size-10 sm:hidden" />}
                    <PokemonImage p={p} size={128} className={`size-32 ${row("max-sm:hidden")}`} />
                </HStack>
                <VStack gap={0.5} className={`min-w-0 ${row("max-sm:flex-1")}`}>
                    <HStack gap={2} vAlign="center" justify="between">
                        <Text type="supporting" hasTabularNumbers textWrap="nowrap">
                            {no}
                        </Text>
                        {highlight}
                    </HStack>
                    <HStack gap={1} vAlign="center">
                        <Text type="large" weight="bold" maxLines={1}>
                            {name}
                        </Text>
                    </HStack>
                    {formLabel && (
                        <Text type="supporting" maxLines={1}>
                            {formLabel}
                        </Text>
                    )}
                </VStack>
                <HStack gap={1} vAlign="center" wrap="wrap" className={row("max-sm:shrink-0 max-sm:flex-nowrap")}>
                    {p.types.map((type) => (
                        <TypeChip key={type} type={type} size="sm" />
                    ))}
                </HStack>
            </VStack>
        </ClickableCard>
    )
}

export const PokemonCard = memo(PokemonCardImpl)
