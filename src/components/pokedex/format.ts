/** 도감 번호 표기: "No. 0025" */
export function dexNumber(n: number): string {
    return `No. ${String(n).padStart(4, "0")}`
}

/** PokeAPI 세대 slug 의 로마 숫자 → 세대 번호 */
export const ROMAN: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9 }
