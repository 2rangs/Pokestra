// 포켓몬 위키(pokemon.fandom.com/ko, CC BY-SA)의 문서에서 한국어 도감 설명을 모아
// public/data/flavor-ko/{종 번호}.json 으로 쓴다. 상세 화면이 필요할 때만 받아 PokeAPI 에 없는 한국어 설명(1~5세대, 모습별 설명)을 채운다.
// - 위키 일반 페이지는 봇 확인이 걸려 있어 MediaWiki 공개 API(api.php, action=parse, prop=wikitext)만 쓴다.
// - 서버 부담을 줄이려고 한 번에 한 문서씩, 요청 사이에 쉬고, 이미 받은 문서는 캐시(scratch)에서 다시 쓴다.
// - 1~3세대(금·은 제외) 작품은 한국어판이 없어 위키의 번역이다 → 화면에서 "위키 번역"으로 표시.
// 실행: node scripts/wiki-flavors.mjs [캐시 폴더]
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const CACHE = process.argv[2] ?? '.wiki-cache'
const OUT = new URL('../public/data/flavor-ko/', import.meta.url)
mkdirSync(CACHE, { recursive: true })
mkdirSync(OUT, { recursive: true })

const API = 'https://pokemon.fandom.com/ko/api.php'
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
function wikitext(title) {
    const file = `${CACHE}/${encodeURIComponent(title)}.json`
    if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'))
    sleep(400)
    const out = execFileSync(
        'curl',
        ['-sS', '--retry', '3', '-A', 'pokestra-data-build/1.0', '-G', API, '--data-urlencode', 'action=parse', '--data-urlencode', `page=${title}`,
            '--data-urlencode', 'prop=wikitext', '--data-urlencode', 'format=json', '--data-urlencode', 'redirects=1'],
        { encoding: 'utf8', maxBuffer: 1 << 26 },
    )
    const d = JSON.parse(out)
    const w = d.parse?.wikitext?.['*'] ?? null
    writeFileSync(file, JSON.stringify(w))
    return w
}

/** 위키 작품 표기 → PokeAPI version slug */
const VERSION = {
    레드: 'red', 그린: 'green', 블루: 'blue', 피카츄: 'yellow', 금: 'gold', 은: 'silver', 크리스탈: 'crystal',
    루비: 'ruby', 사파이어: 'sapphire', 에메랄드: 'emerald', 파이어레드: 'firered', 리프그린: 'leafgreen',
    디아루가: 'diamond', 다이아몬드: 'diamond', 펄기아: 'pearl', 펄: 'pearl', 기라티나: 'platinum', 플라티나: 'platinum',
    하트골드: 'heartgold', 소울실버: 'soulsilver', 블랙: 'black', 화이트: 'white', 블랙2: 'black-2', 화이트2: 'white-2',
    X: 'x', Y: 'y', 오메가루비: 'omega-ruby', 알파사파이어: 'alpha-sapphire', 썬: 'sun', 문: 'moon', 울트라썬: 'ultra-sun', 울트라문: 'ultra-moon',
    '레츠고! 피카츄': 'lets-go-pikachu', '레츠고! 이브이': 'lets-go-eevee', '레츠고 피카츄': 'lets-go-pikachu', '레츠고 이브이': 'lets-go-eevee',
    소드: 'sword', 실드: 'shield', '레전즈 아르세우스': 'legends-arceus', '레전드 아르세우스': 'legends-arceus',
    '브릴리언트 다이아몬드': 'brilliant-diamond', '샤이닝 펄': 'shining-pearl', 스칼렛: 'scarlet', 바이올렛: 'violet',
    '레전즈 Z-A': 'legends-za', '레전드 Z-A': 'legends-za',
}

// PokeAPI CSV: 포켓몬 id → 종 id, 폼 공식 한국어 이름
const csv = (name) => execFileSync('curl', ['-sS', '--fail', `https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/${name}.csv`], { encoding: 'utf8', maxBuffer: 1 << 26 })
const speciesOf = new Map(csv('pokemon').trim().split('\n').slice(1).map((l) => l.split(',')).map((c) => [Number(c[0]), Number(c[2])]))
const pokemon = JSON.parse(readFileSync(new URL('../src/data/pokemon.json', import.meta.url), 'utf8'))
const formNames = JSON.parse(readFileSync(new URL('../src/data/formNames.json', import.meta.url), 'utf8'))
const norm = (s) => s.replace(/[\s·・()（）]/g, '').toLowerCase()

