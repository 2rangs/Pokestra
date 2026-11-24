// 기술 설명 보정: src/data/moves.json 에서 "사용할 수 없는 기술입니다…" 같은 안내문을 실제 설명으로 바꾼다.
//
// 왜: 데이터는 기술마다 가장 최근 작품의 설명 하나만 담는다. 소드·실드에서 빠진 기술(Z기술 53개, 레츠고 전용기,
// 태권당수·소닉붐 같은 일반 기술 등)은 최근 설명이 "사용할 수 없는 기술입니다. 잊게 하는 것을 권장합니다"라는
// 안내문뿐이다. PokeAPI 의 작품별 설명 중 안내문이 아닌 가장 최근 것을 언어별(ko/en/ja)로 고른다.
//
// 실행: node scripts/fix-move-descs.mjs   (PokeAPI 를 curl 로 부른다 — 프록시 설정을 그대로 쓰도록)
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const FILE = new URL('../src/data/moves.json', import.meta.url)
const LANGS = { ko: ['ko'], en: ['en'], ja: ['ja', 'ja-Hrkt'] }

/** 안내문(사용할 수 없는 기술) 판별: 세 언어 모두 */
export function isUnusableNotice(text) {
    if (!text) return false
    return /사용할 수 없는 기술/.test(text) || /This move can.t be used\. It.s recommended/i.test(text) || /この技は\s*使えません/.test(text)
}

const clean = (t) => t.replace(/[\n\f\r]+/g, ' ').replace(/\s+/g, ' ').trim()

function fetchMove(name) {
    const out = execFileSync('curl', ['-sS', '--fail', '--retry', '3', `https://pokeapi.co/api/v2/move/${name}`], { encoding: 'utf8', maxBuffer: 1 << 24 })
    return JSON.parse(out)
}

const data = JSON.parse(readFileSync(FILE, 'utf8'))
const moves = Array.isArray(data) ? data : data.moves
const targets = moves.filter((m) => m.desc && Object.values(m.desc).some(isUnusableNotice))
console.log(`보정 대상 ${targets.length}개`)

let fixed = 0
const missing = []
for (const m of targets) {
    const entries = fetchMove(m.name).flavor_text_entries
    for (const [lang, codes] of Object.entries(LANGS)) {
        if (!isUnusableNotice(m.desc[lang])) continue
        // PokeAPI 는 오래된 작품부터 → 뒤에서부터 안내문이 아닌 첫 설명
        const hit = [...entries].reverse().find((e) => codes.includes(e.language.name) && !isUnusableNotice(e.flavor_text))
        if (hit) {
            m.desc[lang] = lang === 'ja' ? hit.flavor_text.replace(/[\n\f\r]+/g, '').trim() : clean(hit.flavor_text) // 일본어는 기존 데이터처럼 전각 공백 유지
            fixed++
        } else missing.push(`${m.name}/${lang}`)
    }
}
// 원래 파일 형식(들여쓰기 2칸, 끝 줄바꿈) 유지
writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n')
console.log(`고친 설명 ${fixed}개, 대체 설명 없음 ${missing.length}개`, missing.slice(0, 20))
