import { describe, expect, test } from 'vitest'
import { buildFlavorOptions, defaultFlavor, groupFlavors } from './flavorEntries'

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

    test('세대를 고르면 그 세대 설명이 기본, 없으면 최신', () => {
        const opts = buildFlavorOptions(entries, 'ko', 'en', clean)
        expect(defaultFlavor(opts, 2)?.text).toBe('gold-en')
        expect(defaultFlavor(opts, 6)?.text).toBe('x-ko')
        expect(defaultFlavor(opts, 4)?.text).toBe('sword-ko')
        expect(defaultFlavor(opts, null)?.text).toBe('sword-ko')
        expect(defaultFlavor([], null)).toBeUndefined()
    })
})
