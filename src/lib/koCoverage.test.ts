/** 한국어 화면에 영어가 섞이지 않게: 폼 이름과 기술·특성·도구 설명이 모두 한국어로 있다 */
import { describe, expect, test } from 'vitest'
import moves from '../data/moves.json'
import abilities from '../data/abilities.json'
import items from '../data/items.json'
import { ALL_POKEMON, formLabel, isAlternateForm } from './dex'

describe('한국어 데이터', () => {
    test('모든 폼 이름이 한국어·일본어로 옮겨져 있다', () => {
        const forms = ALL_POKEMON.filter(isAlternateForm)
        for (const lang of ['ko', 'ja'] as const) {
            const bad = forms.filter((p) => /[A-Za-z]{2,}/.test(formLabel(p, lang) ?? '')).map((p) => p.name)
            expect(bad, lang).toEqual([])
        }
    })

    test('기술·특성·도구 설명이 모두 한국어로 있다', () => {
        for (const [name, list] of [['moves', moves], ['abilities', abilities], ['items', items]] as const) {
            const bad = (list as { name: string; desc?: { ko?: string | null } | null }[]).filter((x) => !x.desc?.ko).map((x) => x.name)
            expect(bad, name).toEqual([])
        }
    })
})
