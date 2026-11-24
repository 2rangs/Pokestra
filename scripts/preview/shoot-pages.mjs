// 앱 화면 스크린샷 (Vite 개발 서버 5192 + Playwright). 비주얼 패스 전/후 비교용.
// 실행: node scripts/preview/shoot-pages.mjs <출력 폴더> [desktop|mobile|all] [route 이름 필터 또는 ''] [light|dark]
import { mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createServer } from 'vite'

const { chromium } = createRequire(import.meta.url)('playwright')
const outDir = process.argv[2] ?? 'docs/screenshots/visual'
const which = process.argv[3] ?? 'all'
const only = process.argv[4]
const scheme = process.argv[5] === 'dark' ? 'dark' : 'light' // 화면 모드 기본값(system)이 따르는 기기 설정
const PORT = 5192 // 5180 은 다른 세션 전용

export const ROUTES = [
    ['home', '/'],
    ['pokedex', '/pokedex'],
    ['pokedex-table', '/pokedex?view=table'],
    ['detail', '/pokemon/6'],
    ['detail-forms', '/pokemon/25'],
    ['detail-moves', '/pokemon/6?tab=moves'],
    ['moves', '/moves'],
    ['move-detail', '/moves/thunderbolt'],
    ['abilities', '/abilities'],
    ['ability-detail', '/abilities/intimidate'],
    ['items', '/items'],
    ['item-detail', '/items/leftovers'],
    ['sprites', '/sprites'],
]
const VIEWPORTS = { desktop: { width: 1280, height: 900 }, mobile: { width: 390, height: 844 } }

mkdirSync(outDir, { recursive: true })
const server = await createServer({ server: { port: PORT, strictPort: true }, logLevel: 'error' })
await server.listen()
const base = `http://localhost:${PORT}${server.config.base}`
const browser = await chromium.launch()
try {
    for (const [vp, size] of Object.entries(VIEWPORTS)) {
        if (which !== 'all' && which !== vp) continue
        const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, locale: 'ko-KR', colorScheme: scheme })
        for (const [name, route] of ROUTES) {
            if (only && !name.includes(only)) continue
            const page = await ctx.newPage()
            await page.goto(`${base}#${route}`, { waitUntil: 'networkidle' })
            await page.waitForTimeout(800)
            await page.screenshot({ path: `${outDir}/${name}-${vp}${scheme === 'dark' ? '-dark' : ''}.png`, fullPage: true })
            await page.close()
        }
        await ctx.close()
    }
} finally {
    await browser.close()
    await server.close()
}
console.log('done', outDir)
