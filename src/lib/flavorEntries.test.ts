import { expect, test } from 'vitest'
import { groupFlavors } from './flavorEntries'

const e = (text: string, lang: string, version: string) => ({ flavor_text: text, language: { name: lang }, version: { name: version } })
const clean = (t: string) => t.replace(/\s+/g, ' ').trim()

test('최신 작품부터, 같은 글은 묶고, 다른 언어는 뺀다', () => {
    const entries = [e('A', 'ko', 'x'), e('B', 'ko', 'sun'), e('B\n', 'ko', 'moon'), e('C', 'en', 'sword'), e('D', 'ko', 'scarlet')]
    expect(groupFlavors(entries, 'ko', clean)).toEqual([
        { text: 'D', versions: ['scarlet'] },
        { text: 'B', versions: ['moon', 'sun'] },
        { text: 'A', versions: ['x'] },
    ])
    expect(groupFlavors(undefined, 'ko', clean)).toEqual([])
})
