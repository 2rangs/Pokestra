import { expect, test } from 'vitest'
import { CALC_ITEMS, isCalcItem, parseCalcItem } from './calcItems'
import { ITEM_BY_SLUG } from './items'
import { initSideBySlug } from '../components/calc/calcState'

test('parseCalcItem', () => {
    expect(parseCalcItem('choice-band')).toBe('choice-band')
    expect(parseCalcItem('sitrus-berry')).toBe('sitrus-berry')
    expect(parseCalcItem('oran-berry')).toBeNull()
    expect(parseCalcItem('')).toBeNull()
    expect(parseCalcItem(null)).toBeNull()
    expect(parseCalcItem('Choice-Band')).toBeNull()
})
test('isCalcItem', () => {
    expect(isCalcItem('life-orb')).toBe(true)
    expect(isCalcItem('oran-berry')).toBe(false)
})
test('every calc item exists in the item dex', () => {
    for (const { id } of CALC_ITEMS) expect(ITEM_BY_SLUG.has(id)).toBe(true)
    expect(CALC_ITEMS).toHaveLength(54)
})
test('initSideBySlug applies item', () => {
    expect(initSideBySlug('garchomp', 'garchomp', 'choice-band')!.item).toBe('choice-band')
    const plain = initSideBySlug('garchomp', 'garchomp')!
    expect(initSideBySlug('garchomp', 'garchomp', null)!.item).toBe(plain.item)
})
