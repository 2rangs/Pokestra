/**
 * PokeAPI CSV 덤프(data/v2/csv) 공용 도우미. buildI18nData.mjs, buildItemsData.mjs 가 함께 쓴다.
 */
import fs from 'fs'
import path from 'path'

export const CSV_BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv'

// PokeAPI language ids
export const LANG = { ja: 11, jaKana: 1, ko: 3, en: 9 }

// ── CSV ──
export function parseCsv(text) {
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

export async function loadCsv(name, csvDir) {
    const file = path.join(csvDir, `${name}.csv`)
    if (!fs.existsSync(file)) {
        fs.mkdirSync(csvDir, { recursive: true })
        console.log(`  ↓ ${name}.csv`)
        const res = await fetch(`${CSV_BASE}/${name}.csv`)
        if (!res.ok) throw new Error(`${name}.csv: HTTP ${res.status}`)
        fs.writeFileSync(file, await res.text())
    }
    return parseCsv(fs.readFileSync(file, 'utf8'))
}

/** rows → Map<id, {ko,en,ja}> (일본어는 한자 표기 우선, 없으면 가나) */
export function nameTable(rows, idKey, langKey = 'local_language_id', valueKey = 'name') {
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

export function cleanFlavor(text, lang) {
    const t = text.replace(/­\s*/g, '').replace(/\f/g, '\n')
    return lang === 'ja'
        ? t.replace(/[\n\s]+/g, (s) => (s.includes('\n') ? '' : s.includes('　') ? '　' : ' ')).trim()
        : t.replace(/\s+/g, ' ').trim()
}

/** 가장 최신 버전그룹의 설명을 언어별로 고른다 */
export function flavorTable(rows, idKey) {
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

export const num = (s) => (s === '' ? null : Number(s))
