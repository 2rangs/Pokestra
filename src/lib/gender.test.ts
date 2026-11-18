import pokemonJson from "../data/pokemon.json"
import { expect, test } from "vitest"
import { parseSex } from "./gender"

test("parseSex f only for exactly f", () => {
    expect(parseSex("f")).toBe("f")
    expect(parseSex("F")).toBe("m")
    expect(parseSex("female")).toBe("m")
    expect(parseSex("m")).toBe("m")
    expect(parseSex("")).toBe("m")
    expect(parseSex(null)).toBe("m")
})

test("genderDiff is never true for forms (id > 10000)", () => {
    const list = pokemonJson as { id: number; genderDiff: boolean }[]
    expect(list.filter((p) => p.id > 10000 && p.genderDiff)).toEqual([])
    expect(list.filter((p) => p.genderDiff).length).toBeGreaterThan(100)
})
