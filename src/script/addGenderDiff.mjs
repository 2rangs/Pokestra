/**
 * pokemon.json 의 각 항목에 genderDiff(암수 모습이 다른 종인가)를 채운다.
 * 다른 필드는 건드리지 않는다.
 *
 * 실행: node src/script/addGenderDiff.mjs
 * PokeAPI 의 pokemon_species.csv 의 has_gender_differences 를 사용한다.
 * 폼(id > 10000)은 원종의 값을 따른다 (pokemon.csv 의 species_id).
 */
import fs from 'fs'
import path from 'path'

const FILE = path.resolve('./src/data/pokemon.json')
const CSV_BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv'

const text = async (name) => {
    const res = await fetch(`${CSV_BASE}/${name}.csv`)
    if (!res.ok) throw new Error(`${name}.csv: HTTP ${res.status}`)
    return res.text()
}
// 이 두 CSV 에는 따옴표 필드가 없는 열만 쓰므로 단순 분할로 충분하다
const rows = (csv) => {
    const [head, ...body] = csv.trim().split('\n')
    const cols = head.split(',')
    return body.map((l) => Object.fromEntries(l.split(',').map((v, i) => [cols[i], v])))
}

const species = new Map(rows(await text('pokemon_species')).map((r) => [r.id, r.has_gender_differences === '1']))
const speciesOf = new Map(rows(await text('pokemon')).map((r) => [r.id, r.species_id]))

const pokemon = JSON.parse(fs.readFileSync(FILE, 'utf8'))
let n = 0
for (const p of pokemon) {
    p.genderDiff = species.get(speciesOf.get(String(p.id))) ?? false
    if (p.genderDiff) n++
}
fs.writeFileSync(FILE, JSON.stringify(pokemon, null, 2) + '\n')
console.log(`genderDiff: ${n}/${pokemon.length}`)
