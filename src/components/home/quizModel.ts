/**
 * "이 포켓몬은 누구?" 퀴즈의 순수 로직: 문제 고르기, 정답 판정, 연속 정답 기록.
 */
import { type DexPokemon } from '../../lib/dex'
import { toChosung } from '../dex/text'
import { norm } from '../pokedex/search'

/** 날짜 키(로컬) "2026-11-24" */
export function dateKey(d: Date = new Date()): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 문자열 → 결정적인 정수 (FNV-1a) */
function hash(s: string): number {
    let h = 0x811c9dc5
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i)
        h = Math.imul(h, 0x01000193)
    }
    return h >>> 0
}

/** 그날의 문제 (같은 날이면 모두 같은 포켓몬) */
export function dailyPick(pool: readonly DexPokemon[], day: string): DexPokemon {
    return pool[hash(`${day}:quiz`) % pool.length]
}

/**
 * 정답 판정: 어느 언어 이름이든(대소문자·공백·가나 구분 없이), 또는 한국어 이름의 초성과 정확히 같으면 정답.
 * 초성은 일부만 맞는 것은 인정하지 않는다 ("ㄹㅈ" ≠ 리자몽).
 */
export function isCorrect(p: Pick<DexPokemon, 'name' | 'nameKo' | 'nameEn' | 'nameJa'>, input: string): boolean {
    const q = norm(input)
    if (!q) return false
    const names = [p.name, p.nameKo, p.nameEn, p.nameJa].filter((n): n is string => !!n).map(norm)
    if (names.includes(q)) return true
    return !!p.nameKo && norm(toChosung(p.nameKo)) === q
}

export interface Streak {
    /** 마지막으로 오늘의 퀴즈를 맞힌 날 */
    date: string
    count: number
}

/** 오늘의 퀴즈를 맞혔을 때 새 연속 기록 (어제 맞혔으면 +1, 오늘 이미 맞혔으면 그대로, 아니면 1) */
export function nextStreak(prev: Streak | null, today: string): Streak {
    if (prev?.date === today) return prev
    const y = new Date(`${today}T00:00:00`)
    y.setDate(y.getDate() - 1)
    return { date: today, count: prev?.date === dateKey(y) ? prev.count + 1 : 1 }
}

/** 보여 줄 연속 기록: 오늘이나 어제 맞힌 기록만 이어지고 있는 것으로 본다 */
export function liveStreak(s: Streak | null, today: string): number {
    if (!s) return 0
    const y = new Date(`${today}T00:00:00`)
    y.setDate(y.getDate() - 1)
    return s.date === today || s.date === dateKey(y) ? s.count : 0
}
