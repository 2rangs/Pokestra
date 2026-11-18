/**
 * 다국어(ko/en/ja) 이름·설명과 기술/특성 상세 데이터를 src/data/*.json 에 채운다.
 *
 * 실행: node src/script/buildI18nData.mjs [csv-dir]
 *
 * PokeAPI 저장소의 CSV 덤프(data/v2/csv)를 사용한다. csv-dir 을 주지 않으면
 * node_modules/.cache/pokeapi-csv 에 내려받아 캐시한다.
 * fetchData.mjs 로 만든 기본 JSON 이 이미 있어야 한다.
 */
import fs from 'fs'
import path from 'path'
import { loadCsv, nameTable, flavorTable, num } from './pokeapiCsv.mjs'

const DATA_DIR = path.resolve('./src/data')
const CSV_DIR = path.resolve(process.argv[2] ?? './node_modules/.cache/pokeapi-csv')

const FILES = [
    'pokemon', 'pokemon_species_names', 'moves', 'move_names', 'move_flavor_text',
    'type_names', 'abilities', 'ability_names', 'ability_flavor_text', 'pokemon_abilities',
    'egg_groups', 'egg_group_prose', 'generation_names', 'natures', 'nature_names', 'items', 'item_names',
]

const readJson = (f) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'))
const writeJson = (f, v, pretty = true) =>
    fs.writeFileSync(path.join(DATA_DIR, f), JSON.stringify(v, null, pretty ? 2 : undefined) + '\n')


// ── main ──
console.log(`CSV: ${CSV_DIR}`)
const csv = {}
for (const f of FILES) csv[f] = await loadCsv(f, CSV_DIR)

// 타입
const typeNames = nameTable(csv.type_names, 'type_id')
const types = readJson('types.json').map((t) => {
    const n = typeNames.get(String(t.id)) ?? {}
    return { id: t.id, name: t.name, nameKo: t.nameKo ?? n.ko, nameEn: n.en, nameJa: n.ja }
})
writeJson('types.json', types)

// 세대
const genNames = nameTable(csv.generation_names, 'generation_id')
writeJson('generations.json', readJson('generations.json').map((g) => {
    const n = genNames.get(String(g.id)) ?? {}
    return { id: g.id, name: g.name, nameKo: g.nameKo, nameEn: n.en, nameJa: n.ja, pokemonSpecies: g.pokemonSpecies }
}))

// 알 그룹
const eggIdBySlug = new Map(csv.egg_groups.map((e) => [e.identifier, e.id]))
const eggNames = nameTable(csv.egg_group_prose, 'egg_group_id')
writeJson('eggGroups.json', readJson('eggGroups.json').map((e) => {
    const n = eggNames.get(eggIdBySlug.get(e.name)) ?? {}
    return { name: e.name, nameKo: e.nameKo, nameEn: n.en, nameJa: n.ja }
}))

// 기술
const moveRows = new Map(csv.moves.map((m) => [m.id, m]))
const moveNames = nameTable(csv.move_names, 'move_id')
const moveFlavor = flavorTable(csv.move_flavor_text, 'move_id')
const moves = readJson('moves.json').map((m) => {
    const r = moveRows.get(String(m.id))
    const n = moveNames.get(String(m.id)) ?? {}
    return {
        id: m.id,
        name: m.name,
        nameKo: m.nameKo ?? n.ko ?? null,
        nameEn: n.en ?? null,
        nameJa: n.ja ?? null,
        type: m.type,
        damageClass: m.damageClass,
        power: r ? num(r.power) : null,
        accuracy: r ? num(r.accuracy) : null,
        pp: r ? num(r.pp) : null,
        priority: r ? num(r.priority) ?? 0 : 0,
        generation: r ? num(r.generation_id) : null,
        desc: moveFlavor.get(String(m.id)) ?? null,
    }
})
writeJson('moves.json', moves)

// 특성
const abilityNames = nameTable(csv.ability_names, 'ability_id')
const abilityFlavor = flavorTable(csv.ability_flavor_text, 'ability_id')
const abilities = csv.abilities
    .filter((a) => a.is_main_series === '1')
    .map((a) => {
        const n = abilityNames.get(a.id) ?? {}
        return {
            id: Number(a.id),
            name: a.identifier,
            nameKo: n.ko ?? null,
            nameEn: n.en ?? null,
            nameJa: n.ja ?? null,
            generation: num(a.generation_id),
            desc: abilityFlavor.get(a.id) ?? null,
        }
    })
writeJson('abilities.json', abilities)
const abilitySlugById = new Map(csv.abilities.map((a) => [a.id, a.identifier]))

// 포켓몬: 이름(en/ja) + 특성
const speciesIdByPokemon = new Map(csv.pokemon.map((p) => [p.id, p.species_id]))
const speciesNames = nameTable(csv.pokemon_species_names, 'pokemon_species_id')
const abilitiesByPokemon = new Map()
for (const r of csv.pokemon_abilities) {
    const list = abilitiesByPokemon.get(r.pokemon_id) ?? []
    list.push({ slot: Number(r.slot), name: abilitySlugById.get(r.ability_id), hidden: r.is_hidden === '1' })
    abilitiesByPokemon.set(r.pokemon_id, list)
}
const pokemon = readJson('pokemon.json').map((p) => {
    const n = speciesNames.get(speciesIdByPokemon.get(String(p.id))) ?? {}
    const abil = (abilitiesByPokemon.get(String(p.id)) ?? [])
        .sort((a, b) => a.slot - b.slot)
        .map(({ name, hidden }) => ({ name, hidden }))
    return {
        id: p.id,
        name: p.name,
        nameKo: p.nameKo,
        nameEn: n.en ?? null,
        nameJa: n.ja ?? null,
        types: p.types,
        sprite: p.sprite,
        spriteShiny: p.spriteShiny,
        stats: p.stats,
        abilities: abil,
        moves: p.moves,
        eggGroups: p.eggGroups,
    }
})
writeJson('pokemon.json', pokemon)

// 성격 / 도구 이름
const natureNames = nameTable(csv.nature_names, 'nature_id')
writeJson('natureNames.json', Object.fromEntries(csv.natures.map((n) => {
    const t = natureNames.get(n.id) ?? {}
    return [n.identifier, { ko: t.ko ?? null, en: t.en ?? null, ja: t.ja ?? null }]
})))
const itemNames = nameTable(csv.item_names, 'item_id')
writeJson('itemNames.json', Object.fromEntries(csv.items.flatMap((it) => {
    const t = itemNames.get(it.id)
    return t ? [[it.identifier, { ko: t.ko ?? null, en: t.en ?? null, ja: t.ja ?? null }]] : []
})), false)

console.log(`✅ types ${types.length}, moves ${moves.length}, abilities ${abilities.length}, pokemon ${pokemon.length}`)
