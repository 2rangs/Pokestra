import { describe, expect, test } from 'vitest'
import { dailyPick, dateKey, isCorrect, liveStreak, nextStreak } from './quizModel'

const charizard = { name: 'charizard', nameKo: '리자몽', nameEn: 'Charizard', nameJa: 'リザードン' }

describe('실루엣 퀴즈', () => {
    test('정답: 세 언어 이름, 가나 구분 없이, 정확한 초성', () => {
        expect(isCorrect(charizard, '리자몽')).toBe(true)
        expect(isCorrect(charizard, ' charizard ')).toBe(true)
        expect(isCorrect(charizard, 'りざーどん')).toBe(true)
        expect(isCorrect(charizard, 'ㄹㅈㅁ')).toBe(true)
        expect(isCorrect(charizard, 'ㄹㅈ')).toBe(false)
        expect(isCorrect(charizard, '리자드')).toBe(false)
        expect(isCorrect(charizard, '')).toBe(false)
    })
    test('같은 날은 같은 문제', () => {
        const pool = [1, 2, 3, 4, 5].map((id) => ({ id })) as never[]
        expect(dailyPick(pool, '2026-11-24')).toBe(dailyPick(pool, '2026-11-24'))
    })
    test('연속 정답', () => {
        expect(dateKey(new Date(2026, 10, 4))).toBe('2026-11-04')
        expect(nextStreak(null, '2026-11-24')).toEqual({ date: '2026-11-24', count: 1 })
        expect(nextStreak({ date: '2026-11-23', count: 2 }, '2026-11-24')).toEqual({ date: '2026-11-24', count: 3 })
        expect(nextStreak({ date: '2026-11-24', count: 3 }, '2026-11-24')).toEqual({ date: '2026-11-24', count: 3 })
        expect(nextStreak({ date: '2026-11-20', count: 5 }, '2026-11-24')).toEqual({ date: '2026-11-24', count: 1 })
        expect(liveStreak({ date: '2026-11-23', count: 2 }, '2026-11-24')).toBe(2)
        expect(liveStreak({ date: '2026-11-20', count: 2 }, '2026-11-24')).toBe(0)
        expect(nextStreak({ date: '2026-11-30', count: 1 }, '2026-12-01')).toEqual({ date: '2026-12-01', count: 2 })
    })
})
