import { describe, expect, test } from 'vitest'
import { gameTitle, KNOWN_VERSIONS, spriteGameName, versionName } from './gameNames'

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
    test('스프라이트 묶음 이름을 작품 이름으로', () => {
        expect(spriteGameName('scarlet-violet', 'ko')).toBe('스칼렛 · 바이올렛')
        expect(spriteGameName('omegaruby-alphasapphire', 'ko')).toBe('오메가루비 · 알파사파이어')
        expect(spriteGameName('lets-go-pikachu-lets-go-eevee', 'ko')).toBe('레츠고! 피카츄 · 레츠고! 이브이')
        expect(spriteGameName('ultra-sun-ultra-moon', 'ko')).toBe('울트라썬 · 울트라문')
        expect(spriteGameName('champions', 'en')).toBe('Champions')
        expect(spriteGameName('x-y', 'ko')).toBe('X · Y')
        expect(spriteGameName('unknown-game', 'ko')).toBe('Unknown Game')
    })
})
