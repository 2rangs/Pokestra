import { describe, expect, test } from 'vitest'
import { buildSearchKey, foldSearch, toChosung, withChosung } from './text'

describe('초성 검색', () => {
    test('한글 음절 → 초성, 다른 글자는 그대로', () => {
        expect(toChosung('리자몽')).toBe('ㄹㅈㅁ')
        expect(toChosung('10만볼트')).toBe('10ㅁㅂㅌ')
        expect(toChosung('꼬부기')).toBe('ㄲㅂㄱ')
        expect(toChosung('Pikachu')).toBe('Pikachu')
    })
    test('한글 이름이 있을 때만 초성 키를 더한다', () => {
        expect(withChosung(['charizard', '리자몽', null])).toEqual(['charizard', '리자몽', 'ㄹㅈㅁ'])
        expect(withChosung(['pikachu', 'Pikachu'])).toEqual(['pikachu', 'Pikachu'])
    })
    test('검색 키에 초성이 들어가 부분 일치로 찾는다 (입력의 호환 자모도 같은 정규화)', () => {
        const key = buildSearchKey('charizard', '리자몽', 'Charizard', 'リザードン')
        expect(key.includes(foldSearch('ㄹㅈㅁ'))).toBe(true)
        expect(key.includes(foldSearch('ㄹㅈ'))).toBe(true)
        expect(key.includes(foldSearch('ㅍㅋㅊ'))).toBe(false)
    })
})
