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

const DATA_DIR = path.resolve('./src/data')
const CSV_DIR = path.resolve(process.argv[2] ?? './node_modules/.cache/pokeapi-csv')
const CSV_BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv'

const FILES = [
    'pokemon', 'pokemon_species_names', 'moves', 'move_names', 'move_flavor_text',
    'type_names', 'abilities', 'ability_names', 'ability_flavor_text', 'pokemon_abilities',
    'egg_groups', 'egg_group_prose', 'generation_names', 'natures', 'nature_names', 'items', 'item_names',
]

// PokeAPI language ids
const LANG = { ja: 11, jaKana: 1, ko: 3, en: 9 }

// ── CSV ──
function parseCsv(text) {
    const rows = []
    let row = [], field = '', quoted = false
    for (let i = 0; i < text.length; i++) {
        const c = text[i]
        if (quoted) {
            if (c === '"') {
                if (text[i + 1] === '"') { field += '"'; i++ } else quoted = false
            } else field += c
        } else if (c === '"') quoted = true
        else if (c === ',') { row.push(field); field = '' }
        else if (c === '\n' || c === '\r') {
            if (c === '\r' && text[i + 1] === '\n') i++
            row.push(field); rows.push(row); row = []; field = ''
        } else field += c
    }
    if (field || row.length) { row.push(field); rows.push(row) }
    const [header, ...body] = rows.filter(r => r.length > 1 || r[0])
    return body.map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])))
}

async function loadCsv(name) {
    const file = path.join(CSV_DIR, `${name}.csv`)
    if (!fs.existsSync(file)) {
        fs.mkdirSync(CSV_DIR, { recursive: true })
        console.log(`  ↓ ${name}.csv`)
        const res = await fetch(`${CSV_BASE}/${name}.csv`)
        if (!res.ok) throw new Error(`${name}.csv: HTTP ${res.status}`)
        fs.writeFileSync(file, await res.text())
    }
    return parseCsv(fs.readFileSync(file, 'utf8'))
}

const readJson = (f) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'))
const writeJson = (f, v, pretty = true) =>
    fs.writeFileSync(path.join(DATA_DIR, f), JSON.stringify(v, null, pretty ? 2 : undefined) + '\n')

/** rows → Map<id, {ko,en,ja}> (일본어는 한자 표기 우선, 없으면 가나) */
function nameTable(rows, idKey, langKey = 'local_language_id', valueKey = 'name') {
    const m = new Map()
    for (const r of rows) {
        const lang = Number(r[langKey])
        const e = m.get(r[idKey]) ?? {}
        if (lang === LANG.ko) e.ko = r[valueKey]
        else if (lang === LANG.en) e.en = r[valueKey]
        else if (lang === LANG.ja) e.ja = r[valueKey]
        else if (lang === LANG.jaKana) e.jaKana = r[valueKey]
        m.set(r[idKey], e)
    }
    for (const e of m.values()) { e.ja ??= e.jaKana; delete e.jaKana }
    return m
}

function cleanFlavor(text, lang) {
    const t = text.replace(/­\s*/g, '').replace(/\f/g, '\n')
    return lang === 'ja'
        ? t.replace(/[\n\s]+/g, (s) => (s.includes('\n') ? '' : s.includes('　') ? '　' : ' ')).trim()
        : t.replace(/\s+/g, ' ').trim()
}

/** 가장 최신 버전그룹의 설명을 언어별로 고른다 */
function flavorTable(rows, idKey) {
    const best = new Map()
    for (const r of rows) {
        const lang = Number(r.language_id)
        const key = lang === LANG.ko ? 'ko' : lang === LANG.en ? 'en' : lang === LANG.ja ? 'ja' : lang === LANG.jaKana ? 'jaKana' : null
        if (!key) continue
        const vg = Number(r.version_group_id)
        const e = best.get(r[idKey]) ?? {}
        if (!e[key] || e[key].vg < vg) e[key] = { vg, text: cleanFlavor(r.flavor_text, key === 'jaKana' ? 'ja' : key) }
        best.set(r[idKey], e)
    }
    const out = new Map()
    for (const [id, e] of best) {
        out.set(id, {
            ko: e.ko?.text ?? null,
            en: e.en?.text ?? null,
            ja: (e.ja ?? e.jaKana)?.text ?? null,
        })
    }
    return out
}

const num = (s) => (s === '' ? null : Number(s))

// ── main ──
console.log(`CSV: ${CSV_DIR}`)
const csv = {}
for (const f of FILES) csv[f] = await loadCsv(f)

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
