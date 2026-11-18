// 밀도 점검 (섹션/제목은 제목 아래 64px 이상 보여야 '보임'으로 센다): node tools/density-check.cjs <label> [pages] [lang]   (NODE_PATH=$(npm root -g))
// env BASE (기본 http://localhost:5291/portfolio/pokestra/#), OUT (기본 ./density-out)
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')
const BASE = process.env.BASE || 'http://localhost:5291/portfolio/pokestra/#'
const OUT = process.env.OUT || 'density-out'
if (process.argv[2] === '--compare') {
    // 비교: 밀도 지표 변화 출력. 컨트롤이 작아졌거나, 가로 스크롤이 생겼거나, CLS ≥ 0.1 이면 exit 1
    const [a, b] = process.argv.slice(3).map((f) => JSON.parse(fs.readFileSync(f, 'utf8')))
    let bad = 0
    for (const k of Object.keys(b)) {
        const vw = Number(k.split('@')[1])
        if (!a[k]) { console.log(`${k}: no baseline, skipped comparison`) }
        const before = a[k] || {}
        const after = b[k]
        for (const [m, v] of Object.entries(after)) if (m !== 'controls') console.log(`${k} ${m}: ${before[m]} -> ${v}`)
        for (const [c, h] of Object.entries(after.controls || {})) {
            const was = (before.controls || {})[c]
            if (was != null && h < was) { bad++; console.log(`FAIL ${k} control ${c} shrank ${was} -> ${h}`) }
        }
        if (after.scrollWidth > vw) { bad++; console.log(`FAIL ${k} horizontal page scroll ${after.scrollWidth}`) }
        for (const m of ['cls', 'clsAfterScroll']) if ((after[m] ?? 0) >= 0.1) { bad++; console.log(`FAIL ${k} ${m} ${after[m]}`) }
    }
    console.log(bad ? `${bad} failure(s)` : 'OK')
    process.exit(bad ? 1 : 0)
}
const [label = 'run', only = 'home,pokedex,detail,moves,abilities,sprites', lang = 'ko'] = process.argv.slice(2)
const LOCALE = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP' }[lang]
const PAGES = { home: '/', pokedex: '/pokedex', detail: '/pokemon/35', moves: '/moves', abilities: '/abilities', sprites: '/sprites' }
const VIEWPORTS = [[1280, 900, false], [768, 900, false], [390, 844, true]]

function measure(name) {
    const vh = innerHeight
    const full = (els) => [...els].filter((e) => { const r = e.getBoundingClientRect(); return r.height > 0 && r.top >= 0 && r.bottom <= vh }).length
    const q = (s) => document.querySelectorAll(s)
    const controls = {}
    for (const e of q('main [data-size]')) {
        const cls = [...e.classList].find((c) => c.startsWith('astryx-'))
        const h = Math.round(e.getBoundingClientRect().height)
        if (!cls || !h) continue
        const k = `${cls}:${e.dataset.size}`
        controls[k] = Math.min(controls[k] ?? 1e9, h)
    }
    const taps = [...q('main .astryx-clickable-card, main li')].map((e) => e.getBoundingClientRect().height).filter((h) => h > 0)
    const m = { scrollWidth: document.documentElement.scrollWidth, cls: +(window.__cls || 0).toFixed(4), tapMin: taps.length ? Math.round(Math.min(...taps)) : null, controls }
    if (name === 'home') m.sectionHeadingsAboveFold = [...q('main h2[id$="-heading"]')].filter((e) => e.getBoundingClientRect().top <= vh - 64).length
    if (name === 'pokedex') m.cardsFullyVisible = full(q('main .astryx-clickable-card'))
    if (name === 'detail') m.h2AboveFold = [...q('main h2')].filter((e) => e.getBoundingClientRect().top <= vh - 64).length
    if (name === 'moves') m.rowsFullyVisible = full(q('main tbody tr'))
    if (name === 'abilities') m.rowsFullyVisible = full(q('main li'))
    if (name === 'sprites') {
        const t = [...q('[role=listitem]')]
        m.tilesFullyVisible = full(t)
        m.tilesPerRow = t.length ? t.filter((e) => Math.abs(e.getBoundingClientRect().top - t[0].getBoundingClientRect().top) < 2).length : 0
    }
    return m
}

;(async () => {
    fs.mkdirSync(OUT, { recursive: true })
    const browser = await chromium.launch()
    const result = {}
    for (const [w, h, mobile] of VIEWPORTS) {
        const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: LOCALE, hasTouch: mobile, isMobile: mobile })
        await ctx.addInitScript(() => {
            window.__cls = 0
            new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value }).observe({ type: 'layout-shift', buffered: true })
        })
        for (const name of only.split(',')) {
            const page = await ctx.newPage()
            await page.goto(BASE + PAGES[name])
            await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
            await page.waitForTimeout(1500)
            await page.screenshot({ path: path.join(OUT, `${label}-${name}-${w}-${lang}.png`) })
            const m = await page.evaluate(measure, name)
            if (name === 'pokedex') {
                // 붙는 필터 바: 깊이 스크롤한 뒤 검색창이 헤더 바로 아래에 보이는가
                await page.evaluate(() => window.scrollTo(0, 2000))
                await page.waitForTimeout(800)
                m.searchStuckUnderHeader = await page.evaluate(() => {
                    const hb = document.querySelector('header').getBoundingClientRect().bottom
                    const s = document.querySelector('main input[type=search]')
                    const r = s && s.getBoundingClientRect()
                    return !!r && r.top >= hb - 1 && r.top <= hb + 24
                })
                m.clsAfterScroll = +(await page.evaluate(() => window.__cls)).toFixed(4)
            }
            result[`${name}@${w}`] = m
            await page.close()
        }
        await ctx.close()
    }
    await browser.close()
    fs.writeFileSync(path.join(OUT, `${label}-${lang}.json`), JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result, null, 1))
})()
