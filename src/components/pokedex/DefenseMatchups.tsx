/**
 * 방어 상성: 배수마다 한 줄. 왼쪽 고정 폭 칸에 배수 칩(의미 색) + 이름, 오른쪽에 공격 타입 칩.
 * 상성은 세대와 상관없이 현재 타입·현재 상성표 기준.
 */
import { useMemo } from "react"
import { HStack } from "@astryxdesign/core/HStack"
import { Text } from "@astryxdesign/core/Text"
import { VStack } from "@astryxdesign/core/VStack"
import { MultiplierChip, TypeChip } from "../ui/TypeChip"
import type { TFunction } from "../../i18n"
import type { PokedexKey } from "../../i18n/messages/pokedex"

const TYPE_CHART: Record<string, Record<string, number>> = {
    normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
    fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
    water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
    ice:      { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
    fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
    poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
    ground:   { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
    flying:   { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
    bug:      { fire: 0.5, grass: 2, fighting: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
    rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
    dragon:   { dragon: 2, steel: 0.5, fairy: 0 },
    dark:     { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
    steel:    { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
    fairy:    { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
}

/** 공격 타입 → 배율 (1배 제외) */
function computeDefense(types: readonly string[]): [string, number][] {
    const out: [string, number][] = []
    for (const atk of Object.keys(TYPE_CHART)) {
        let m = 1
        for (const def of types) m *= TYPE_CHART[atk]?.[def] ?? 1
        if (m !== 1) out.push([atk, m])
    }
    return out
}

/** 배율 묶음 (큰 배율부터) */
const MULTIPLIER_GROUPS: { mult: number; label: PokedexKey }[] = [
    { mult: 4, label: "weakTo" },
    { mult: 2, label: "weakTo" },
    { mult: 0.5, label: "resists" },
    { mult: 0.25, label: "resists" },
    { mult: 0, label: "immuneTo" },
]

export function DefenseMatchups({ types, t }: { types: readonly string[]; t: TFunction<PokedexKey> }) {
    const matchups = useMemo(() => computeDefense(types), [types])
    if (matchups.length === 0) return <Text color="secondary">{t("noMatchups")}</Text>
    return (
        <VStack as="dl" gap={0} className="divide-y divide-border">
            {MULTIPLIER_GROUPS.map(({ mult, label }) => {
                const list = matchups.filter(([, m]) => m === mult)
                if (list.length === 0) return null
                return (
                    <HStack key={mult} gap={3} vAlign="center" className="py-2 first:pt-0 last:pb-0">
                        <HStack as="dt" gap={2} vAlign="center" className="w-24 shrink-0">
                            <MultiplierChip multiplier={mult} />
                            <Text type="label" color="secondary">
                                {t(label)}
                            </Text>
                        </HStack>
                        <HStack as="dd" gap={1.5} wrap="wrap" className="min-w-0">
                            {list.map(([type]) => (
                                <TypeChip key={type} type={type} size="sm" />
                            ))}
                        </HStack>
                    </HStack>
                )
            })}
        </VStack>
    )
}
