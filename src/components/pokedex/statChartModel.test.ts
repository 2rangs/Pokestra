import { describe, expect, test } from "vitest"
import { STAT_SCALE_MAX, buildStatData, compareTotals, exceedsScale, nextRowIndex, scaleFraction, statsDiffer } from "./statChartModel"

const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6)

describe("scale (fixed 0–200)", () => {
    test("domain", () => {
        expect(STAT_SCALE_MAX).toBe(200)
        expect(scaleFraction(0)).toBe(0)
        expect(scaleFraction(200)).toBe(1)
        close(scaleFraction(50), 0.25)
    })
    test("clamps out-of-range values", () => {
        expect(scaleFraction(-5)).toBe(0)
        expect(scaleFraction(255)).toBe(1)
        expect(scaleFraction(Number.NaN)).toBe(0)
    })
    test("exceedsScale marks values over 200", () => {
        expect(exceedsScale(200)).toBe(false)
        expect(exceedsScale(201)).toBe(true)
        expect(exceedsScale(255)).toBe(true)
        expect(exceedsScale(Number.NaN)).toBe(false)
    })
})

const current = [
    { key: "hp" as const, value: 70 },
    { key: "attack" as const, value: 45 },
    { key: "defense" as const, value: 48 },
    { key: "spAtk" as const, value: 60 },
    { key: "spDef" as const, value: 65 },
    { key: "speed" as const, value: 35 },
]
const gen1 = [
    { key: "hp" as const, value: 70 },
    { key: "attack" as const, value: 45 },
    { key: "defense" as const, value: 48 },
    { key: "special" as const, value: 60 },
    { key: "speed" as const, value: 35 },
]

describe("buildStatData", () => {
    test("keeps the given order (HP … Speed)", () => {
        expect(buildStatData(current, null).map((d) => d.key)).toEqual(["hp", "attack", "defense", "spAtk", "spDef", "speed"])
    })
    test("without a generation there is no comparison", () => {
        const d = buildStatData(current, null)
        expect(d.every((r) => r.current === null)).toBe(true)
        expect(statsDiffer(d)).toBe(false)
    })
    test("marks every row that ties for the highest value", () => {
        const d = buildStatData([{ key: "hp", value: 80 }, { key: "attack", value: 80 }, { key: "defense", value: 10 }], null)
        expect(d.map((r) => r.isTop)).toEqual([true, true, false])
    })
    test("all-zero stats have no highest row", () => {
        expect(buildStatData([{ key: "hp", value: 0 }], null)[0].isTop).toBe(false)
    })
    test("pairs each selected-gen value with the current value", () => {
        const sel = current.map((s) => (s.key === "spDef" ? { ...s, value: 85, changedIn: 6 } : { ...s, changedIn: null }))
        const d = buildStatData(sel, current)
        expect(d.find((r) => r.key === "spDef")).toMatchObject({ value: 85, current: 65, changedIn: 6 })
        expect(d.find((r) => r.key === "hp")).toMatchObject({ value: 70, current: 70, changedIn: null })
        expect(statsDiffer(d)).toBe(true)
    })
    test("gen 1 special compares with the current special attack", () => {
        const d = buildStatData(gen1, current)
        expect(d.find((r) => r.key === "special")?.current).toBe(60)
        expect(statsDiffer(d)).toBe(false)
    })
    test("a current value that is missing stays null", () => {
        expect(buildStatData([{ key: "hp", value: 10 }], [])[0].current).toBeNull()
    })
})

describe("compareTotals", () => {
    test("no generation → no comparison", () => {
        expect(compareTotals(buildStatData(current, null), null)).toEqual({ selected: 323, current: null, differs: false })
    })
    test("gen 1: per-axis equal but totals differ (one Special vs SpA+SpD)", () => {
        const d = buildStatData(gen1, current)
        expect(compareTotals(d, current)).toEqual({ selected: 258, current: 323, differs: true })
    })
    test("same totals do not differ", () => {
        expect(compareTotals(buildStatData(current, current), current).differs).toBe(false)
    })
})

describe("nextRowIndex (roving focus)", () => {
    test("arrows move and stop at the ends", () => {
        expect(nextRowIndex("ArrowDown", 0, 6)).toBe(1)
        expect(nextRowIndex("ArrowDown", 5, 6)).toBe(5)
        expect(nextRowIndex("ArrowUp", 0, 6)).toBe(0)
        expect(nextRowIndex("ArrowUp", 3, 6)).toBe(2)
    })
    test("Left / Right are left to the page (prev/next)", () => {
        expect(nextRowIndex("ArrowLeft", 3, 6)).toBeNull()
        expect(nextRowIndex("ArrowRight", 3, 6)).toBeNull()
        expect(nextRowIndex("ArrowRight", 5, 6)).toBeNull()
        expect(nextRowIndex("ArrowLeft", 0, 6)).toBeNull()
    })
    test("Home / End", () => {
        expect(nextRowIndex("Home", 4, 6)).toBe(0)
        expect(nextRowIndex("End", 0, 6)).toBe(5)
    })
    test("other keys are not handled", () => {
        expect(nextRowIndex("Enter", 0, 6)).toBeNull()
        expect(nextRowIndex("ArrowDown", 0, 0)).toBeNull()
    })
})