/** 위키 폼 표기("메가리자몽X", "알로라의 모습", "거다이맥스 리자몽") → 그 종의 모습 id */
function matchForm(label, forms) {
    const n = norm(label)
    const exact = forms.find((f) => formNames[f.id]?.ko && norm(formNames[f.id].ko) === n)
    if (exact) return exact.id
    const has = (f, tok) => f.name.split('-').includes(tok)
    const rules = [
        ['거다이맥스', (f) => has(f, 'gmax')], ['알로라', (f) => has(f, 'alola')], ['가라르', (f) => has(f, 'galar')],
        ['히스이', (f) => has(f, 'hisui')], ['팔데아', (f) => has(f, 'paldea')],
    ]
    for (const [kw, ok] of rules) if (label.includes(kw)) return forms.find(ok)?.id ?? null
    if (label.includes('메가')) {
        const letter = /([XYZ])\s*$/.exec(label)?.[1]?.toLowerCase()
        const megas = forms.filter((f) => has(f, 'mega'))
        return (letter ? megas.find((f) => has(f, letter)) : megas.find((f) => !/-mega-[xyz]$/.test(f.name)))?.id ?? megas[0]?.id ?? null
    }
    return null
}

/** {{틀|a=b|c=d}} 의 이름 있는 인자 (중괄호 안 중괄호는 고려하지 않는다: 도감 틀에는 없다) */
const args = (s) => Object.fromEntries([...s.matchAll(/\|([^=|{}]+)=([^|{}]*)/g)].map((m) => [m[1].trim(), m[2].trim()]))
const clean = (t) => t.replace(/<br\s*\/?>/g, ' ').replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1').replace(/'''?/g, '').replace(/\s+/g, ' ').trim()

const unknownVersions = new Set()
const unmatchedForms = []
let pages = 0
let entries = 0
const species = pokemon.filter((p) => p.id <= 10000)
for (const sp of species) {
    const w = wikitext(`${sp.nameKo} (포켓몬)`) ?? wikitext(sp.nameKo)
    if (!w) {
        console.log(`  ! 문서 없음: ${sp.id} ${sp.nameKo}`)
        continue
    }
    pages++
    const forms = pokemon.filter((p) => p.id > 10000 && speciesOf.get(p.id) === sp.id)
    const start = w.indexOf('{{도감/시작')
    const end = w.indexOf('{{도감/끝}}', start)
    if (start < 0) continue
    const body = w.slice(start, end < 0 ? undefined : end)
    const out = []
    let gen = 0
    let form = null
    for (const m of body.matchAll(/\{\{도감\/(세대|폼|설명\d)((?:\|[^{}]*)?)\}\}/g)) {
        const [, kind, rest] = m
        if (kind === '세대') {
            gen = Number(args(rest).세대) || 0
            form = null
        } else if (kind === '폼') {
            const label = rest.replace(/^\|/, '').trim()
            form = { label, id: matchForm(label, forms) }
            if (form.id === null) unmatchedForms.push(`${sp.id} ${sp.nameKo}: ${label}`)
        } else {
            const a = args(rest)
            const names = Object.keys(a).filter((k) => /^버전\d*$/.test(k)).sort().map((k) => a[k])
            const versions = names.map((v) => VERSION[v] ?? (unknownVersions.add(v), null)).filter(Boolean)
            const text = clean(a.설명 ?? '')
            if (!versions.length || !text) continue
            if (form && form.id === null) continue
            out.push(form ? { v: versions, t: text, g: gen, f: form.id } : { v: versions, t: text, g: gen })
        }
    }
    entries += out.length
    if (out.length) writeFileSync(new URL(`${sp.id}.json`, OUT), JSON.stringify(out) + '\n')
    if (sp.id % 50 === 0) console.log(`  ${sp.id}/${species.length} …`)
}
console.log(`문서 ${pages}, 설명 ${entries}`)
console.log('모르는 작품 표기:', [...unknownVersions].join(', ') || '없음')
console.log(`짝을 못 찾은 모습 ${unmatchedForms.length}:`, unmatchedForms.slice(0, 40).join(' / '))
