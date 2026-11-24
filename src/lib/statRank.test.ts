import { describe, expect, test } from 'vitest'
import { RANK_POPULATION, countGreater, isRankKey, rankLabel, statRank, topPercent } from './statRank'

describe('종족값 분포', () => {
    test('내림차순 배열에서 더 큰 값 개수', () => {
        const d = [150, 120, 120, 90, 50]
        expect(countGreater(d, 200)).toBe(0)
        expect(countGreater(d, 120)).toBe(1)
        expect(countGreater(d, 100)).toBe(3)
        expect(countGreater(d, 10)).toBe(5)
    })
    test('상위 %: 같은 값은 같은 순위, 1–100', () => {
        const d = [150, 120, 120, 90, 50]
        expect(topPercent('hp', 150, d)).toBe(20)
        expect(topPercent('hp', 120, d)).toBe(40)
        expect(topPercent('hp', 50, d)).toBe(100)
        expect(topPercent('hp', 999, d)).toBe(20)
        expect(topPercent('hp', 1, [])).toBeNull()
    })
    test('상위 %는 소수 첫째 자리까지 올림, 1위는 단독·공동을 가린다', () => {
        const d = Array.from({ length: 1000 }, (_, i) => 1000 - i) // 1000, 999, …, 1
        expect(topPercent('hp', 996, d)).toBe(0.5) // 5위 / 1000
        expect(topPercent('hp', 995, d)).toBe(0.6)
        expect(statRank('hp', 1000, d)).toMatchObject({ rank: 1, tied: 1, percent: 0.1 })
        const tie = [200, 200, 150, 100]
        expect(statRank('hp', 200, tie)).toMatchObject({ rank: 1, tied: 2 })
        expect(statRank('hp', 150, tie)).toMatchObject({ rank: 3, tied: 1, percent: 75, bottomRank: 2, bottomPercent: 50 })
        expect(statRank('hp', 999, tie)).toMatchObject({ rank: 1, tied: 0 })
    })
    test('표기: 위쪽 절반은 상위, 아래쪽 절반은 하위, 끝은 1위·최하위', () => {
        const d = Array.from({ length: 1000 }, (_, i) => 1000 - i)
        const label = (v: number, arr: readonly number[] = d) => rankLabel(statRank('hp', v, arr)!)
        expect(label(1000)).toEqual({ kind: 'first', tied: 1 })
        expect(label(996)).toEqual({ kind: 'top', percent: 0.5 })
        expect(label(501)).toEqual({ kind: 'top', percent: 50 })
        expect(label(500)).toEqual({ kind: 'bottom', percent: 50 })
        expect(label(3)).toEqual({ kind: 'bottom', percent: 0.3 })
        expect(label(1)).toEqual({ kind: 'last', tied: 1 })
        expect(label(5, [9, 5, 5, 5])).toEqual({ kind: 'last', tied: 3 })
        expect(label(9, [9, 9, 5])).toEqual({ kind: 'first', tied: 2 })
    })
    test('실제 데이터: 모집단은 폼을 뺀 종 수, 리자몽 특공 109·합계 534', () => {
        expect(RANK_POPULATION).toBeGreaterThan(1000)
        const spa = topPercent('spAtk', 109)!
        const total = topPercent('total', 534)!
        expect(spa).toBeGreaterThan(5)
        expect(spa).toBeLessThan(40)
        expect(total).toBeGreaterThan(10)
        expect(total).toBeLessThan(50)
        expect(statRank('total', 720)).toMatchObject({ rank: 1 }) // 아르세우스 720
    })
    test('키 판별', () => {
        expect(isRankKey('spAtk')).toBe(true)
        expect(isRankKey('total')).toBe(true)
        expect(isRankKey('special')).toBe(false)
    })
})
