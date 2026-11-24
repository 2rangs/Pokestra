// PokeAPI CSV(pokemon_forms, pokemon_form_names) → src/data/formNames.json
// 폼 포켓몬 id → { ko, ja, en } 공식 폼 이름. 화면의 폼 라벨은 이 값을 먼저 쓰고, 없을 때만 토큰 사전으로 만든다.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv'
const get = (f) => execFileSync('curl', ['-sS', '--fail', '--retry', '3', `${BASE}/${f}.csv`], { encoding: 'utf8', maxBuffer: 1 << 25 })

/** 따옴표 안 쉼표를 지원하는 CSV 한 줄 파서 */
function parseLine(line) {
    const out = []
    let cur = ''
    let q = false
    for (let i = 0; i < line.length; i++) {
        const c = line[i]
        if (q) {
            if (c === '"' && line[i + 1] === '"') (cur += '"'), i++
            else if (c === '"') q = false
            else cur += c
        } else if (c === '"') q = true
        else if (c === ',') out.push(cur), (cur = '')
        else cur += c
    }
    out.push(cur)
    return out
}
const rows = (text) => text.trim().split(/\r?\n/).slice(1).map(parseLine)

// pokemon_id → 기본 폼 id
const formOf = new Map()
for (const [id, , , pokemonId, , isDefault] of rows(get('pokemon_forms'))) {
    if (isDefault === '1') formOf.set(Number(pokemonId), Number(id))
}
const LANG = { 3: 'ko', 11: 'ja', 9: 'en' }
const names = new Map()
for (const [formId, langId, formName] of rows(get('pokemon_form_names'))) {
    const lang = LANG[langId]
    if (!lang || !formName) continue
    const m = names.get(Number(formId)) ?? {}
    m[lang] = formName
    names.set(Number(formId), m)
}

const dex = JSON.parse(readFileSync(new URL('../src/data/pokemon.json', import.meta.url), 'utf8'))
const list = Array.isArray(dex) ? dex : dex.pokemon
const out = {}
for (const p of list) {
    if (p.id <= 10000) continue
    const n = names.get(formOf.get(p.id))
    if (n) out[p.id] = n
}
writeFileSync(new URL('../src/data/formNames.json', import.meta.url), JSON.stringify(out, null, 0) + '\n')
console.log(`forms with names: ${Object.keys(out).length}`)
