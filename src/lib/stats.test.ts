import { describe, expect, it } from 'vitest'
import { calcHp, calcStat, realStatRange } from './stats'

// Garchomp 종족값: HP 108 / 공격 130 / 방어 95 / 특공 80 / 특방 85 / 스피드 102
describe('calcHp', () => {
    it('Lv.50, 개체값 31, 노력치 0', () => expect(calcHp(108, 50, 31, 0)).toBe(183))
    it('Lv.100, 개체값 31, 노력치 252', () => expect(calcHp(108, 100, 31, 252)).toBe(420))
    it('Lv.100, 개체값 0, 노력치 0', () => expect(calcHp(108, 100, 0, 0)).toBe(326))
    it('껍질몬(종족값 1)은 항상 1', () => {
        expect(calcHp(1, 50, 31, 0)).toBe(1)
        expect(calcHp(1, 100, 31, 252)).toBe(1)
    })
})

describe('calcStat', () => {
    it('Lv.50, 개체값 31, 노력치 252, 상승 성격', () => expect(calcStat(130, 50, 31, 252, 1.1)).toBe(200))
    it('Lv.50, 개체값 31, 노력치 0, 무보정', () => expect(calcStat(130, 50, 31, 0, 1)).toBe(150))
    it('Lv.100, 개체값 0, 노력치 0, 하락 성격', () => expect(calcStat(130, 100, 0, 0, 0.9)).toBe(238))
})

describe('realStatRange', () => {
    it('HP 최저/무보정/최고', () => {
        expect(realStatRange('hp', 108, 50)).toEqual({ min: 168, neutral: 183, max: 215 })
    })
    it('HP 외 스탯은 성격 보정을 쓴다', () => {
        expect(realStatRange('attack', 130, 50)).toEqual({ min: 121, neutral: 150, max: 200 })
    })
    it('껍질몬 HP는 1', () => {
        expect(realStatRange('hp', 1, 100)).toEqual({ min: 1, neutral: 1, max: 1 })
    })
})
