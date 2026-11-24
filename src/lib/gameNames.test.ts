import { describe, expect, test } from 'vitest'
import { gameTitle, KNOWN_VERSIONS, versionName } from './gameNames'

describe('gameNames', () => {
    test('도감 설명이 나오는 최근 작품 이름', () => {
        expect(gameTitle('scarlet', 'ko')).toBe('포켓몬스터 스칼렛')
        expect(gameTitle('scarlet', 'en')).toBe('Pokémon Scarlet')
        expect(gameTitle('violet', 'ja')).toBe('ポケットモンスター バイオレット')
        expect(versionName('diamond', 'ko')).toBe('디아루가')
    })
    test('모르는 작품은 제목 형태로', () => {
        expect(versionName('future-game', 'ko')).toBe('Future Game')
    })
    test('본편 작품을 모두 안다', () => {
        for (const v of ['red', 'blue', 'yellow', 'gold', 'silver', 'crystal', 'x', 'y', 'sword', 'shield', 'scarlet', 'violet', 'legends-arceus'])
            expect(KNOWN_VERSIONS).toContain(v)
    })
})
