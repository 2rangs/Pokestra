// 한국어 설명이 빠진 도구·기술·특성을 PokeAPI flavor_text_entries 의 한국어(가장 최근 버전)로 채운다.
// 실행: node scripts/fill-ko-descs.mjs   (curl 사용 — 프록시 설정을 그대로 쓰도록)
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const api = (path) => JSON.parse(execFileSync('curl', ['-sS', '--fail', '--retry', '3', `https://pokeapi.co/api/v2/${path}/`], { encoding: 'utf8' }))
const clean = (s) => s.replace(/[\n\f\r­]+/g, ' ').replace(/\s+/g, ' ').trim()

for (const [file, kind] of [['items', 'item'], ['moves', 'move'], ['abilities', 'ability']]) {
    const url = new URL(`../src/data/${file}.json`, import.meta.url)
    const list = JSON.parse(readFileSync(url, 'utf8'))
    let filled = 0
    const missing = []
    for (const x of list) {
        if (x.desc?.ko) continue
        const d = api(`${kind}/${x.name}`)
        const ko = (d.flavor_text_entries ?? []).filter((e) => e.language.name === 'ko').at(-1)
        if (ko) {
            x.desc = { ...(x.desc ?? {}), ko: clean(ko.flavor_text ?? ko.text) }
            filled++
        } else missing.push(x.name)
    }
    writeFileSync(url, (file === 'items' ? JSON.stringify(list) : JSON.stringify(list, null, 2)) + '\n')
    console.log(file, 'filled', filled, 'still missing', missing.length, missing.join(' '))
}
