/** `?sex=` 쿼리 값 → "f" 는 정확히 "f" 일 때만, 나머지는 "m" */
export function parseSex(v: string | null): "m" | "f" {
    return v === "f" ? "f" : "m"
}
