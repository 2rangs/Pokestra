import { expect, test } from "vitest"
import { usePokedexStore } from "./pokedexStore"

test("setGenerations sorts, dedupes and resets page", () => {
    usePokedexStore.getState().setPage(4)
    usePokedexStore.getState().setGenerations([3, 1, 3])
    expect(usePokedexStore.getState().selectedGenerations).toEqual([1, 3])
    expect(usePokedexStore.getState().page).toBe(1)
})

test("setGenerations([]) clears", () => {
    usePokedexStore.getState().setGenerations([])
    expect(usePokedexStore.getState().selectedGenerations).toEqual([])
})
