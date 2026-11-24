import type { NamedAPIResource, PokemonDetail, PokemonSprites } from "../hooks/usePokemon"
import { ROMAN } from "../components/pokedex/format"
import { API_STAT_KEY, type StatKey } from "./dex"

export const LATEST_GEN = 9

export type GenStatKey = StatKey | "special"

/** changedIn: 현재 값으로 바뀐 세대. 선택값이 현재와 같으면 null */
export interface Changed<T> {
    value: T
    changedIn: number | null
}

const ROMAN_BY_GEN: Record<number, string> = Object.fromEntries(Object.entries(ROMAN).map(([r, n]) => [n, r]))

/** "generation-vi" → 6 (알 수 없으면 0) */
export function genNumber(resource: { name: string }): number {
    return ROMAN[resource.name.replace("generation-", "")] ?? 0
}

/** 범위 밖 · debut 미만 · 최신 세대는 null(현재 값) */
export function clampGen(gen: number | null, debut: number): number | null {
    if (gen === null || !Number.isInteger(gen)) return null
    if (gen < debut || gen < 1 || gen >= LATEST_GEN) return null
    return gen
}

interface PastEntry {
    generation: NamedAPIResource
}

/** N >= gen 인 항목 중 N 이 가장 작은 것 */
function pickEntry<E extends PastEntry>(entries: readonly E[] | undefined, gen: number, accept: (e: E) => boolean = () => true) {
    let best: { entry: E; n: number } | null = null
    for (const entry of entries ?? []) {
        const n = genNumber(entry.generation)
        if (n >= gen && accept(entry) && (!best || n < best.n)) best = { entry, n }
    }
    return best
}

const sameList = (a: readonly unknown[], b: readonly unknown[]) => JSON.stringify(a) === JSON.stringify(b)

export function typesAt(d: PokemonDetail, gen: number): Changed<string[]> {
    const names = (types: { slot: number; type: { name: string } }[]) =>
        [...types].sort((a, b) => a.slot - b.slot).map((t) => t.type.name)
    const current = names(d.types)
    const hit = pickEntry(d.past_types, gen)
    if (!hit) return { value: current, changedIn: null }
    const value = names(hit.entry.types)
    return { value, changedIn: sameList(value, current) ? null : hit.n + 1 }
}

export function abilitiesAt(d: PokemonDetail, gen: number): Changed<{ name: string; hidden: boolean }[]> | null {
    if (gen <= 2) return null
    const noHidden = gen <= 4
    const slots = new Map<number, { name: string; hidden: boolean } | null>()
    for (const a of d.abilities) slots.set(a.slot, { name: a.ability.name, hidden: a.is_hidden })
    const current = [...slots.entries()].sort((a, b) => a[0] - b[0]).flatMap(([, v]) => (v ? [v] : []))
    const finish = (m: typeof slots) =>
        [...m.entries()]
            .sort((a, b) => a[0] - b[0])
            .flatMap(([, v]) => (v && !(noHidden && v.hidden) ? [v] : []))

    const slotNums = new Set<number>()
    for (const e of d.past_abilities ?? []) for (const a of e.abilities) slotNums.add(a.slot)
    let changedIn: number | null = null
    for (const slot of slotNums) {
        const hit = pickEntry(d.past_abilities, gen, (e) => e.abilities.some((a) => a.slot === slot))
        if (!hit) continue
        const a = hit.entry.abilities.find((x) => x.slot === slot)!
        slots.set(slot, a.ability ? { name: a.ability.name, hidden: a.is_hidden } : null)
        if (changedIn === null || hit.n + 1 < changedIn) changedIn = hit.n + 1
    }
    const value = finish(slots)
    const cmp = noHidden ? current.filter((a) => !a.hidden) : current
    return { value, changedIn: sameList(value, cmp) ? null : changedIn }
}

export function statsAt(d: PokemonDetail, gen: number): { key: GenStatKey; value: number; changedIn: number | null }[] {
    const current = new Map(d.stats.map((s) => [s.stat.name, s.base_stat]))
    const resolve = (name: string, fallback: string = name) => {
        const base = current.get(fallback) ?? 0
        const hit = pickEntry(d.past_stats, gen, (e) => e.stats.some((s) => s.stat.name === name))
        if (!hit) return { value: base, changedIn: null }
        const value = hit.entry.stats.find((s) => s.stat.name === name)!.base_stat
        return { value, changedIn: value === base ? null : hit.n + 1 }
    }
    const row = (key: GenStatKey, name: string, fallback?: string) => ({ key, ...resolve(name, fallback) })
    const out: { key: GenStatKey; value: number; changedIn: number | null }[] = []
    out.push(row("hp", "hp"), row("attack", "attack"), row("defense", "defense"))
    if (gen === 1) {
        out.push(row("special", "special", "special-attack"))
    } else {
        out.push(row(API_STAT_KEY["special-attack"], "special-attack"), row(API_STAT_KEY["special-defense"], "special-defense"))
    }
    out.push(row("speed", "speed"))
    return out
}

export function spriteAt(sprites: PokemonSprites, gen: number, opts?: { female?: boolean; shiny?: boolean }): string | null {
    const roman = ROMAN_BY_GEN[gen]
    const games = roman ? sprites.versions?.["generation-" + roman] : undefined
    if (!games) return null
    // 이로치: 그 세대 이로치 도트(1세대처럼 없으면 null → 이로치 일러스트로)
    const pick = (female: boolean) => {
        for (const [game, sprite] of Object.entries(games)) {
            if (game === "icons" || !sprite) continue
            const url = opts?.shiny ? (female ? sprite.front_shiny_female : sprite.front_shiny) : female ? sprite.front_female : sprite.front_default
            if (url) return url
        }
        return null
    }
    return (opts?.female ? pick(true) : null) ?? pick(false)
}

/** 암컷 일러스트(HOME → 기본 스프라이트 순). 없으면 null */
export function femaleArtAt(sprites: PokemonSprites, shiny = false): string | null {
    return shiny
        ? (sprites.other?.home?.front_shiny_female ?? sprites.front_shiny_female ?? null)
        : (sprites.other?.home?.front_female ?? sprites.front_female ?? null)
}

export function cryAt(
    cries: PokemonDetail["cries"],
    gen: number,
): { primary: string | null; legacy: string | null; latest: string | null } {
    const latest = cries?.latest ?? null
    const legacy = cries?.legacy ?? null
    return { primary: gen <= 5 ? (legacy ?? latest) : (latest ?? legacy), legacy, latest }
}
