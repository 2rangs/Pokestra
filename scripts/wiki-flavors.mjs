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
    레드: 'red', 그린: 'green', 블루: 'blue', 적: 'red', 녹: 'green', 청: 'blue', 피카츄: 'yellow', 금: 'gold', 은: 'silver', 크리스탈: 'crystal',
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
    // 위키 표기가 공식 이름을 품거나 그 반대("오리지널캡 피카츄" ⊃ "오리지널캡", "오리진폼")
    const part = forms.find((f) => {
        const o = formNames[f.id]?.ko
        return o && (n.includes(norm(o)) || norm(o).includes(n))
    })
    if (part) return part.id
    const has = (f, tok) => f.name.split('-').includes(tok)
    const rules = [
        ['거다이맥스', (f) => has(f, 'gmax')], ['알로라', (f) => has(f, 'alola')], ['가라르', (f) => has(f, 'galar')],
        ['히스이', (f) => has(f, 'hisui')], ['팔데아', (f) => has(f, 'paldea')], ['오리진', (f) => has(f, 'origin')],
        ['굴레를 벗어난', (f) => has(f, 'unbound')], ['블레이드', (f) => has(f, 'blade')], ['소과종', (f) => has(f, 'small')],
        ['대과종', (f) => has(f, 'large')], ['특대과종', (f) => has(f, 'super')], ['들킨', (f) => has(f, 'busted')], ['테라스탈', (f) => has(f, 'terastal')], ['스텔라', (f) => has(f, 'stellar')],
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
/** 설명이 아닌 자리 표시(등장하지 않음 등) */
const PLACEHOLDER = /^(등장하지 않음|미등장|없음|-|—|\?)$/
/** 위키 링크 [[문서|글]] → 글, [[분류:…]] 는 지운다. 인자 구분자 | 와 섞이지 않게 파싱 전에 푼다 */
const unlink = (w) => w.replace(/\[\[분류:[^\]]*\]\]/g, '').replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1')
/** 모습별로 <hr> 로 이어 쓴 설명은 " / " 로, <small>(이름)</small> 등 태그는 벗긴다 */
const clean = (t) =>
    t.replace(/<br\s*\/?>/g, ' ').replace(/<hr\s*\/?>/g, ' / ').replace(/<[^>]+>/g, '').replace(/'''?/g, '').replace(/\s+/g, ' ').trim()

const unknownVersions = new Set()
const GEN = { red: 1, green: 1, blue: 1, yellow: 1, gold: 2, silver: 2, crystal: 2, ruby: 3, sapphire: 3, emerald: 3, firered: 3, leafgreen: 3,
    diamond: 4, pearl: 4, platinum: 4, heartgold: 4, soulsilver: 4, black: 5, white: 5, 'black-2': 5, 'white-2': 5,
    x: 6, y: 6, 'omega-ruby': 6, 'alpha-sapphire': 6, sun: 7, moon: 7, 'ultra-sun': 7, 'ultra-moon': 7, 'lets-go-pikachu': 7, 'lets-go-eevee': 7,
    sword: 8, shield: 8, 'legends-arceus': 8, 'brilliant-diamond': 8, 'shining-pearl': 8, scarlet: 9, violet: 9, 'legends-za': 9 }

/** 옛 틀 {{포켓몬도감설명 …}} 의 "<작품> 도감=설명" 인자 */
function oldTemplate(w) {
    const i = w.indexOf('{{포켓몬도감설명')
    if (i < 0) return []
    let depth = 0
    let j = i
    for (; j < w.length; j++) {
        if (w.startsWith('{{', j)) (depth++, j++)
        else if (w.startsWith('}}', j)) {
            depth--
            j++
            if (depth === 0) break
        }
    }
    const out = []
    for (const m of w.slice(i, j).matchAll(/\|([^=|\n]+?)\s*도감\s*=([^|]*)/g)) {
        const v = VERSION[m[1].trim()]
        const text = clean(m[2].replace(/\s*\}+\s*$/, '')) // 틀의 마지막 인자에 붙은 닫는 괄호
        if (!v) {
            unknownVersions.add(m[1].trim())
            continue
        }
        if (text && !PLACEHOLDER.test(text)) out.push({ v: [v], t: text, g: GEN[v] ?? 0 })
    }
    return out
}
const unmatchedForms = []
let pages = 0
let entries = 0
const species = pokemon.filter((p) => p.id <= 10000)
for (const sp of species) {
    const raw = wikitext(`${sp.nameKo} (포켓몬)`) ?? wikitext(sp.nameKo)
    const w = raw && unlink(raw)
    if (!w) {
        console.log(`  ! 문서 없음: ${sp.id} ${sp.nameKo}`)
        continue
    }
    pages++
    const forms = pokemon.filter((p) => p.id > 10000 && speciesOf.get(p.id) === sp.id)
    const start = w.indexOf('{{도감/시작')
    const end = w.indexOf('{{도감/끝}}', start)
    if (start < 0) {
        // 옛 틀: {{포켓몬도감설명|세대=2|금 도감=…|은 도감=…}} (모습별 설명은 없다)
        const out = oldTemplate(w)
        entries += out.length
        if (out.length) writeFileSync(new URL(`${sp.id}.json`, OUT), JSON.stringify(out) + '\n')
        continue
    }
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
            // 짝이 없으면 대개 기본 모습(실드폼·평상시 모습·어나더폼)이나 데이터에 없는 꾸밈 모습(계절) → 종의 설명으로
            const id = matchForm(label, forms)
            if (id === null) unmatchedForms.push(`${sp.id} ${sp.nameKo}: ${label}`)
            form = id === null ? null : { label, id }
        } else {
            const a = args(rest)
            const names = Object.keys(a).filter((k) => /^버전\d*$/.test(k)).sort().map((k) => a[k])
            const versions = names.map((v) => VERSION[v] ?? (unknownVersions.add(v), null)).filter(Boolean)
            const text = clean(a.설명 ?? '')
            if (!versions.length || !text || PLACEHOLDER.test(text)) continue
            out.push(form ? { v: versions, t: text, g: gen, f: form.id } : { v: versions, t: text, g: gen })
        }
    }
    const seen = new Set()
    const uniq = out.filter((e) => {
        const k = `${e.f ?? ''}|${e.v.join(',')}|${e.t}`
        return seen.has(k) ? false : (seen.add(k), true)
    })
    entries += uniq.length
    if (uniq.length) writeFileSync(new URL(`${sp.id}.json`, OUT), JSON.stringify(uniq) + '\n')
    if (sp.id % 50 === 0) console.log(`  ${sp.id}/${species.length} …`)
}
console.log(`문서 ${pages}, 설명 ${entries}`)
console.log('모르는 작품 표기:', [...unknownVersions].join(', ') || '없음')
console.log(`짝을 못 찾아 종의 설명으로 넣은 모습 ${unmatchedForms.length}:`, unmatchedForms.join(' / '))
