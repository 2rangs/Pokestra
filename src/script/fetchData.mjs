/**
 * 실행: node scripts/fetchData.mjs
 * 결과: src/data/*.json 생성
 */

import fs from 'fs'
import path from 'path'

const BASE = 'https://pokeapi.co/api/v2'
const OUT_DIR = path.resolve('./src/data')

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

const get = async (url) => {
  const res = await fetch(url)
  return res.json()
}

const getKoName = (names) =>
  names.find((n) => n.language.name === 'ko')?.name ?? null

// 동시 요청 수 제한 (rate limit 방지)
const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size))

const fetchAll = async (items, fetcher, label) => {
  const results = []
  const chunks = chunk(items, 20)
  for (let i = 0; i < chunks.length; i++) {
    console.log(`  ${label}: ${i * 20}/${items.length}`)
    const batch = await Promise.all(chunks[i].map(fetcher))
    results.push(...batch)
  }
  return results
}

// ── 1. 타입 ──────────────────────────────────────────────
console.log('📦 타입 fetch 중...')
const typeList = await get(`${BASE}/type?limit=100`)
const typeDetails = await fetchAll(
  typeList.results,
  (t) => get(t.url),
  '타입'
)
const types = typeDetails
  .filter((t) => t.id <= 18) // 알 수 없는/없음 타입 제외
  .map((t) => ({
    id: t.id,
    name: t.name,
    nameKo: getKoName(t.names),
  }))
fs.writeFileSync(`${OUT_DIR}/types.json`, JSON.stringify(types, null, 2))
console.log(`✅ types.json 저장 (${types.length}개)`)

// ── 2. 알 그룹 ───────────────────────────────────────────
console.log('📦 알 그룹 fetch 중...')
const eggList = await get(`${BASE}/egg-group?limit=100`)
const eggDetails = await fetchAll(
  eggList.results,
  (e) => get(e.url),
  '알그룹'
)
const eggGroups = eggDetails.map((e) => ({
  name: e.name,
  nameKo: getKoName(e.names),
}))
fs.writeFileSync(`${OUT_DIR}/eggGroups.json`, JSON.stringify(eggGroups, null, 2))
console.log(`✅ eggGroups.json 저장 (${eggGroups.length}개)`)

// ── 3. 세대 ──────────────────────────────────────────────
console.log('📦 세대 fetch 중...')
const genList = await get(`${BASE}/generation?limit=100`)
const genDetails = await fetchAll(
  genList.results,
  (g) => get(g.url),
  '세대'
)
const generations = genDetails.map((g) => ({
  id: g.id,
  name: g.name,
  nameKo: getKoName(g.names),
  pokemonSpecies: g.pokemon_species.map((p) => p.name),
}))
fs.writeFileSync(`${OUT_DIR}/generations.json`, JSON.stringify(generations, null, 2))
console.log(`✅ generations.json 저장 (${generations.length}개)`)

// ── 4. 기술 ──────────────────────────────────────────────
console.log('📦 기술 fetch 중... (시간이 좀 걸려요)')
const moveList = await get(`${BASE}/move?limit=2000`)
const moveDetails = await fetchAll(
  moveList.results,
  (m) => get(m.url),
  '기술'
)
const moves = moveDetails.map((m) => ({
  id: m.id,
  name: m.name,
  nameKo: getKoName(m.names),
  type: m.type.name,
  damageClass: m.damage_class.name, // physical / special / status
}))
fs.writeFileSync(`${OUT_DIR}/moves.json`, JSON.stringify(moves, null, 2))
console.log(`✅ moves.json 저장 (${moves.length}개)`)

// ── 5. 포켓몬 기본 정보 ──────────────────────────────────
console.log('📦 포켓몬 fetch 중... (시간이 꽤 걸려요)')
const pokeList = await get(`${BASE}/pokemon?limit=1302`)

// species에서 한글명 가져오기
const speciesList = await get(`${BASE}/pokemon-species?limit=1302`)
const speciesDetails = await fetchAll(
  speciesList.results,
  (s) => get(s.url),
  '포켓몬 종'
)
const koNameMap = Object.fromEntries(
  speciesDetails.map((s) => [s.name, getKoName(s.names)])
)

const pokeDetails = await fetchAll(
  pokeList.results,
  (p) => get(p.url),
  '포켓몬'
)
const pokemon = pokeDetails.map((p) => ({
  id: p.id,
  name: p.name,
  nameKo: koNameMap[p.species?.name] ?? null,
  types: p.types.map((t) => t.type.name),
  sprite: p.sprites.front_default,
  spriteShiny: p.sprites.front_shiny,
  stats: {
    hp: p.stats[0].base_stat,
    attack: p.stats[1].base_stat,
    defense: p.stats[2].base_stat,
    spAtk: p.stats[3].base_stat,
    spDef: p.stats[4].base_stat,
    speed: p.stats[5].base_stat,
  },
  moves: p.moves.map((m) => m.move.name),
  eggGroups: [], // species에서 따로 매핑 필요시 추가
}))
fs.writeFileSync(`${OUT_DIR}/pokemon.json`, JSON.stringify(pokemon, null, 2))
console.log(`✅ pokemon.json 저장 (${pokemon.length}개)`)

console.log('\n🎉 완료! src/data/ 폴더를 확인하세요.')
