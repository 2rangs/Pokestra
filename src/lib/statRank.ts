/**
 * 종족값 분포: 이 값이 전체 포켓몬 중 상위 몇 %인지.
 * - 모집단: 폼을 뺀 전체 포켓몬(현재 세대 값). 메가진화·지역 폼 등은 한 종으로 치지 않는다.
 * - 상위 % = (이 값보다 높은 포켓몬 수 + 1) / 모집단 × 100, 소수 첫째 자리까지 올림(0.5%처럼). 같은 값은 같은 순위(가장 좋은 쪽).
 * - 위쪽 절반은 "상위 N%", 아래쪽 절반은 "하위 N%"(아래에서 센 순위). 맨 끝은 %가 아니라 "단독/공동 1위", "최하위/공동 최하위"(rankLabel).
 */
import { ALL_POKEMON, type StatKey, STAT_KEYS, isAlternateForm } from './dex'

export type RankKey = StatKey | 'total'

const SPECIES = ALL_POKEMON.filter((p) => !isAlternateForm(p))

/** 키별 내림차순 값 배열 (처음 쓸 때 한 번 만든다) */
let sorted: Record<RankKey, number[]> | null = null
function table(): Record<RankKey, number[]> {
    if (sorted) return sorted
    const t = {} as Record<RankKey, number[]>
    for (const k of STAT_KEYS) t[k] = SPECIES.map((p) => p.stats[k]).sort((a, b) => b - a)
    t.total = SPECIES.map((p) => STAT_KEYS.reduce((s, k) => s + p.stats[k], 0)).sort((a, b) => b - a)
    sorted = t
    return t
}

/** 내림차순 배열에서 value 보다 큰 값의 개수 (이분 탐색) */
export function countGreater(desc: readonly number[], value: number): number {
    let lo = 0
    let hi = desc.length
    while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (desc[mid] > value) lo = mid + 1
        else hi = mid
    }
    return lo
}

/** 내림차순 배열에서 value 와 같은 값의 개수 */
function countEqual(desc: readonly number[], value: number): number {
    let n = 0
    for (let i = countGreater(desc, value); i < desc.length && desc[i] === value; i++) n++
    return n
}

export interface StatRank {
    /** 순위 (같은 값은 같은 순위) */
    rank: number
    /** 같은 값을 가진 포켓몬 수 (자기 포함, 모집단에 없는 값이면 0) */
    tied: number
    /** 상위 % (0.1–100, 소수 첫째 자리까지 올림) */
    percent: number
    /** 아래에서 센 순위 (가장 낮은 값이 1) */
    bottomRank: number
    /** 하위 % (0.1–100, 소수 첫째 자리까지 올림) */
    bottomPercent: number
}

const pct = (rank: number, n: number) => Math.min(100, Math.max(0.1, Math.ceil((rank / n) * 1000) / 10))

/** 순위·동점 수·상위/하위 %. 모집단이 비었으면 null */
export function statRank(key: RankKey, value: number, desc: readonly number[] = table()[key]): StatRank | null {
    if (!desc.length || !Number.isFinite(value)) return null
    const greater = countGreater(desc, value)
    const tied = countEqual(desc, value)
    const rank = greater + 1
    const bottomRank = desc.length - greater - tied + 1
    return { rank, tied, percent: pct(rank, desc.length), bottomRank, bottomPercent: pct(bottomRank, desc.length) }
}

/** 화면 표기: 위쪽 절반은 상위 %, 아래쪽 절반은 하위 %. 맨 끝은 1위·최하위(단독/공동) */
export type RankLabel =
    | { kind: 'first' | 'last'; tied: number }
    | { kind: 'top' | 'bottom'; percent: number }

export function rankLabel(r: StatRank): RankLabel {
    if (r.rank === 1) return { kind: 'first', tied: r.tied }
    if (r.bottomRank === 1 && r.tied > 0) return { kind: 'last', tied: r.tied }
    return r.percent <= 50 ? { kind: 'top', percent: r.percent } : { kind: 'bottom', percent: r.bottomPercent }
}

/** 상위 % (0.1–100, 소수 첫째 자리). 모집단이 비었으면 null */
export function topPercent(key: RankKey, value: number, desc: readonly number[] = table()[key]): number | null {
    return statRank(key, value, desc)?.percent ?? null
}

/** 모집단 크기 (설명 문구용) */
export const RANK_POPULATION = SPECIES.length

export const isRankKey = (k: string): k is RankKey => k === 'total' || (STAT_KEYS as readonly string[]).includes(k)
