import { describe, expect, test } from 'vitest'
import { RANK_POPULATION, countGreater, isRankKey, topPercent } from './statRank'

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
    test('실제 데이터: 모집단은 폼을 뺀 종 수, 리자몽 특공 109·합계 534', () => {
        expect(RANK_POPULATION).toBeGreaterThan(1000)
        const spa = topPercent('spAtk', 109)!
        const total = topPercent('total', 534)!
        expect(spa).toBeGreaterThan(5)
        expect(spa).toBeLessThan(40)
        expect(total).toBeGreaterThan(10)
        expect(total).toBeLessThan(50)
        expect(topPercent('total', 720)).toBe(1)
    })
    test('키 판별', () => {
        expect(isRankKey('spAtk')).toBe(true)
        expect(isRankKey('total')).toBe(true)
        expect(isRankKey('special')).toBe(false)
    })
})
