import { expect, test } from 'vitest'
import itemNamesJson from '../data/itemNames.json'
import {
    DEX_ITEMS, ITEM_BY_SLUG, categoriesFor, heldByPokemon, itemDesc, itemName, itemNeighbors, itemValue,
    parseItemQuery, queryItems, type DexItem,
} from './items'

const q = (p: string) => parseItemQuery(new URLSearchParams(p))
const slugs = (list: DexItem[]) => list.map((i) => i.name)

test('data counts and uniqueness', () => {
  expect(DEX_ITEMS).toHaveLength(349)
  expect(new Set(slugs([...DEX_ITEMS])).size).toBe(349)
  expect(DEX_ITEMS.filter((i) => i.kind === 'berry')).toHaveLength(73)
  expect(ITEM_BY_SLUG.has('hopo-berry')).toBe(false)
  expect(ITEM_BY_SLUG.has('poke-ball')).toBe(false)
})
test('names match itemNames.json', () => {
  for (const i of DEX_ITEMS) expect({ ko: i.nameKo, en: i.nameEn, ja: i.nameJa }).toEqual((itemNamesJson as Record<string, unknown>)[i.name])
})
test('known values', () => {
  expect(ITEM_BY_SLUG.get('leftovers')).toMatchObject({ id: 211, kind: 'battle', category: 'held-items', flingPower: 10, flingEffect: null, berry: null })
  expect(ITEM_BY_SLUG.get('flame-orb')).toMatchObject({ category: 'bad-held-items', flingPower: 30, flingEffect: 'burn' })
  expect(ITEM_BY_SLUG.get('kings-rock')!.flingEffect).toBe('flinch')
  expect(ITEM_BY_SLUG.get('sitrus-berry')).toMatchObject({ id: 135, kind: 'berry', category: 'medicine', flingEffect: 'berry-effect',
    berry: { naturalGiftType: 'psychic', naturalGiftPower: 60, firmness: 'very-hard', size: 95, growthTime: 8,
             flavors: { spicy: 0, dry: 10, sweet: 10, bitter: 10, sour: 10 } } })
  expect(ITEM_BY_SLUG.get('leftovers')!.heldBy.map((h) => h.id)).toEqual([143, 446])
  expect(ITEM_BY_SLUG.get('oran-berry')!.heldBy).toHaveLength(26)
  expect(ITEM_BY_SLUG.get('leftovers')!.desc).toEqual({ ko: expect.any(String), en: expect.any(String), ja: expect.stringContaining('持たせると') })
})
test('sparse items stay renderable', () => {
  const roseli = ITEM_BY_SLUG.get('roseli-berry')!
  expect(roseli).toMatchObject({ id: 723, nameKo: '로셀열매', category: 'type-protection' })
  expect(roseli.desc?.ko).toBeTruthy()
  expect(ITEM_BY_SLUG.get('kee-berry')!.berry).toMatchObject({ firmness: null, size: null, flavors: null, naturalGiftPower: 100 })
  expect(ITEM_BY_SLUG.get('golden-razz-berry')!.berry).toBeNull()
  expect(itemDesc(ITEM_BY_SLUG.get('booster-energy')!, 'ko')).toBeNull()
  expect(itemDesc({ ...ITEM_BY_SLUG.get('leftovers')!, desc: { ko: null, en: 'E', ja: null } }, 'ko')).toEqual({ text: 'E', lang: 'en' })
})
test('parseItemQuery defaults', () =>
  expect(q('')).toEqual({ q: '', view: 'all', cats: [], sort: 'name', dir: 'asc' }))
test('parseItemQuery drops invalid values', () => {
  expect(q('view=berry&cat=choice,medicine,foo&sort=bogus&dir=up')).toEqual({ q: '', view: 'berry', cats: ['medicine'], sort: 'name', dir: 'asc' })
  expect(q('view=nope&sort=value')).toMatchObject({ view: 'all', sort: 'value', dir: 'desc' })
})
test('view and category filter', () => {
  expect(queryItems(q('view=berry'), 'ko').every((i) => i.kind === 'berry')).toBe(true)
  expect(queryItems(q('view=battle'), 'ko')).toHaveLength(276)
  expect(new Set(queryItems(q('cat=choice'), 'en').map((i) => i.name))).toEqual(new Set(['choice-band', 'choice-scarf', 'choice-specs']))
})
test('search across ko/en/ja and slug', () => {
  for (const s of ['먹다남은', 'Leftovers', 'たべのこし', 'leftovers']) expect(slugs(queryItems(q(`q=${encodeURIComponent(s)}`), 'ko'))).toContain('leftovers')
})
test('search folds kana, width and spaces', () => {
  expect(slugs(queryItems(q('q=' + encodeURIComponent('タベノコシ')), 'ja'))).toContain('leftovers')
  expect(slugs(queryItems(q('q=' + encodeURIComponent('구애 머리띠')), 'ko'))).toEqual(['choice-band'])
  expect(slugs(queryItems(q('q=choice%20band'), 'en'))).toEqual(['choice-band'])
})
test('sort by name uses the language collator', () => {
  const names = queryItems(q('cat=choice'), 'ko').map((i) => itemName(i, 'ko'))
  expect(names).toEqual([...names].sort(new Intl.Collator('ko-KR', { numeric: true }).compare))
})
test('sort by value puts nulls last in both directions', () => {
  for (const dir of ['asc', 'desc']) {
    const vals = queryItems(q(`sort=value&dir=${dir}`), 'en').map(itemValue)
    const firstNull = vals.indexOf(null)
    expect(firstNull === -1 || vals.slice(firstNull).every((v) => v == null)).toBe(true)
  }
  expect(itemValue(ITEM_BY_SLUG.get('sitrus-berry')!)).toBe(60)
  expect(itemValue(ITEM_BY_SLUG.get('flame-orb')!)).toBe(30)
})
test('sort by category follows category order', () => {
  const order = categoriesFor('all')
  const idx = queryItems(q('sort=category'), 'en').map((i) => order.indexOf(i.category))
  expect(idx).toEqual([...idx].sort((a, b) => a - b))
})
test('itemNeighbors', () => {
  const list = queryItems(q('cat=choice'), 'en')
  expect(itemNeighbors(list[1].name, q('cat=choice'), 'en')).toEqual({ prev: list[0], next: list[2] })
  expect(itemNeighbors(list[0].name, q('cat=choice'), 'en').prev).toBeNull()
  const all = queryItems(q(''), 'en'); const i = all.findIndex((x) => x.name === 'leftovers')
  expect(itemNeighbors('leftovers', q('cat=choice'), 'en')).toEqual({ prev: all[i - 1], next: all[i + 1] })
})
test('heldByPokemon sorted by rarity', () => {
  const r = heldByPokemon(ITEM_BY_SLUG.get('oran-berry')!).map((h) => h.rarity)
  expect(r).toEqual([...r].sort((a, b) => b - a))
})
