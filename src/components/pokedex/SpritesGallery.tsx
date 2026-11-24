import type { ReactNode } from "react"
import { Card } from "@astryxdesign/core/Card"
import { EmptyState } from "@astryxdesign/core/EmptyState"
import { Heading } from "@astryxdesign/core/Heading"
import { HStack } from "@astryxdesign/core/HStack"
import { Text } from "@astryxdesign/core/Text"
import { VStack } from "@astryxdesign/core/VStack"
import type { PokemonSprites } from "../../hooks/usePokemon"
import type { Lang, TFunction } from "../../i18n"
import type { PokedexKey } from "../../i18n/messages/pokedex"
import { generationName, titleCaseSlug } from "../../lib/dex"
import { PokeImage } from "../ui/PokeImage"
import { PixelSprite } from "../ui/PixelSprite"
import { ROMAN } from "./format"

type T = TFunction<PokedexKey>



function SpriteItem({ label, src, pixelated }: { label: string; src: string; pixelated?: boolean }) {
    // 게임 도트는 원본 픽셀의 정수배로 크게, 일러스트(HOME·드림월드)는 같은 칸에 맞춰
    return (
        <figure className="flex w-48 flex-col items-center gap-1.5 max-sm:w-36">
            <HStack justify="center" vAlign="center" className="size-48 rounded-lg border border-border bg-muted max-sm:size-36">
                {pixelated ? (
                    <PixelSprite src={src} alt={label} className="max-sm:size-36" />
                ) : (
                    <PokeImage sources={[src]} alt={label} size={176} pixelated={false} className="size-44 max-sm:size-32" />
                )}
            </HStack>
            <figcaption className="text-center">
                <Text type="supporting">{label}</Text>
            </figcaption>
        </figure>
    )
}

/** URL 이 있는 항목만 */
function present(list: [PokedexKey, string | null | undefined][]): [PokedexKey, string][] {
    return list.flatMap(([k, src]) => (src ? [[k, src] as [PokedexKey, string]] : []))
}

function Group({ title, children }: { title: string; children: ReactNode }) {
    return (
        <Card>
            <VStack gap={4}>
                <Heading level={2}>{title}</Heading>
                {children}
            </VStack>
        </Card>
    )
}

export function SpritesGallery({ sprites, lang, t }: { sprites: PokemonSprites; lang: Lang; t: T }) {
    const main = present([
        ["spriteDefault", sprites.front_default],
        ["spriteBack", sprites.back_default],
        ["spriteShiny", sprites.front_shiny],
        ["spriteBackShiny", sprites.back_shiny],
        ["spriteFemale", sprites.front_female],
        ["spriteShinyFemale", sprites.front_shiny_female],
    ])

    const extra = present([
        ["spriteHome", sprites.other?.home?.front_default],
        ["spriteHomeShiny", sprites.other?.home?.front_shiny],
        ["spriteHomeFemale", sprites.other?.home?.front_female],
        ["spriteDreamWorld", sprites.other?.dream_world?.front_default],
    ])

    const gens: { gen: number; items: { label: string; src: string }[] }[] = []
    for (const [genKey, games] of Object.entries(sprites.versions ?? {})) {
        const gen = ROMAN[genKey.replace("generation-", "")] ?? 0
        const items: { label: string; src: string }[] = []
        for (const [game, data] of Object.entries(games)) {
            if (data?.front_default) items.push({ label: titleCaseSlug(game), src: data.front_default })
        }
        if (items.length) gens.push({ gen, items })
    }
    gens.sort((a, b) => a.gen - b.gen)

    if (!main.length && !extra.length && !gens.length) {
        return <EmptyState title={t("noSprites")} />
    }

    return (
        <VStack gap={4}>
            {main.length > 0 && (
                <Group title={t("spritesGame")}>
                    <HStack gap={3} wrap="wrap">
                        {main.map(([k, src]) => (
                            <SpriteItem key={k} label={t(k)} src={src} pixelated />
                        ))}
                    </HStack>
                </Group>
            )}
            {extra.length > 0 && (
                <Group title={t("spritesArtwork")}>
                    <HStack gap={3} wrap="wrap">
                        {extra.map(([k, src]) => (
                            <SpriteItem key={k} label={t(k)} src={src} />
                        ))}
                    </HStack>
                </Group>
            )}
            {gens.length > 0 && (
                <Group title={t("spritesGenerations")}>
                    <VStack gap={5}>
                        {gens.map(({ gen, items }) => (
                            <VStack key={gen} gap={2}>
                                <Heading level={3}>{gen ? generationName(gen, lang) : "-"}</Heading>
                                <HStack gap={3} wrap="wrap">
                                    {items.map((x) => (
                                        <SpriteItem key={x.label} label={x.label} src={x.src} pixelated />
                                    ))}
                                </HStack>
                            </VStack>
                        ))}
                    </VStack>
                </Group>
            )}
        </VStack>
    )
}
