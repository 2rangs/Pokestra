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
