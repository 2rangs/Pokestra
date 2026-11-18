import { expect, test } from "vitest"
import type { PokemonDetail } from "../hooks/usePokemon"
import clefairyJson from "./__fixtures__/clefairy.json"
import pikachuJson from "./__fixtures__/pikachu.json"
import { abilitiesAt, clampGen, cryAt, femaleArtAt, genNumber, spriteAt, statsAt, typesAt } from "./generation"

const f = clefairyJson as unknown as PokemonDetail
const p = pikachuJson as unknown as PokemonDetail

const stat = (rows: ReturnType<typeof statsAt>, key: string) => rows.find((r) => r.key === key)

test("genNumber", () => expect(genNumber({ name: "generation-vi" })).toBe(6))

test("typesAt gen5 is normal, changed in 6", () =>
    expect(typesAt(f, 5)).toEqual({ value: ["normal"], changedIn: 6 }))
test("typesAt gen6 is fairy, unchanged", () =>
    expect(typesAt(f, 6)).toEqual({ value: ["fairy"], changedIn: null }))

test("abilitiesAt gen2 is null", () => expect(abilitiesAt(f, 2)).toBeNull())
test("abilitiesAt gen3 has no hidden and no slot 2", () => {
    const r = abilitiesAt(f, 3)!
    expect(r.value.every((a) => !a.hidden)).toBe(true)
    expect(r.value).toHaveLength(1)
    expect(r.value[0].name).toBe("cute-charm")
    expect(r.changedIn).toBe(4)
})
test("abilitiesAt gen9 matches current", () => {
    const r = abilitiesAt(f, 9)!
    expect(r.changedIn).toBeNull()
    expect(r.value).toContainEqual({ name: "friend-guard", hidden: true })
    expect(r.value).toHaveLength(3)
})

test("statsAt gen1 uses special", () => {
    const rows = statsAt(f, 1)
    expect(rows.map((r) => r.key)).toEqual(["hp", "attack", "defense", "special", "speed"])
    expect(stat(rows, "special")!.value).toBe(60)
})
test("statsAt gen5 pikachu", () => {
    const rows = statsAt(p, 5)
    expect(stat(rows, "defense")).toMatchObject({ value: 30, changedIn: 6 })
    expect(stat(rows, "spDef")).toMatchObject({ value: 40, changedIn: 6 })
    expect(stat(rows, "speed")).toMatchObject({ value: 90, changedIn: null })
})
test("statsAt gen1 pikachu takes later entry per stat", () => {
    const rows = statsAt(p, 1)
    expect(stat(rows, "defense")!.value).toBe(30)
    expect(stat(rows, "special")!.value).toBe(50)
})

test("spriteAt skips icons", () =>
    expect(spriteAt(f.sprites, 5)).toContain("generation-v/black-white/"))
test("spriteAt empty versions → null", () =>
    expect(spriteAt({ front_default: null, versions: {} }, 3)).toBeNull())

test("cryAt legacy first up to gen5", () => {
    expect(cryAt(f.cries, 5).primary).toBe(f.cries!.legacy)
    expect(cryAt(f.cries, 6).primary).toBe(f.cries!.latest)
})
test("cryAt legacy null → latest", () =>
    expect(cryAt({ latest: "x", legacy: null }, 1)).toEqual({ primary: "x", legacy: null, latest: "x" }))

test("clampGen", () => {
    expect(clampGen(3, 9)).toBeNull()
    expect(clampGen(9, 1)).toBeNull()
    expect(clampGen(12, 1)).toBeNull()
    expect(clampGen(5, 1)).toBe(5)
})

test("statsAt gen1 special comes from past_stats, not current special-attack", () => {
    const d = {
        stats: [
            { base_stat: 40, stat: { name: "hp" } },
            { base_stat: 50, stat: { name: "attack" } },
            { base_stat: 50, stat: { name: "defense" } },
            { base_stat: 100, stat: { name: "special-attack" } },
            { base_stat: 90, stat: { name: "special-defense" } },
            { base_stat: 60, stat: { name: "speed" } },
        ],
        past_stats: [
            {
                generation: { name: "generation-i" },
                stats: [
                    { base_stat: 77, stat: { name: "special" } },
                ],
            },
        ],
    } as unknown as PokemonDetail
    expect(stat(statsAt(d, 1), "special")!.value).toBe(77)
})

test("spriteAt female gen4 → diamond-pearl/platinum female url", () =>
    expect(spriteAt(p.sprites, 4, { female: true })).toMatch(/generation-iv\/(diamond-pearl|platinum)\/(animated\/)?female\/25\.png$/))
test("spriteAt female gen3 falls back to male gen3", () =>
    expect(spriteAt(p.sprites, 3, { female: true })).toBe(spriteAt(p.sprites, 3)))
test("spriteAt female:false equals male", () =>
    expect(spriteAt(p.sprites, 4, { female: false })).toBe(spriteAt(p.sprites, 4)))
test("femaleArtAt returns home female", () =>
    expect(femaleArtAt(p.sprites)).toBe(
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/female/25.png",
    ))
test("femaleArtAt falls back to front_female then null", () => {
    expect(femaleArtAt({ front_default: "m", front_female: "f" })).toBe("f")
    expect(femaleArtAt({ front_default: "m" })).toBeNull()
})
