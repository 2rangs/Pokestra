// 개발용 미리보기를 Vite 개발 서버로 띄워 라이트/다크 스크린샷을 찍는다.
// 실행: node scripts/preview/shoot-visual-foundation.mjs [출력 폴더=docs/screenshots/visual]
import { mkdirSync } from 'node:fs'
import { createServer } from 'vite'
import { createRequire } from 'node:module'

// Playwright 는 전역 설치본을 쓴다(require 는 NODE_PATH 를 따른다)
const { chromium } = createRequire(import.meta.url)('playwright')

const outDir = process.argv[2] ?? 'docs/screenshots/visual'
const PORT = 5191 // 5180 은 다른 세션 전용
mkdirSync(outDir, { recursive: true })

const server = await createServer({ server: { port: PORT, strictPort: true }, logLevel: 'warn' })
await server.listen()
const base = `http://localhost:${PORT}${server.config.base}scripts/preview/visual-foundation.html`
const browser = await chromium.launch()
try {
    for (const [name, width] of [['desktop', 1280], ['mobile', 390]]) {
        for (const mode of ['light', 'dark']) {
            const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2, colorScheme: mode, locale: 'ko-KR' })
            await page.goto(`${base}?mode=${mode}`, { waitUntil: 'networkidle' })
            await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 30000 })
            await page.waitForTimeout(400)
            const file = `${outDir}/foundation-${name}-${mode}.png`
            await page.screenshot({ path: file, fullPage: true })
            console.log('wrote', file)
            await page.close()
        }
    }
} finally {
    await browser.close()
    await server.close()
}
