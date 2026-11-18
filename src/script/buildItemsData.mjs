/**
 * 배틀 도구·열매 데이터를 src/data/items.json 에 만든다.
 *
 * 실행: node src/script/buildItemsData.mjs [csv-dir]
 *
 * PokeAPI 저장소의 CSV 덤프(data/v2/csv)를 사용한다. csv-dir 을 주지 않으면
 * node_modules/.cache/pokeapi-csv 에 내려받아 캐시한다.
 */
import fs from 'fs'
import path from 'path'
import { loadCsv, nameTable, flavorTable, num } from './pokeapiCsv.mjs'

const DATA_DIR = path.resolve('./src/data')
const CSV_DIR = path.resolve(process.argv[2] ?? './node_modules/.cache/pokeapi-csv')

const BATTLE_CATEGORIES = ['held-items', 'choice', 'bad-held-items', 'type-enhancement', 'plates', 'species-specific', 'jewels', 'mega-stones', 'memories', 'scarves']
const BERRY_CATEGORIES = ['medicine', 'in-a-pinch', 'picky-healing', 'type-protection', 'effort-drop', 'other', 'baking-only', 'catching-bonus']
const IN_SCOPE = new Set([...BATTLE_CATEGORIES, ...BERRY_CATEGORIES])
// contest_type_id 1..5
const FLAVORS = ['spicy', 'dry', 'sweet', 'bitter', 'sour']

const FILES = [
    'items', 'item_names', 'item_flavor_text', 'item_categories', 'berries', 'berry_flavors',
    'berry_firmness', 'item_fling_effects', 'types', 'pokemon_items',
]

console.log(`CSV: ${CSV_DIR}`)
const csv = {}
for (const f of FILES) csv[f] = await loadCsv(f, CSV_DIR)

const categoryById = new Map(csv.item_categories.map((c) => [c.id, c.identifier]))
const firmnessById = new Map(csv.berry_firmness.map((f) => [f.id, f.identifier]))
const flingEffectById = new Map(csv.item_fling_effects.map((f) => [f.id, f.identifier]))
const typeById = new Map(csv.types.map((t) => [t.id, t.identifier]))
const names = nameTable(csv.item_names, 'item_id')
const flavors = flavorTable(csv.item_flavor_text, 'item_id')

const flavorsByBerry = new Map()
for (const r of csv.berry_flavors) {
    const m = flavorsByBerry.get(r.berry_id) ?? {}
    m[FLAVORS[Number(r.contest_type_id) - 1]] = num(r.flavor)
    flavorsByBerry.set(r.berry_id, m)
}
const berryRowsByItem = new Map(csv.berries.map((b) => [b.item_id, b]))
const heldRowsByItem = new Map()
for (const r of csv.pokemon_items) {
    const list = heldRowsByItem.get(r.item_id) ?? []
    list.push(r)
    heldRowsByItem.set(r.item_id, list)
}

// identifier 기준으로 묶는다 (id 오름차순)
const groups = new Map()
for (const it of csv.items) {
    if (!IN_SCOPE.has(categoryById.get(it.category_id))) continue
    const g = groups.get(it.identifier) ?? []
    g.push(it)
    groups.set(it.identifier, g)
}

const firstWith = (rows, pick) => {
    for (const r of rows) {
        const v = pick(r)
        if (v != null) return v
    }
    return null
}

const items = []
for (const [slug, rows] of groups) {
    rows.sort((a, b) => Number(a.id) - Number(b.id))
    const category = categoryById.get(rows[0].category_id)
    const n = firstWith(rows, (r) => names.get(r.id)) ?? {}
    const fling = rows.find((r) => r.fling_power !== '' || r.fling_effect_id !== '') ?? {}
    const desc = firstWith(rows, (r) => {
        const d = flavors.get(r.id)
        return d && (d.ko || d.en || d.ja) ? d : null
    })

    const berryRow = firstWith(rows, (r) => berryRowsByItem.get(r.id))
    const berry = berryRow
        ? {
            naturalGiftType: typeById.get(berryRow.natural_gift_type_id) ?? null,
            naturalGiftPower: num(berryRow.natural_gift_power),
            firmness: firmnessById.get(berryRow.firmness_id) ?? null,
            size: num(berryRow.size),
            growthTime: num(berryRow.growth_time),
            flavors: flavorsByBerry.has(berryRow.id)
                ? Object.fromEntries(FLAVORS.map((f) => [f, flavorsByBerry.get(berryRow.id)[f] ?? 0]))
                : null,
        }
        : null

    // 포켓몬마다 가장 큰 version_id 행의 rarity
    const latest = new Map()
    for (const r of rows.flatMap((x) => heldRowsByItem.get(x.id) ?? [])) {
        const cur = latest.get(r.pokemon_id)
        if (!cur || Number(cur.version_id) < Number(r.version_id)) latest.set(r.pokemon_id, r)
    }
    const heldBy = [...latest.values()]
        .map((r) => ({ id: Number(r.pokemon_id), rarity: Number(r.rarity) }))
        .sort((a, b) => a.id - b.id)

    items.push({
        id: Number(rows[0].id),
        name: slug,
        nameKo: n.ko ?? null,
        nameEn: n.en ?? null,
        nameJa: n.ja ?? null,
        kind: BERRY_CATEGORIES.includes(category) ? 'berry' : 'battle',
        category,
        flingPower: num(fling.fling_power ?? ''),
        flingEffect: flingEffectById.get(fling.fling_effect_id) ?? null,
        desc,
        berry,
        heldBy,
    })
}
items.sort((a, b) => a.id - b.id)

fs.writeFileSync(path.join(DATA_DIR, 'items.json'), JSON.stringify(items) + '\n')
const berries = items.filter((i) => i.kind === 'berry').length
console.log(`✅ items ${items.length} (battle ${items.length - berries}, berry ${berries})`)
