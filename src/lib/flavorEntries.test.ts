import { describe, expect, test } from 'vitest'
import { buildFlavorOptions, defaultFlavor, flavorMatch, groupFlavors } from './flavorEntries'

const e = (text: string, lang: string, version: string) => ({ flavor_text: text, language: { name: lang }, version: { name: version } })
const clean = (t: string) => t.replace(/\s+/g, ' ').trim()

describe('도감 설명', () => {
    test('최신 작품부터, 같은 글은 묶고, 다른 언어는 뺀다', () => {
        const entries = [e('A', 'ko', 'x'), e('B', 'ko', 'sun'), e('B\n', 'ko', 'moon'), e('C', 'en', 'sword'), e('D', 'ko', 'scarlet')]
        expect(groupFlavors(entries, 'ko', clean).map((o) => [o.text, o.versions])).toEqual([
            ['D', ['scarlet']],
            ['B', ['moon', 'sun']],
            ['A', ['x']],
        ])
        expect(groupFlavors(undefined, 'ko', clean)).toEqual([])
    })

    const entries = [
        e('red-en', 'en', 'red'), e('gold-en', 'en', 'gold'),
        e('x-en', 'en', 'x'), e('x-ko', 'ko', 'x'),
        e('sword-en', 'en', 'sword'), e('sword-ko', 'ko', 'sword'),
    ]

    test('한국어가 없는 작품은 영어로 채우고 세대 순으로 섞는다', () => {
        const opts = buildFlavorOptions(entries, 'ko', 'en', clean)
        expect(opts.map((o) => [o.text, o.lang])).toEqual([
            ['sword-ko', 'ko'],
            ['x-ko', 'ko'],
            ['gold-en', 'en'],
            ['red-en', 'en'],
        ])
        expect(new Set(opts.map((o) => o.id)).size).toBe(opts.length)
    })

    test('세대를 고르면 그 세대 설명이 기본, 없으면 가장 가까운 세대', () => {
        const opts = buildFlavorOptions(entries, 'ko', 'en', clean)
        expect(defaultFlavor(opts, 2)?.text).toBe('gold-en')
        expect(defaultFlavor(opts, 6)?.text).toBe('x-ko')
        expect(defaultFlavor(opts, 4)?.text).toBe('x-ko') // 4세대 → 가장 가까운 6세대
        expect(defaultFlavor(opts, null)?.text).toBe('sword-ko')
        expect(defaultFlavor([], null)).toBeUndefined()
    })

    test('사용자 언어를 넘기면 영어 대체 설명보다 사용자 언어 설명이 기본', () => {
        const opts = buildFlavorOptions([e('za-en', 'en', 'legends-za'), e('sv-ko', 'ko', 'scarlet'), e('red-en', 'en', 'red')], 'ko', 'en', clean)
        expect(opts.map((o) => o.text)).toContain('za-en') // 영어 설명도 목록에는 남는다
        expect(defaultFlavor(opts, null, 'ko')?.text).toBe('sv-ko')
        expect(defaultFlavor(opts, 1, 'ko')?.text).toBe('sv-ko') // 그 세대·리메이크에 한국어가 없으면 가장 가까운 한국어
        expect(defaultFlavor(opts, 9, 'ko')?.text).toBe('sv-ko')
        expect(defaultFlavor(opts.filter((o) => o.lang === 'en'), null, 'ko')?.lang).toBe('en') // 한국어가 하나도 없으면 영어
    })

    test('세대를 고르면 그 세대 → 리메이크 → 가장 가까운 작품의 사용자 언어 설명', () => {
        const opts = buildFlavorOptions(
            [e('red-en', 'en', 'red'), e('lgp-ko', 'ko', 'lets-go-pikachu'), e('x-ko', 'ko', 'x'), e('oras-ko', 'ko', 'omega-ruby'), e('sv-ko', 'ko', 'scarlet')],
            'ko',
            'en',
            clean,
        )
        const at = (g: number) => defaultFlavor(opts, g, 'ko')
        expect(at(1)?.text).toBe('lgp-ko') // 1세대 → 레츠고(리메이크)
        expect(flavorMatch(at(1)!, 1)).toBe('remake')
        expect(at(3)?.text).toBe('oras-ko') // 3세대 → 오메가루비(리메이크)
        expect(['x-ko', 'oras-ko']).toContain(at(6)?.text) // 같은 6세대 (오메가루비도 6세대 작품)
        expect(flavorMatch(at(6)!, 6)).toBe('same')
        expect(['x-ko', 'oras-ko']).toContain(at(5)?.text) // 5세대 → 가장 가까운 6세대
        expect(flavorMatch(at(5)!, 5)).toBe('nearest')
    })
})
