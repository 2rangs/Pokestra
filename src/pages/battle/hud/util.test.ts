import { expect, test } from 'vitest'
import { pctOf } from './util'

test('pctOf: 100% 는 가득 찼을 때만, 살아 있으면 최소 1%', () => {
    expect(pctOf({ hp: 400, max_hp: 400 })).toBe(100)
    expect(pctOf({ hp: 399, max_hp: 400 })).toBe(99)
    expect(pctOf({ hp: 1, max_hp: 400 })).toBe(1)
    expect(pctOf({ hp: 0, max_hp: 400 })).toBe(0)
    expect(pctOf({ hp: 200, max_hp: 400 })).toBe(50)
})
