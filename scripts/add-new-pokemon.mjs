// pokemon.json 에 없는 포켓몬(예: 레전드 Z-A·메가 차원 러시의 새 메가진화)을 PokeAPI 에서 받아 같은 모양으로 덧붙인다.
// 기존 항목은 건드리지 않는다 (src/script/fetchData.mjs 는 모든 데이터를 새로 써서 한국어 보정이 사라지므로 쓰지 않는다).
// 실행: node scripts/add-new-pokemon.mjs   (curl 사용 — 프록시 설정을 그대로 쓰도록)
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const api = (url) => JSON.parse(execFileSync('curl', ['-sS', '--fail', '--retry', '3', url], { encoding: 'utf8', maxBuffer: 1 << 26 }))
const BASE = 'https://pokeapi.co/api/v2'
const FILE = new URL('../src/data/pokemon.json', import.meta.url)

const list = JSON.parse(readFileSync(FILE, 'utf8'))
const have = new Set(list.map((p) => p.id))
const all = api(`${BASE}/pokemon?limit=3000`).results
const idOf = (r) => Number(r.url.split('/').filter(Boolean).pop())
const missing = all.filter((r) => !have.has(idOf(r)))
console.log(`missing: ${missing.length}`)

const speciesNames = new Map()
const namesOf = (speciesUrl) => {
    if (!speciesNames.has(speciesUrl)) {
        const s = api(speciesUrl)
        const pick = (...langs) => langs.map((l) => s.names.find((n) => n.language.name === l)?.name).find(Boolean) ?? null
        speciesNames.set(speciesUrl, { ko: pick('ko'), en: pick('en'), ja: pick('ja-Hrkt', 'ja') })
    }
    return speciesNames.get(speciesUrl)
}

for (const r of missing) {
    const p = api(r.url)
    const n = namesOf(p.species.url)
    const stat = (k) => p.stats.find((s) => s.stat.name === k)?.base_stat ?? 0
    list.push({
        id: p.id,
        name: p.name,
        nameKo: n.ko,
        nameEn: n.en,
        nameJa: n.ja,
        types: p.types.sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
        sprite: p.sprites.front_default,
        spriteShiny: p.sprites.front_shiny,
        stats: { hp: stat('hp'), attack: stat('attack'), defense: stat('defense'), spAtk: stat('special-attack'), spDef: stat('special-defense'), speed: stat('speed') },
        abilities: p.abilities.sort((a, b) => a.slot - b.slot).map((a) => ({ name: a.ability.name, hidden: a.is_hidden })),
        moves: p.moves.map((m) => m.move.name),
        eggGroups: [],
        genderDiff: false,
    })
    console.log(`+ ${p.id} ${p.name} (${n.ko})`)
}
list.sort((a, b) => a.id - b.id)
writeFileSync(FILE, JSON.stringify(list, null, 2) + '\n')
console.log(`pokemon.json: ${list.length}`)
