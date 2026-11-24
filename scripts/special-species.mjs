// 전설·환상의 포켓몬 번호 목록: PokeAPI 저장소의 CSV(pokemon_species.csv 의 is_legendary/is_mythical)에서 만든다.
// 로컬 도감 데이터(pokemon.json)에는 이 정보가 없어서 홈의 "전설·환상" 줄에 쓴다.
// 실행: node scripts/special-species.mjs   (curl 로 받는다 — 프록시 설정을 그대로 쓰도록)
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const CSV_URL = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species.csv'
const csv = execFileSync('curl', ['-sS', '--fail', '--retry', '3', CSV_URL], { encoding: 'utf8', maxBuffer: 1 << 24 })
const [header, ...rows] = csv.trim().split('\n')
const col = Object.fromEntries(header.split(',').map((h, i) => [h, i]))
const legendary = []
const mythical = []
for (const line of rows) {
    const c = line.split(',')
    const id = Number(c[col.id])
    if (!id || id > 1025) continue
    if (c[col.is_legendary] === '1') legendary.push(id)
    if (c[col.is_mythical] === '1') mythical.push(id)
}
writeFileSync(new URL('../src/data/specialSpecies.json', import.meta.url), JSON.stringify({ legendary, mythical }) + '\n')
console.log(`legendary ${legendary.length}, mythical ${mythical.length}`)
