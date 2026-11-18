import { describe, expect, test } from "vitest"
import {
    RADAR_RINGS,
    STAT_SCALE_MAX,
    buildStatData,
    radarOrder,
    radarPoints,
    ringPoints,
    scaleFraction,
    statsDiffer,
    toPointsAttr,
} from "./statChartModel"

const geom = { cx: 100, cy: 100, r: 80 }
const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6)

describe("scaleFraction", () => {
    test("fixed 0–255 scale", () => {
        expect(STAT_SCALE_MAX).toBe(255)
        expect(scaleFraction(0)).toBe(0)
        expect(scaleFraction(255)).toBe(1)
        close(scaleFraction(51), 0.2)
    })
    test("clamps out-of-range values", () => {
        expect(scaleFraction(-5)).toBe(0)
        expect(scaleFraction(300)).toBe(1)
        expect(scaleFraction(Number.NaN)).toBe(0)
    })
})

describe("radarPoints", () => {
    test("6 axes: first axis points straight up, clockwise every 60°", () => {
        const pts = radarPoints([255, 255, 255, 255, 255, 255], geom)
        expect(pts).toHaveLength(6)
        close(pts[0].x, 100)
        close(pts[0].y, 20)
        // 60° clockwise from top: right and up
        close(pts[1].x, 100 + 80 * Math.sin(Math.PI / 3))
        close(pts[1].y, 100 - 80 * Math.cos(Math.PI / 3))
        // opposite of the first axis
        close(pts[3].x, 100)
        close(pts[3].y, 180)
    })
    test("5 axes (gen 1 special) make a pentagon: 72° steps", () => {
        const pts = radarPoints([255, 255, 255, 255, 255], geom)
        expect(pts).toHaveLength(5)
        close(pts[1].x, 100 + 80 * Math.sin((2 * Math.PI) / 5))
        close(pts[1].y, 100 - 80 * Math.cos((2 * Math.PI) / 5))
    })
    test("radius is proportional to the value on the 0–255 scale", () => {
        const [top] = radarPoints([51, 0, 0, 0, 0, 0], geom)
        close(top.y, 100 - 80 * 0.2)
        const zero = radarPoints([0, 0, 0, 0, 0, 0], geom)
        for (const p of zero) {
            close(p.x, 100)
            close(p.y, 100)
        }
    })
    test("values past 255 stay on the outer ring", () => {
        const [top] = radarPoints([400, 0, 0, 0, 0, 0], geom)
        close(top.y, 20)
    })
})

describe("rings", () => {
    test("grid rings at 50/100/150/200/255", () => expect(RADAR_RINGS).toEqual([50, 100, 150, 200, 255]))
    test("ringPoints is a regular polygon at the ring value", () => {
        const pts = ringPoints(6, 255, geom)
        expect(pts).toHaveLength(6)
        for (const p of pts) close(Math.hypot(p.x - 100, p.y - 100), 80)
        const inner = ringPoints(5, 100, geom)
        for (const p of inner) close(Math.hypot(p.x - 100, p.y - 100), (80 * 100) / 255)
    })
})

test("toPointsAttr rounds to 2 decimals", () => {
    expect(toPointsAttr([{ x: 1.23456, y: 2 }, { x: 0, y: 10.005 }])).toBe("1.23,2 0,10.01")
})

describe("buildStatData", () => {
    const current = [
        { key: "hp" as const, value: 70 },
        { key: "attack" as const, value: 45 },
        { key: "defense" as const, value: 48 },
        { key: "spAtk" as const, value: 60 },
        { key: "spDef" as const, value: 65 },
        { key: "speed" as const, value: 35 },
    ]

    test("without a generation there is no comparison", () => {
        const d = buildStatData(current, null)
        expect(d.map((r) => r.current)).toEqual([null, null, null, null, null, null])
        expect(statsDiffer(d)).toBe(false)
    })

    test("marks every row that ties for the highest value", () => {
        const d = buildStatData(
            [
                { key: "hp", value: 80 },
                { key: "attack", value: 80 },
                { key: "defense", value: 10 },
            ],
            null,
        )
        expect(d.map((r) => r.isTop)).toEqual([true, true, false])
    })

    test("all-zero stats have no highest row", () => {
        const d = buildStatData([{ key: "hp", value: 0 }], null)
        expect(d[0].isTop).toBe(false)
    })

    test("pairs each selected-gen value with the current value", () => {
        const sel = current.map((s) => (s.key === "spDef" ? { ...s, value: 85, changedIn: 6 } : { ...s, changedIn: null }))
        const d = buildStatData(sel, current)
        expect(d.find((r) => r.key === "spDef")).toMatchObject({ value: 85, current: 65, changedIn: 6 })
        expect(d.find((r) => r.key === "hp")).toMatchObject({ value: 70, current: 70, changedIn: null })
        expect(statsDiffer(d)).toBe(true)
    })

    test("gen 1 special compares with the current special attack", () => {
        const sel = [
            { key: "hp" as const, value: 70 },
            { key: "attack" as const, value: 45 },
            { key: "defense" as const, value: 48 },
            { key: "special" as const, value: 60 },
            { key: "speed" as const, value: 35 },
        ]
        const d = buildStatData(sel, current)
        expect(d).toHaveLength(5)
        expect(d.find((r) => r.key === "special")?.current).toBe(60)
        expect(statsDiffer(d)).toBe(false)
    })

    test("a current value that is missing stays null", () => {
        const d = buildStatData([{ key: "hp", value: 10 }], [])
        expect(d[0].current).toBeNull()
    })
})

describe("radarOrder", () => {
    const keys = (rows: { key: string }[]) => rows.map((r) => r.key)
    test("6 axes follow the in-game hexagon: physical right, special left", () => {
        const rows = ["hp", "attack", "defense", "spAtk", "spDef", "speed"].map((key) => ({ key: key as never }))
        expect(keys(radarOrder(rows))).toEqual(["hp", "attack", "defense", "speed", "spDef", "spAtk"])
    })
    test("gen 1 pentagon ends with special", () => {
        const rows = ["hp", "attack", "defense", "special", "speed"].map((key) => ({ key: key as never }))
        expect(keys(radarOrder(rows))).toEqual(["hp", "attack", "defense", "speed", "special"])
    })
    test("does not mutate its input", () => {
        const rows = ["speed", "hp"].map((key) => ({ key: key as never }))
        radarOrder(rows)
        expect(keys(rows)).toEqual(["speed", "hp"])
    })
})
