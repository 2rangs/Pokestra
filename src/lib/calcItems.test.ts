import { expect, test } from 'vitest'
import { CALC_ITEMS, calcDemoFor, isCalcItem, parseCalcItem } from './calcItems'
import { MOVE_BY_NAME } from './dex'
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

const BOOST_TYPE: Record<string, string> = {
    charcoal: 'fire', 'mystic-water': 'water', 'miracle-seed': 'grass', magnet: 'electric', 'never-melt-ice': 'ice',
    'black-belt': 'fighting', 'poison-barb': 'poison', 'soft-sand': 'ground', 'sharp-beak': 'flying',
    'twisted-spoon': 'psychic', 'silver-powder': 'bug', 'hard-stone': 'rock', 'spell-tag': 'ghost',
    'dragon-fang': 'dragon', 'black-glasses': 'dark', 'metal-coat': 'steel', 'silk-scarf': 'normal', 'fairy-feather': 'fairy',
}

test('calcDemoFor: defensive and utility items have no attacker demo', () => {
    for (const s of ['assault-vest', 'air-balloon', 'weakness-policy', 'rocky-helmet', 'leftovers', 'heavy-duty-boots', 'sitrus-berry', 'choice-scarf', 'focus-sash'])
        expect(calcDemoFor(s)).toBeNull()
    expect(calcDemoFor('not-an-item')).toBeNull()
})
test('calcDemoFor: generic boosters use garchomp', () => {
    for (const s of ['choice-band', 'life-orb', 'expert-belt']) expect(calcDemoFor(s)).toEqual({ atk: 'garchomp' })
})
test('calcDemoFor: type boosters get an attacker whose default moves include that type', () => {
    for (const [item, type] of Object.entries(BOOST_TYPE)) {
        const demo = calcDemoFor(item)!
        expect(demo, item).not.toBeNull()
        const side = initSideBySlug(demo.atk, 'garchomp', item)!
        expect(side.slug, item).toBe(demo.atk)
        expect(side.moves.some((m) => MOVE_BY_NAME.get(m)?.type === type), item).toBe(true)
    }
})
test('calcDemoFor: choice-specs gets a special attacker', () => {
    const demo = calcDemoFor('choice-specs')!
    const side = initSideBySlug(demo.atk, 'garchomp', 'choice-specs')!
    expect(side.moves.filter((m) => MOVE_BY_NAME.get(m)?.damageClass === 'special').length).toBeGreaterThanOrEqual(3)
})
test('calcDemoFor: every mapped item is a calc item', () => {
    for (const s of [...Object.keys(BOOST_TYPE), 'choice-specs', 'choice-band']) expect(isCalcItem(s)).toBe(true)
})
