/**
 * 종족값 막대 차트의 순수 계산.
 * - 눈금은 0–200 고정. 포켓몬끼리 막대 길이를 그대로 비교할 수 있게 포켓몬마다 눈금을 바꾸지 않는다.
 *   종족값은 대부분 200 이하라 255 눈금보다 짧은 막대가 덜 비어 보인다. 200을 넘는 값은 막대를 꽉 채우고 "200+" 표시를 단다.
 */
import type { GenStatKey } from "../../lib/generation"

export const STAT_SCALE_MAX = 200

/** 0–200 눈금 위 비율 (0..1). 범위 밖·NaN 은 끝으로 자른다 */
export function scaleFraction(value: number, max = STAT_SCALE_MAX): number {
    if (!Number.isFinite(value) || value <= 0) return 0
    return Math.min(1, value / max)
}

/** 눈금(200)을 넘는 값인지: 막대 끝에 "200+" 표시 */
export function exceedsScale(value: number, max = STAT_SCALE_MAX): boolean {
    return Number.isFinite(value) && value > max
}

export interface StatDatum {
    key: GenStatKey
    /** 보여 주는 값 (세대 선택 시 그 세대 값) */
    value: number
    /** 비교할 현재 값. 세대를 고르지 않았으면 null */
    current: number | null
    /** 현재 값으로 바뀐 세대 */
    changedIn: number | null
    /** 가장 높은 값(동점 포함) */
    isTop: boolean
}

/**
 * 표시 값과 현재 값을 짝짓는다.
 * 1세대 특수(special)는 현재 특수공격과 비교한다 — statsAt 이 변경 여부를 판단하는 기준과 같다.
 */
export function buildStatData(
    selected: readonly { key: GenStatKey; value: number; changedIn?: number | null }[],
    current: readonly { key: GenStatKey; value: number }[] | null,
): StatDatum[] {
    const max = selected.reduce((m, s) => Math.max(m, s.value), 0)
    const byKey = new Map(current?.map((c) => [c.key, c.value]))
    return selected.map((s) => ({
        key: s.key,
        value: s.value,
        current: current ? (byKey.get(s.key === "special" ? "spAtk" : s.key) ?? null) : null,
        changedIn: s.changedIn ?? null,
        isTop: max > 0 && s.value === max,
    }))
}

/** 선택 세대 값이 현재와 하나라도 다르면 true (막대에 현재 값 눈금을 그릴지) */
export function statsDiffer(data: readonly StatDatum[]): boolean {
    return data.some((d) => d.current !== null && d.current !== d.value)
}

/**
 * 합계 비교: 선택 세대 합계와 현재 합계(현재 능력치 전부). 세대를 고르지 않았으면 null.
 * 1세대처럼 축별 값이 모두 같아도 합계는 다를 수 있다(특수 하나 ↔ 특공·특방 둘).
 */
export function compareTotals(
    data: readonly StatDatum[],
    current: readonly { value: number }[] | null,
): { selected: number; current: number | null; differs: boolean } {
    const selected = data.reduce((s, d) => s + d.value, 0)
    if (!current) return { selected, current: null, differs: false }
    const cur = current.reduce((s, c) => s + c.value, 0)
    return { selected, current: cur, differs: cur !== selected }
}

/** 로빙 포커스: 방향키로 다음 행 (끝에서 멈춤). 처리하지 않는 키는 null */
export function nextRowIndex(key: string, index: number, count: number): number | null {
    if (count <= 0) return null
    if (key === "ArrowDown" || key === "ArrowRight") return Math.min(count - 1, index + 1)
    if (key === "ArrowUp" || key === "ArrowLeft") return Math.max(0, index - 1)
    if (key === "Home") return 0
    if (key === "End") return count - 1
    return null
}
