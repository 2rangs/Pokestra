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
import { ROMAN } from "./format"

type T = TFunction<PokedexKey>



function SpriteItem({ label, src, size, pixelated }: { label: string; src: string; size: "sm" | "md" | "lg"; pixelated?: boolean }) {
    const box = size === "lg" ? "h-28 w-28" : size === "md" ? "h-24 w-24" : "h-18 w-18"
    return (
        <figure className="flex w-28 flex-col items-center gap-1.5">
            <span className={`${box} flex items-center justify-center rounded-lg border border-border bg-muted`}>
                <img src={src} alt={label} loading="lazy" className={`h-[88%] w-[88%] object-contain ${pixelated ? "[image-rendering:pixelated]" : ""}`} />
            </span>
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
                            <SpriteItem key={k} label={t(k)} src={src} size="md" pixelated />
                        ))}
                    </HStack>
                </Group>
            )}
            {extra.length > 0 && (
                <Group title={t("spritesArtwork")}>
                    <HStack gap={3} wrap="wrap">
                        {extra.map(([k, src]) => (
                            <SpriteItem key={k} label={t(k)} src={src} size="lg" />
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
                                        <SpriteItem key={x.label} label={x.label} src={x.src} size="sm" pixelated />
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
