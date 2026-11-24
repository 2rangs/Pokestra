import { describe, expect, test } from 'vitest'
import { BOX_ICON_MAX_PX, isPaddedBoxIcon, isPixelSprite, pokemonImageCandidates } from './images'
import { artworkUrl, backSpriteUrl, boxIconUrls, spriteUrl } from './spriteUrls'

const SV = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-ix/scarlet-violet/icons/25.png'
const G7 = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-vii/icons/25.png'

describe('boxIconUrls', () => {
    test('SV 아이콘 다음 7세대 아이콘', () => {
        expect(boxIconUrls(25)).toEqual([SV, G7])
    })
    test('폼 id 도 그대로 쓴다', () => {
        expect(boxIconUrls(10034)[1]).toMatch(/generation-vii\/icons\/10034\.png$/)
    })
})

describe('pokemonImageCandidates', () => {
    test('≤40px: 박스 아이콘 → 도트 → 일러스트', () => {
        expect(pokemonImageCandidates(25, 32)).toEqual([SV, G7, spriteUrl(25), artworkUrl(25)])
        expect(pokemonImageCandidates(25, BOX_ICON_MAX_PX)).toEqual([SV, G7, spriteUrl(25), artworkUrl(25)])
    })
    test('41–64px: 도트 → 일러스트 (박스 아이콘 없음)', () => {
        expect(pokemonImageCandidates(25, 41)).toEqual([spriteUrl(25), artworkUrl(25)])
        expect(pokemonImageCandidates(25, 64)).toEqual([spriteUrl(25), artworkUrl(25)])
    })
    test('>64px: 일러스트 → 도트', () => {
        expect(pokemonImageCandidates(25, 200)).toEqual([artworkUrl(25), spriteUrl(25)])
    })
    test('지정한 도트는 박스 아이콘 다음', () => {
        expect(pokemonImageCandidates(25, 24, { sprite: 'x.png' })).toEqual([SV, G7, 'x.png', artworkUrl(25)])
    })
    test('뒷모습은 박스 아이콘을 쓰지 않는다', () => {
        expect(pokemonImageCandidates(25, 32, { back: true })).toEqual([backSpriteUrl(25), spriteUrl(25), artworkUrl(25)])
    })
})

describe('렌더링 판정', () => {
    test('도트·7세대 아이콘은 픽셀, 일러스트·SV 아이콘은 매끈하게', () => {
        expect(isPixelSprite(spriteUrl(25))).toBe(true)
        expect(isPixelSprite(G7)).toBe(true)
        expect(isPixelSprite(SV)).toBe(false)
        expect(isPixelSprite(artworkUrl(25))).toBe(false)
        expect(isPixelSprite(undefined)).toBe(false)
    })
    test('여백 많은 7세대 아이콘만 키운다', () => {
        expect(isPaddedBoxIcon(G7)).toBe(true)
        expect(isPaddedBoxIcon(SV)).toBe(false)
    })
})
