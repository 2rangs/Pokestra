/**
 * 종족값 차트(막대 + 방사형)의 순수 계산.
 * - 눈금은 0–255 고정 (종족값 최대치). 포켓몬끼리 모양을 비교할 수 있게 자동 눈금을 쓰지 않는다.
 * - 방사형 첫 축은 12시 방향, 시계 방향으로 축을 나눈다 (6축 = 육각형, 1세대 특수 = 5축 오각형).
 */
import type { GenStatKey } from "../../lib/generation"

export const STAT_SCALE_MAX = 255
/** 방사형 격자 고리 (흐린 보조선) */
export const RADAR_RINGS: readonly number[] = [50, 100, 150, 200, 255]

export interface Point {
    x: number
    y: number
}
export interface RadarGeometry {
    cx: number
    cy: number
    /** 255 고리의 반지름 */
    r: number
}

/** 0–255 눈금 위 비율 (0..1). 범위 밖·NaN 은 끝으로 자른다 */
export function scaleFraction(value: number, max = STAT_SCALE_MAX): number {
    if (!Number.isFinite(value) || value <= 0) return 0
    return Math.min(1, value / max)
}

function axisPoint(i: number, n: number, fraction: number, { cx, cy, r }: RadarGeometry): Point {
    const angle = (2 * Math.PI * i) / n
    return { x: cx + r * fraction * Math.sin(angle), y: cy - r * fraction * Math.cos(angle) }
}

/** 값마다 한 축: 값 → 꼭짓점 좌표 */
export function radarPoints(values: readonly number[], geom: RadarGeometry, max = STAT_SCALE_MAX): Point[] {
    return values.map((v, i) => axisPoint(i, values.length, scaleFraction(v, max), geom))
}

/** n 각형 격자 고리 (value 높이) */
export function ringPoints(n: number, value: number, geom: RadarGeometry, max = STAT_SCALE_MAX): Point[] {
    return Array.from({ length: n }, (_, i) => axisPoint(i, n, scaleFraction(value, max), geom))
}

const round2 = (v: number) => Math.round(v * 100) / 100

/** SVG polygon `points` 속성 문자열 */
export function toPointsAttr(points: readonly Point[]): string {
    return points.map((p) => `${round2(p.x)},${round2(p.y)}`).join(" ")
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

/** 선택 세대 값이 현재와 하나라도 다르면 true (겹쳐 그릴지 결정) */
export function statsDiffer(data: readonly StatDatum[]): boolean {
    return data.some((d) => d.current !== null && d.current !== d.value)
}

/**
 * 방사형 축 순서: 게임 화면과 같이 12시 HP 에서 시계 방향으로 공격 → 방어 → 스피드 → 특방 → 특공.
 * 물리(오른쪽)와 특수(왼쪽)가 마주 보게 된다. 1세대는 특수 하나라 HP → 공격 → 방어 → 스피드 → 특수(오각형).
 */
const RADAR_ORDER: readonly GenStatKey[] = ["hp", "attack", "defense", "speed", "spDef", "spAtk", "special"]

export function radarOrder<T extends { key: GenStatKey }>(data: readonly T[]): T[] {
    const rank = (k: GenStatKey) => RADAR_ORDER.indexOf(k)
    return [...data].sort((a, b) => rank(a.key) - rank(b.key))
}
