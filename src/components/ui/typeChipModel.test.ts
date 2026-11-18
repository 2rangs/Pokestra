import { describe, expect, test } from 'vitest'
import { multiplierLabel, multiplierMessageKey, multiplierTone, typeBorderClass, typeTokenColor } from './typeChipModel'

describe('typeChipModel', () => {
    test('배수 글자', () => {
        expect([4, 2, 1, 0.5, 0.25, 0].map(multiplierLabel)).toEqual(['×4', '×2', '×1', '×½', '×¼', '×0'])
    })
    test('받는 쪽 의미 색', () => {
        expect([4, 2, 1, 0.5, 0.25, 0].map((m) => multiplierTone(m))).toEqual(['danger', 'warning', 'neutral', 'safe', 'strong-safe', 'immune'])
    })
    test('때리는 쪽은 뒤집힌다', () => {
        expect([4, 2, 1, 0.5, 0.25, 0].map((m) => multiplierTone(m, 'attack'))).toEqual(['strong-safe', 'safe', 'neutral', 'warning', 'warning', 'danger'])
        expect(multiplierMessageKey(0, 'attack')).toBe('noEffect')
        expect(multiplierMessageKey(0.25)).toBe('quadResist')
    })
    test('모르는 타입은 회색·기본 테두리', () => {
        expect(typeTokenColor('fire')).toBe('fire')
        expect(typeTokenColor('typeless')).toBe('gray')
        expect(typeBorderClass('fire')).toBe('border-type-fire-border')
        expect(typeBorderClass('???')).toBe('border-border')
    })
})
