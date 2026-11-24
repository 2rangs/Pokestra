import { expect, test } from 'vitest'
import { spriteGameName } from './gameNames'

test('스프라이트 묶음 이름을 작품 이름으로', () => {
    expect(spriteGameName('scarlet-violet', 'ko')).toBe('스칼렛 · 바이올렛')
    expect(spriteGameName('omegaruby-alphasapphire', 'ko')).toBe('오메가루비 · 알파사파이어')
    expect(spriteGameName('lets-go-pikachu-lets-go-eevee', 'ko')).toBe('레츠고! 피카츄 · 레츠고! 이브이')
    expect(spriteGameName('ultra-sun-ultra-moon', 'ko')).toBe('울트라썬 · 울트라문')
    expect(spriteGameName('champions', 'en')).toBe('Champions')
    expect(spriteGameName('x-y', 'ko')).toBe('X · Y')
    expect(spriteGameName('unknown-game', 'ko')).toBe('Unknown Game')
})
