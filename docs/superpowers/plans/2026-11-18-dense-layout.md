# 사이트 전체 밀도·UX 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 테마는 그대로 두고 화면별 배치를 다시 짜서, 각 화면의 첫 화면(스크롤 전)에 보이는 정보량을 늘린다. 글자 크기와 컨트롤 높이는 줄이지 않는다.

**Architecture:** 공통 틀(MainLayout 최대 너비·여백, PageTitle 여백, DexUi `FilterRow`, `/` 단축키 훅, 밀도 점검 스크립트)을 먼저 만든 뒤 화면별 작업(홈, 도감, 상세, 기술·특성, 스프라이트)을 서로 독립된 태스크로 진행한다. 각 태스크는 같은 Playwright 스크립트로 전/후를 재서 숫자로 검증한다.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Astryx 0.7.16 (`Grid`, `Card`, `ClickableCard`, `MultiSelector`, `ToggleButton`, `List`, `Table`, `Switch`), Tailwind v4 토큰 유틸리티, Vitest, Playwright(전역 설치, `NODE_PATH=$(npm root -g)`).

**Spec:** `docs/superpowers/specs/2026-11-18-dense-layout-design.md`

## Global Constraints

- 글자 크기를 줄이지 않는다: `Heading`/`Text`의 `level`/`type`/`size`를 한 단계도 내리지 않는다. 컨트롤 높이를 줄이지 않는다: `size` prop을 내리지 않는다(`density-check --compare`가 `[data-size]` 높이 감소를 FAIL로 잡는다).
- 휴대폰 터치 44px: 이 계획이 새로 만들거나 자리를 옮기는 탭 대상(카드, 목록 행, 칩, 이전/다음 링크, 뒤로 링크)은 390px에서 높이 ≥ 44px(`min-h-11 sm:min-h-0` 등). Astryx 컨트롤 자체 높이(28–36px)는 테마 영역이라 유지만 한다(키우는 것도 비목표).
- 390px에서 페이지 가로 스크롤 없음(`document.documentElement.scrollWidth ≤ 390`). 필터 줄 안의 가로 스크롤(`overflow-x-auto`)은 허용(스펙: "필터 바는 가로 스크롤 한 줄").
- CLS < 0.1(로드 + 스크롤 후, `hadRecentInput` 제외). 이미지 칸은 항상 고정 크기 클래스로.
- 배틀/계산기 로직 변경 금지: `src/lib/battle*`, `src/components/battle/**`, `src/components/calc/**`, `src/pages/battle/**`, `src/pages/CalcPage.tsx`는 수정하지 않는다(여백은 MainLayout/PageTitle 변경으로만 따라옴).
- 새 문구는 ko/en/ja 세 언어 모두 추가(`defineMessages`가 타입으로 검사 → `tsc -b`가 잡음).
- AGENTS.md: 새 `<div>`, `style={{}}`, raw hex/px, 임의값 클래스(`p-[13px]`, `grid-cols-[…]`, `max-w-[56ch]`) 금지. 레이아웃은 Astryx 컴포넌트, 스타일은 토큰 유틸리티(`bg-body`, `bg-muted`, `border-border`, `top-12`, `h-18` …). 손댄 줄에 있던 위반은 같이 고친다. 예외: POTD 카드의 타입 색 `style` 한 줄(데이터 색, 토큰 없음)은 그대로 둔다.
- `npx astryx component <Name>`으로 props를 확인하고 쓴다. 틀(frame)을 바꾸기 전 `npx astryx docs layout/layout-spacing --full`, `layout/responsive --full`을 읽는다.
- 간격 규칙(모든 화면): 페이지 루트 `VStack gap={4}`(16px). 섹션 제목 → 내용 8px(`gap={2}`/`mb-2`). 카드 묶음 `gap 2–3`. 본문 세로 여백 `py-4 sm:py-6`. 본문 최대 너비 `max-w-7xl`.
- 병행 트랙 주의: 다른 트랙이 `/items` 페이지, MainLayout 내비 "도구" 항목, CalcPage `atkItem` 파라미터를 추가한다. MainLayout은 className 문자열 두 줄만 바꾸고(`NAV_ITEMS`·구조 불변), CalcPage는 건드리지 않는다.
- 병행 트랙 2(암수 모습): 다른 에이전트가 `spriteAt(sprites, gen, opts?: { female?: boolean })`, `femaleArtAt(sprites)`, `src/lib/gender.ts` `parseSex`, `src/components/pokedex/GenderToggle.tsx`, 도감 카드/표의 암수 표시를 만든다. 이 계획은 상세 화면 연결만 한다(Task 4). 그쪽이 PokemonCard/PokedexTable에 넣은 표시는 Task 3에서 지우지 말 것.
- 검증 서버: `npx vite --port 5291 --strictPort`(5180 금지). URL `http://localhost:5291/portfolio/pokestra/#/…`.
- 매 태스크 끝: `npm run build && npm run lint && npm test` 통과, `npx astryx doctor --built .` → `fail: 0`이고 `built-astryx-purity` 건수가 태스크 시작 전보다 늘지 않음(기준선 552).
- 커밋 메시지 끝에 두 줄:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01LWa7NiTKM7PN9RxoSGmNGy`

### 기준선 (현재 트리, ko, `tools/density-check.cjs` 측정)

| 지표 | 1280×900 | 390×844 | 목표 1280 | 목표 390 |
|---|---|---|---|---|
| 홈 `sectionHeadingsAboveFold` | 1 | 0 | 3 | ≥ 1 |
| 도감 `cardsFullyVisible` | 6 | 4 | ≥ 18 | ≥ 6 |
| 도감 `searchStuckUnderHeader` | false | false | true | true |
| 상세(#35) `h2AboveFold` | 1 | 0 | ≥ 4 | ≥ 1 |
| 기술 `rowsFullyVisible` | 12 | 2 | ≥ 18 | ≥ 10 |
| 특성 `rowsFullyVisible` | 10 | 6 | ≥ 13 | ≥ 9 |
| 스프라이트 `tilesPerRow` / `tilesFullyVisible` | 9 / 27 | 3 / 3 | ≥ 12 / ≥ 54 | ≥ 4 / ≥ 12 |
| CLS 최대 | 0.0008 | 0.0068 | < 0.1 | < 0.1 |

헤더 높이: lg 이상 49px, lg 미만(탭 줄 포함) 87px → 붙는 바 `top-21.5 lg:top-12`.

## Review Focus

1. 깊이 스크롤한 상태(붙는 필터 바)에서 필터를 바꾸면 결과가 줄어 화면이 빈 곳에 남는다 → 첫 결과가 바 바로 아래로 와야 한다. (Task 3 Step 6)
2. 영어·일본어 긴 라벨(“Generation”, “Include forms”, ja 타입명)과 긴 포켓몬 이름(“Crabominable”, 폼 이름) → 1280에서 도감 1줄이 줄바꿈되지 않고, 128px 카드·상세 머리말에서 잘림(ellipsis)으로 처리, 390에서 페이지 가로 스크롤 없음. (Task 3 Step 7, Task 7)
3. 입력칸·Typeahead·IME 조합 중에 `/`를 치면 글자가 입력돼야 하고 포커스가 튀면 안 된다. (Task 1 단위 테스트)
4. 상세 머리말: 세대 전환(도트↔일러스트), 암수 전환, 다른 폼(GenerationBar 없음), PokeAPI 오류 → 이미지 칸 크기 불변(CLS), 빈 박스로 남지 않음, 이전/다음은 항상 오른쪽 위. (Task 4 Step 7)
5. 휴대폰에서 도감 필터를 펼친 상태로 스크롤 → 붙는 바가 화면 절반 이상을 덮지 않음(펼친 바 높이 ≤ 0.4 × 844). (Task 3 Step 7)

---

### Task 1: 공통 틀·원칙 도구 (레이아웃 너비/여백, FilterRow, `/` 단축키, 밀도 점검 스크립트)

**Files:**
- Create: `tools/density-check.cjs`
- Create: `src/lib/keyboard.ts`, `src/lib/keyboard.test.ts`
- Create: `src/hooks/useSlashFocus.ts`
- Modify: `src/layouts/MainLayout.tsx` (header 안 `mx-auto max-w-6xl` → `mx-auto max-w-7xl`; main 안 `mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10` → `mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6`. 이 두 문자열 외 변경 금지)
- Modify: `src/components/ui/shared.tsx` (`PageTitle` header `mb-6` → `mb-4`)
- Modify: `src/components/dex/DexUi.tsx` (`SelectField`에 `isLabelHidden`, `FilterRow` 추가, `LoadMore` `mt-6` → `mt-4`)
- Modify: `src/i18n/messages/common.ts` (`filters`: ko `필터`, en `Filters`, ja `絞り込み`)

**Interfaces:**
- Produces:
  - `isSlashShortcut(e: { key: string; altKey: boolean; ctrlKey: boolean; metaKey: boolean; defaultPrevented: boolean; isComposing: boolean }, target: { tagName: string; isContentEditable: boolean } | null): boolean`
  - `useSlashFocus(ref: RefObject<HTMLElement | null>): void` — window `keydown`에서 `isSlashShortcut`이면 `preventDefault()` 후 `ref.current?.querySelector('input')`에 `focus()`+`select()`.
  - `SelectField` 새 prop `isLabelHidden?: boolean` — 켜면 Selector `isLabelHidden`, 그리고 값 `''` 옵션의 라벨을 `label`로 바꿔 보여 준다(“전체” 대신 “타입”, “세대”).
  - `FilterRow({ label, search, children, end }: { label: string; search: ReactNode; children?: ReactNode; end?: ReactNode })` — `<section aria-label={label} className="flex flex-wrap items-end gap-2">`; `search`는 `<span className="w-full sm:w-auto sm:min-w-56 sm:flex-1">`; `children`은 `<span className="flex max-w-full items-end gap-2 overflow-x-auto pb-0.5 *:shrink-0">`(휴대폰에서 가로 스크롤 한 줄); `end`는 `<span className="ms-auto">`.
  - `tools/density-check.cjs` 사용법: `NODE_PATH=$(npm root -g) OUT=<dir> node tools/density-check.cjs <label> [pages] [lang]` → `<OUT>/<label>-<lang>.json` + `<label>-<page>-<w>-<lang>.png`; `node tools/density-check.cjs --compare before.json after.json` → 지표 변화 출력, 컨트롤 축소·가로 스크롤·CLS ≥ 0.1이면 exit 1. pages: `home,pokedex,detail,moves,abilities,sprites`.

- [ ] **Step 1: 밀도 점검 스크립트 추가 (그대로 복사)** — `tools/density-check.cjs`:

```js
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
const VIEWPORTS = [[1280, 900, false], [390, 844, true]]

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
```

- [ ] **Step 2: 변경 전 측정** — `npx vite --port 5291 --strictPort` 실행 후 `NODE_PATH=$(npm root -g) OUT=<scratchpad>/density/t1 node tools/density-check.cjs before`. 기대: 위 기준선 표와 같은 값(±1). `npx astryx doctor --built .`의 `built-astryx-purity` 건수 기록.

- [ ] **Step 3: 실패하는 테스트** — `src/lib/keyboard.test.ts`:

```ts
const ev = (o: Partial<Parameters<typeof isSlashShortcut>[0]> = {}) =>
    ({ key: "/", altKey: false, ctrlKey: false, metaKey: false, defaultPrevented: false, isComposing: false, ...o })
const body = { tagName: "BODY", isContentEditable: false }
test("slash on page body → true", () => expect(isSlashShortcut(ev(), body)).toBe(true))
test("slash with null target → true", () => expect(isSlashShortcut(ev(), null)).toBe(true))
test.each(["INPUT", "TEXTAREA", "SELECT"])("slash typed in %s → false", (tag) =>
    expect(isSlashShortcut(ev(), { tagName: tag, isContentEditable: false })).toBe(false))
test("contenteditable → false", () => expect(isSlashShortcut(ev(), { tagName: "DIV", isContentEditable: true })).toBe(false))
test("IME composing → false", () => expect(isSlashShortcut(ev({ isComposing: true }), body)).toBe(false))
test.each(["altKey", "ctrlKey", "metaKey", "defaultPrevented"] as const)("%s → false", (k) =>
    expect(isSlashShortcut(ev({ [k]: true }), body)).toBe(false))
test("other key → false", () => expect(isSlashShortcut(ev({ key: "?" }), body)).toBe(false))
```

- [ ] **Step 4:** `npx vitest run src/lib/keyboard.test.ts` → FAIL (`isSlashShortcut` 없음).
- [ ] **Step 5:** `src/lib/keyboard.ts`의 `isSlashShortcut`, `src/hooks/useSlashFocus.ts` 구현(위 Interfaces). 훅의 리스너는 `e.target`을 `HTMLElement | null`로 보고 `{ tagName, isContentEditable }`를 넘긴다.
- [ ] **Step 6:** `npx vitest run src/lib/keyboard.test.ts` → PASS.
- [ ] **Step 7:** MainLayout 두 문자열, `PageTitle` `mb-4`, `LoadMore` `mt-4`, `SelectField.isLabelHidden`, `FilterRow`, `common.filters` 추가. (`FilterRow`는 이 태스크에서 아직 쓰지 않는다 — Task 5/6이 쓴다.)
- [ ] **Step 8: 검증** — `npm run build && npm run lint && npm test` 통과. `OUT=<scratchpad>/density/t1 node tools/density-check.cjs after` → `node tools/density-check.cjs --compare <…>/before-ko.json <…>/after-ko.json` 결과 `OK`. 1280 스크린샷에서 본문 왼쪽 선이 헤더 로고 선과 일치(둘 다 `max-w-7xl`), 390 스크린샷 가로 스크롤 없음. `/battle`, `/calc` 1280·390 스크린샷 비교: 위쪽 여백만 줄고 구조 동일. doctor `fail: 0`, purity 건수 ≤ Step 2 값.
- [ ] **Step 9: Commit** — `git add tools/density-check.cjs src/lib/keyboard.ts src/lib/keyboard.test.ts src/hooks/useSlashFocus.ts src/layouts/MainLayout.tsx src/components/ui/shared.tsx src/components/dex/DexUi.tsx src/i18n/messages/common.ts` → `feat: wider content frame, tighter page rhythm, slash-to-search hook and density check` + 트레일러 두 줄.

---

### Task 2: 홈

**Files:**
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/i18n/messages/home.ts` (값만 변경, 키 추가 없음)

**Interfaces:**
- Consumes: `useSlashFocus(ref)` (Task 1).

- [ ] **Step 1: 변경 전 측정** — `node tools/density-check.cjs before home` (OUT=`<scratchpad>/density/t2`).
- [ ] **Step 2: 페이지 루트·섹션 제목** — 루트 `<div className="flex flex-col gap-12 sm:gap-16">` → `<VStack gap={4}>`. `SectionHeading` 래퍼 `mb-4` → `mb-2`.
- [ ] **Step 3: 히어로** — `<section className="grid items-start gap-4 lg:grid-cols-3">`. 왼쪽 `<span className="lg:col-span-2">` 안 `VStack gap={3}`: `Heading level={1} type="display-3"`(그대로) → `heroLead`는 `VisuallyHidden`의 `<p>`로(화면에서 빼고 스크린리더에 남김; `max-w-[56ch]` 래퍼 삭제) → `HeroSearch`(Typeahead 래퍼 `span`에 ref, `useSlashFocus(ref)`) → `PopularPokemon`. 오른쪽: `PokemonOfTheDay`.
- [ ] **Step 4: 자주 찾는 포켓몬 한 줄** — `VStack gap={1}`; `ul` → `flex gap-2 overflow-x-auto pb-0.5`, 각 `li`에 `shrink-0`; 링크에 `min-h-11 sm:min-h-0`(390에서 44px). 칩 8개 유지.
- [ ] **Step 5: 오늘의 포켓몬 컴팩트 카드** — 바깥 `section`과 타입 색 `style`은 유지, 안쪽 패딩 `px-4 pt-3`/`px-4 pb-4`, 본문 `gap-3`. 이미지 `size={96}` `className="h-24 w-24"`(반응형 176 클래스 삭제, `priority` 유지). 이미지 오른쪽 `VStack gap={1.5}`: 이름(Heading 2, maxLines 2) → 타입 → 합계 → `Button variant="primary"`(크기 유지, 기존 CTA를 여기로 이동). 능력치 `dl`은 그대로 두되 `gap-y-1.5` → `gap-y-1`.
- [ ] **Step 6: 도구 카드 가로형** — `ToolCard`: `ClickableCard padding={3} height="100%"` 안 `HStack gap={3} vAlign="center"`: 썸네일 `<span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted" aria-hidden>` + `VStack gap={0.5}`(Heading 3, `Text color="secondary" maxLines={1}`). 썸네일: 도감 = 피카츄(25) `Sprite size={48}`; 배틀 = `BATTLE_PREVIEW` 두 마리 `Sprite size={32}`(둘째는 `-scale-x-100`, `-mx-1`); 계산기 = 기존 HP 막대 세 조각을 `w-9 h-1.5` 막대로(숫자·라벨 없음). 그리드 `grid gap-3 md:grid-cols-3`. `DEX_PREVIEW`, `SPRITE_FLUID_MAX`, `Sprite`의 `fluid` 경로, 쓰지 않게 된 `calcExample*` 사용처 삭제(키는 남겨도 됨).
- [ ] **Step 7: 한 줄 설명 문구(ko/en/ja)** — `home.ts` 값 교체:
  - `featPokedexDesc`: `이름·타입·세대·기술로 찾기` / `Search by name, type, gen or move` / `名前・タイプ・世代・わざで検索`
  - `featBattleDesc`: `내 팀으로 CPU와 싱글 배틀` / `Single battles against the CPU` / `自分のチームでCPUとシングルバトル`
  - `featCalcDesc`: `9세대 공식 데미지 계산` / `Gen 9 damage calculator` / `第9世代のダメージ計算`
  - `toolsHeading` ko `도구` → `바로 가기` (병행 트랙의 내비 "도구"=아이템과 겹치지 않게; en `Tools`, ja `ツール` 유지)
- [ ] **Step 8: 자료·세대 섹션** — 그리드 간격 `gap-3` 유지, 세대 카드 스타터 `Sprite size={56}` → `size={48}`, `-mx-1.5` → `-mx-1`.
- [ ] **Step 9: 검증** — build/lint/test 통과. `node tools/density-check.cjs after home` → compare `OK`, `home@1280.sectionHeadingsAboveFold = 3`, `home@390 ≥ 1`, `home@390.tapMin ≥ 44`. 1280 스크린샷: 검색창이 왼쪽 위 첫 입력, POTD 카드가 오른쪽에 같은 높이대로, 도구 카드 3개 한 줄 높이 ≤ 80px. 390에서 칩 줄이 한 줄(가로 스크롤), 페이지 가로 스크롤 없음. `/` 키로 검색창 포커스 확인(Playwright `page.keyboard.press('/')` 후 `document.activeElement.tagName === 'INPUT'`). doctor 조건 충족.
- [ ] **Step 10: Commit** — `feat(home): compact hero, one-line popular row, horizontal tool cards`.

---

### Task 3: 도감 (붙는 2줄 필터 바, 촘촘한 카드·표)

**Files:**
- Create: `src/components/pokedex/PokedexFilterBar.tsx`
- Modify: `src/pages/pokedex/PokedexPage.tsx` (필터 Card·`FilterGroup` 제거 → `PokedexFilterBar`, 머리말, 결과 그리드, 필터 변경 시 스크롤 보정)
- Modify: `src/stores/pokedexStore.ts` (`setGenerations`)
- Create: `src/stores/pokedexStore.test.ts`
- Modify: `src/components/pokedex/MoveFilter.tsx` (`compact` prop)
- Modify: `src/components/PokemonCard.tsx`, `src/components/pokedex/PokedexTable.tsx`

**Interfaces:**
- Consumes: `useSlashFocus` (Task 1).
- Produces:
  - store `setGenerations: (ids: number[]) => void` — 중복 제거·오름차순, `page: 1`.
  - `MoveFilter({ compact }: { compact?: boolean })` — `compact`면 Typeahead `isLabelHidden`, `width={224}`, placeholder 유지.
  - `PokedexFilterBar({ moveFilterKey, activeFilterCount, open, onToggleOpen }: { moveFilterKey: number; activeFilterCount: number; open: boolean; onToggleOpen: () => void })` — 스토어를 직접 읽고 쓴다. 바깥 `<section aria-label={t("filters")}>`에 `id="pokedex-filter-bar"`.

- [ ] **Step 1: 변경 전 측정** — `before pokedex` (OUT=`<scratchpad>/density/t3`), 표 보기(`/pokedex?view=table`)도 1280·390 스크린샷 수동 저장.
- [ ] **Step 2: 실패하는 테스트** — `src/stores/pokedexStore.test.ts`:

```ts
test("setGenerations sorts, dedupes and resets page", () => {
    usePokedexStore.getState().setPage(4)
    usePokedexStore.getState().setGenerations([3, 1, 3])
    expect(usePokedexStore.getState().selectedGenerations).toEqual([1, 3])
    expect(usePokedexStore.getState().page).toBe(1)
})
test("setGenerations([]) clears", () => {
    usePokedexStore.getState().setGenerations([])
    expect(usePokedexStore.getState().selectedGenerations).toEqual([])
})
```
- [ ] **Step 3:** `npx vitest run src/stores/pokedexStore.test.ts` → FAIL. **Step 4:** `setGenerations` 구현 → PASS.
- [ ] **Step 5: 필터 바** (`PokedexFilterBar.tsx`):
  - 바깥: `<section className="sticky top-21.5 z-30 -mx-4 flex flex-col gap-2 border-b border-border bg-body px-4 py-2 sm:-mx-6 sm:px-6 lg:top-12">`.
  - 1줄: `<span className="flex flex-wrap items-end gap-2">` 안에
    - 검색 `TextInput`(md, 지금과 같은 props) — `<span ref className="order-1 min-w-0 flex-1">`, `useSlashFocus(ref)`.
    - 필터 버튼(기존 `funnel` Button, `aria-controls="pokedex-filter-more"`) — `order-2 md:hidden`.
    - 보조 컨트롤 묶음 `<span id="pokedex-filter-more" className={`${open ? "flex" : "hidden"} order-3 w-full items-end gap-2 overflow-x-auto *:shrink-0 md:order-2 md:flex md:w-auto md:overflow-visible`}>`: `MultiSelector`(label `t("generation")`, `isLabelHidden`, `placeholder={t("generation")}`, `width={160}`, options = `GENERATIONS` → `{ value: String(id), label: generationName(id, lang) }`, `value={selectedGenerations.map(String)}`, `onChange={(v) => setGenerations(v.map(Number))}`, `triggerDisplay="count"`, `formatValue`: 1개면 그 라벨, 여러 개면 `` `${t("generation")} ${n}` ``) → `<MoveFilter key={moveFilterKey} compact />` → 정렬 `Selector`(`isLabelHidden`, `width={160}`, md) → 방향 `SegmentedControl`(기존 그대로, md).
  - 2줄 `<span role="group" aria-labelledby="pokedex-type-label" className={`${open ? "flex" : "hidden"} items-center gap-2 overflow-x-auto *:shrink-0 md:flex`}>`: `Text type="label" id="pokedex-type-label"` `t("type")` + `Text type="supporting"` `t("typeHint", …)` → 타입 18개 `ToggleButton size="sm"` 아이콘만(`icon={<TypeIconDot type=…/>}`, `label={typeName(…)}`, children 없음 → 툴팁 자동) → 선택이 있을 때만 `Button size="sm" variant="ghost" label={t("clearSelection")}` → `<span className="ms-auto">` `Switch label={t("includeForms")} labelTooltip={t("includeFormsHint")}`(description 제거, 크기 유지).
  - 1280에서 1줄·2줄 모두 한 줄(줄바꿈 없음), 바 높이 ≤ 100px.
- [ ] **Step 6: 페이지** (`PokedexPage.tsx`):
  - 머리말: `HStack gap={3} vAlign="baseline" wrap="wrap"` — `Heading level={1}` + `<span className="hidden sm:inline">` 안 subtitle `Text color="secondary"`.
  - 기존 필터 `Card`·`FilterGroup` 삭제, `<PokedexFilterBar …/>`(open 상태는 기존 `filtersOpen` 재사용).
  - 결과 헤더 줄(개수·초기화·보기 전환)은 바 바로 아래 그대로.
  - 카드 그리드: `Grid columns={{ minWidth: 128, max: 10 }} gap={2}`.
  - 결과 래퍼 `<div className=…opacity>` 두 곳 → `<span className="block transition-opacity …">`(새 div 금지 규칙에 맞춤).
  - 스크롤 보정: 필터 값(`selectedGenerations, includeForms, selectedTypes, moveSlug, deferredName, sortKey, sortDir`)이 바뀌면(첫 렌더 제외) `#pokedex-filter-bar`가 붙어 있는 상태(`getBoundingClientRect().top <=` 헤더 아래+1)일 때만 결과 헤더 줄이 바 바로 아래 오도록 `window.scrollTo({ top: 결과헤더.offsetTop - (헤더높이 + 바높이) })`. 붙어 있지 않으면 아무것도 안 함.
- [ ] **Step 7: 카드·표**:
  - `PokemonCard`: `padding={2}`, `VStack gap={1}`, 이미지 `size={72}` `className="h-18 w-18"`(72 > 64라 공식 일러스트 우선 유지), 이름 블록 `gap={0}`. 글자 type/size·TypeTag `xs` 유지. 병행 트랙이 넣은 암수 표시가 있으면 유지.
  - `PokedexTable`: 바깥 `<div className="overflow-x-auto">` 제거(Astryx 표가 자체 스크롤 래퍼를 가짐 — 감싸면 머리/마지막 행이 잘린다, Task 4 Step 6 참고), 이미지 `size={32}` `className="h-8 w-8"`, 이름 셀 `min-w-32` 유지.
- [ ] **Step 8: 검증** — build/lint/test 통과. `after pokedex` → compare `OK`; `cardsFullyVisible` 1280 ≥ 18, 390 ≥ 6; `searchStuckUnderHeader` 두 폭 모두 true; `clsAfterScroll < 0.1`. 추가 Playwright 점검(같은 스크립트 패턴으로 일회성):
  - (Review 1) 1280에서 `scrollTo(0, 3000)` → 타입 "불꽃" 토글 클릭 → 첫 `.astryx-clickable-card`의 top이 바 bottom 이상, `innerHeight` 미만.
  - (Review 2) `node tools/density-check.cjs after-en pokedex en` · `… ja` → 1280에서 바 높이 ≤ 100px(`#pokedex-filter-bar` 높이), 두 폭 모두 scrollWidth = 폭.
  - (Review 5) 390에서 필터 버튼 클릭 후 바 높이 ≤ 338px(0.4×844).
  - 표 보기 1280: 한 화면 행 수가 Step 1 스크린샷보다 많고 머리 행이 잘리지 않음.
  - `/` 키 → 검색창 포커스. doctor 조건 충족.
- [ ] **Step 9: Commit** — `feat(pokedex): sticky two-line filter bar, denser cards and table`.

---

### Task 4: 포켓몬 상세 (머리말 재배치, 개요 그리드, 암수 연결, 이월된 버그 3건)

**Files:**
- Modify: `src/pages/pokedex/PokemonDetailPage.tsx`
- Modify: `src/components/pokedex/GenerationBar.tsx`
- Modify: `src/components/BattleStatsPanel.tsx` (표 래퍼 `overflow-x-auto` 한 줄만 — 로직 불변)
- Modify: `src/components/pokedex/MovesPanel.tsx` (표 래퍼 `overflow-x-auto` 한 줄만)

**Interfaces:**
- Consumes (병행 트랙 2가 먼저 병합돼 있어야 함): `spriteAt(sprites, gen, { female: true })`, `femaleArtAt(sprites): string | null`, `parseSex(v: string | null): "m" | "f"`, `GenderToggle({ value, onChange, t })`. **Step 0:** `src/lib/gender.ts`, `src/components/pokedex/GenderToggle.tsx`, `femaleArtAt`가 없으면 멈추고 BLOCKED 보고.
- Produces: URL `?sex=f`(기본 m은 파라미터 없음), `tab`/`gen`과 공존, 이전/다음 링크에 `gen`처럼 실려 감.

- [ ] **Step 1: 변경 전 측정** — `before detail`(OUT=`<scratchpad>/density/t4`) + 수동 스크린샷 1280·390: `/pokemon/35?gen=5`, `/pokemon/25`(암수 차이), `/pokemon/10034`(메가, 다른 폼), `/pokemon/35?tab=stats`(표 잘림 재현: "능력치" 머리 행과 "합계"/"스피드" 행이 반쯤 잘림).
- [ ] **Step 2: 머리말 구조** — 바깥 위 줄 `HStack`(뒤로 + 이전/다음)과 카드 밖 `GenerationBar` 삭제. 순서:
  1. 뒤로 링크(`Link` + chevronLeft + `backToDex`), 안쪽 span에 `min-h-11 sm:min-h-0`.
  2. `Card`(기본 패딩) → `VStack gap={3}`:
     - 위 줄 `HStack justify="between" vAlign="center" gap={3} wrap="wrap"`: 왼쪽 `GenerationBar`(다른 폼이면 `<span aria-hidden />`), 오른쪽 기존 `nav`(이전/다음 `NeighborLink`, `title={t("keyboardHint")}`). `NeighborLink` 안쪽 span에 `min-h-11 sm:min-h-0`.
     - 본문 `<section className="flex flex-wrap items-start gap-4">`:
       - `figure className="flex shrink-0 flex-col items-center gap-1"`: 액자 `rounded-lg border border-border bg-muted p-2` 안 `PokeImage size={192} className="h-24 w-24 md:h-48 md:w-48"`(md 이상 도트 원본 96px의 정확히 2배, 휴대폰 1배) + figcaption 번호.
       - 신원 `<span className="flex min-w-0 flex-1 basis-48 flex-col gap-2">`: h1(그대로) → 폼 → 다른 언어 이름 → 분류(genus) → 타입 줄(`TypeIcon`, 변경 Token, 그리고 `hasGenderDiff`면 `GenderToggle`) → 세대/전설 Token 줄.
       - 핵심 수치 `<span className="flex min-w-0 basis-full flex-col gap-3 lg:basis-0 lg:flex-1 lg:min-w-64">`: `MetadataList columns={2}` — 키, 몸무게, 기초 경험치, 종족값 합계(`t("total")`, `statTotal`, tabular) → 설명(flavor) `max-w-prose`.
  3. 탭(그대로), 탭 패널.
- [ ] **Step 3: 이미지 소스(암수·세대·오류)** — `hasGenderDiff = !isAltForm && species?.has_gender_differences === true`; `sex = hasGenderDiff ? parseSex(searchParams.get("sex")) : "m"`; `setSex`는 `setGen`과 같은 방식(“m”이면 delete). `neighborSearch`에 `sex === "f"`면 `sex=f` 추가. 소스:
  - `gen !== null && genDetail` → `[spriteAt(genDetail.sprites, gen, { female: sex === "f" }), artwork]`
  - `gen !== null && !genDetail && detailQ.isError` → `[artwork, spriteFallback]` (이월 2a: 오류 때 빈 박스로 남던 문제)
  - `gen !== null && !genDetail`(로딩) → `[]`
  - `gen === null` → `sex === "f" && detail ? [femaleArtAt(detail.sprites), artwork, spriteFallback] : [artwork, spriteFallback]`
  - alt 문구는 기존 그대로.
- [ ] **Step 4: GenerationBar (이월 2b)** — `useEffect(() => () => audioRef.current?.pause(), [])`. 로딩 중 자리: `debut <= 5`면 버튼 2개(`cryPlay · cryLegacy`, `cryPlay · cryLatest` 라벨, 비활성), 아니면 1개(`cryPlay`) — 로드 후 버튼 수·라벨과 같게. 로드 후 실제 개수가 다르면(데이터 예외) 그대로 둔다.
- [ ] **Step 5: 개요 탭** — `Panel`의 `VStack gap={4}` → `gap={3}`. 개요 `Grid columns={{ minWidth: 280, max: 3 }} gap={3}`. 특성(두 경우 모두)·지닌 도구 Panel의 `col-span-full` 제거(특성 | 종 정보 | 교배가 한 줄 3열, 지닌 도구는 다음 칸). 특성 `li` `py-3` → `py-2`. 타입 상성 Panel은 `col-span-full` 유지, 배수 줄 `py-3` → `py-2`, `dt` `w-32` → `w-28`, 배수마다 칩 한 줄(`flex-wrap` 유지). 진화·폼 `col-span-full` 유지; 진화 래퍼 `<div className="overflow-x-auto pb-1">` → `<span className="block overflow-x-auto pb-1">`.
- [ ] **Step 6: 표 잘림 (이월 2c)** — 원인: Astryx `Table`의 `.astryx-table-scroll-wrapper`가 카드 패딩으로 `margin: -12px` 블리드하고 자체 스크롤/clip을 가지는데, 바깥 `overflow-x-auto` 래퍼(overflow-y도 auto가 됨)가 그 12px을 잘라 머리 행과 마지막 행이 반쯤 가려진다. 고침: `PokemonDetailPage.tsx` 종족값 표의 `<div className="overflow-x-auto">` 제거(표를 Panel에 바로), `BattleStatsPanel.tsx` 82행 span의 `overflow-x-auto`만 삭제(`block min-w-0` 유지), `MovesPanel.tsx` 252행 `<div className="overflow-x-auto">` 제거.
- [ ] **Step 7: DetailSkeleton** — 새 머리말과 같은 크기: 뒤로 `Skeleton width={112} height={20}`; Card 안 위 줄 `HStack justify="between"`(`Skeleton width={280} height={28}`, `Skeleton width={180} height={24}`) → 본문 `flex flex-wrap gap-4`(이미지 자리: `<span className="block h-28 w-28 md:h-52 md:w-52">` 안에 `Skeleton height="100%"` — 액자(이미지+p-2+테두리) 크기와 같게; 신원 `VStack` 4줄). Step 8에서 스켈레톤 → 실제 화면 전환 시 탭 줄의 top 이동 ≤ 8px.
- [ ] **Step 8: 검증** — build/lint/test 통과. `after detail` → compare `OK`; `h2AboveFold` 1280 ≥ 4, 390 ≥ 1. 추가 점검(Playwright, 1280·390):
  - (Review 4) `/pokemon/35`에서 세대 V 클릭 → 현재 → 이미지 액자 `getBoundingClientRect()` 높이 세 번 동일; `/pokemon/25`에서 암수 토글 → 동일, URL에 `sex=f`, 이미지 src에 `female` 포함; `?gen=4&sex=f` → src에 `generation-iv/…/female/25.png`; 이전/다음 링크 href에 `gen`·`sex` 유지.
  - `/pokemon/10034`: 위 줄 왼쪽 비어 있고 이전/다음은 오른쪽 위.
  - 2a: `page.route('**/pokeapi.co/api/v2/pokemon/35', r => r.abort())` 후 `/pokemon/35?gen=3` → 이미지 `img`가 존재하고 src가 official-artwork.
  - 2b: 로드 전후 GenerationBar 줄 너비 동일(#35, #906); 울음소리 재생 중 다른 페이지로 이동 → 재생 멈춤(`HTMLMediaElement.prototype.pause` 호출 감시).
  - 2c: `?tab=stats`에서 모든 `main table`에 대해 `thead tr`과 마지막 `tbody tr`/`tfoot tr`의 rect가 가장 가까운 `.astryx-card` rect 안에 있고, 각 표 래퍼 `scrollHeight === clientHeight`. 기술 탭도 같은 점검.
  - CLS: `/pokemon/25` 로드 CLS < 0.1(암수 토글이 늦게 나타나도). ←/→ 키 이동 유지.
  - doctor 조건 충족.
- [ ] **Step 9: Commit** — `feat(detail): compact header with gen bar and prev/next inside, 3-column overview, gender toggle wiring, fix clipped stats tables`.

---

### Task 5: 기술·특성 (목록 한 줄 필터 + 촘촘한 행, 상세 2열)

**Files:**
- Modify: `src/pages/MovesPage.tsx`, `src/pages/AbilitiesPage.tsx`

**Interfaces:**
- Consumes: `FilterRow`, `SelectField.isLabelHidden`, `Segmented.isLabelHidden`, `useSlashFocus`, `common.filters` (Task 1).

- [ ] **Step 1: 변경 전 측정** — `before moves,abilities`(OUT=`<scratchpad>/density/t5`) + 수동 스크린샷 `/moves/thunderbolt`, `/abilities/overgrow` 1280·390.
- [ ] **Step 2: 기술 목록** — `Card` 삭제, `<FilterRow label={tc("filters")} search={<span ref>{SearchField}</span>} end={결과 수 Text supporting, aria-live}>`; children: 타입 `SelectField`(`isLabelHidden`, `width={140}`, 옵션 `''`+`MOVE_TYPES` 타입명 — 19개 칩 줄 대체) → 분류 `Segmented isLabelHidden` → 세대 `SelectField isLabelHidden width={140}` → 정렬 `SelectField isLabelHidden width={140}` + 방향 `IconButton`(그대로) → `hasFilters`일 때 초기화 Button. 크기는 기존과 같게(sm). 표 아래 결과 수 줄 삭제(이제 `end`). 표 `density="compact"` 유지. `useSlashFocus(ref)`.
- [ ] **Step 3: 특성 목록** — `Card` 삭제, `FilterRow`(검색 + 세대 `SelectField isLabelHidden width={150}`, `end` = 결과 수). `List density="compact" hasDividers edge="flush"`(행 전체 클릭 유지, 손가락에서 44px 히트 영역은 List가 보장). `AbilityRow` 끝의 개수 `Badge` → `Text hasTabularNumbers weight="semibold"`(숫자 오른쪽 정렬, 원칙 3) — `aria-label` 문구는 `Text`에 그대로.
- [ ] **Step 4: 상세 2열 (기술·특성 공통 패턴)** — 루트 `VStack gap={4}`: 뒤로 링크 → `<span className="flex flex-col gap-4 lg:flex-row lg:items-start">`:
  - 왼쪽 요약 `<span className="flex flex-col gap-3 lg:sticky lg:top-16 lg:w-80 lg:shrink-0">`: 제목 블록(h1, 다른 이름, 기술은 타입/분류) → `Card`(기술: `MetadataList columns={2}` + 설명 `max-w-prose`; 특성: 설명 + 등장 세대).
  - 오른쪽 `<span className="min-w-0 flex-1">`: `Learners`/`Holders`. 포켓몬 칩 그리드 `Grid columns={{ minWidth: 176, max: 4 }} gap={2}`. `Holders` 내부 `VStack gap={6}` → `gap={4}`.
  - `BackLink` 안 `span`의 `mb-4` → 삭제(루트 gap이 담당), 링크 `min-h-11 sm:min-h-0`.
- [ ] **Step 5: 검증** — build/lint/test 통과. `after moves,abilities` → compare `OK`; 기술 `rowsFullyVisible` 1280 ≥ 18, 390 ≥ 10; 특성 1280 ≥ 13, 390 ≥ 9. 1280에서 `FilterRow` 높이 ≤ 40px(한 줄), en·ja에서도 한 줄(`after-en moves,abilities en`). 상세 1280 스크린샷: 요약 왼쪽, 배우는/가진 포켓몬 오른쪽 4열, 스크롤해도 요약 고정; 390은 1열 세로. `/` 포커스. doctor 조건 충족.
- [ ] **Step 6: Commit** — `feat(moves,abilities): one-line filters above compact rows, two-column detail`.

---

### Task 6: 스프라이트

**Files:**
- Modify: `src/pages/SpritesPage.tsx`

**Interfaces:**
- Consumes: `FilterRow`, `SelectField.isLabelHidden`, `Segmented.isLabelHidden`, `useSlashFocus` (Task 1).

- [ ] **Step 1: 변경 전 측정** — `before sprites`(OUT=`<scratchpad>/density/t6`), `?style=artwork` 수동 스크린샷.
- [ ] **Step 2: 필터 한 줄** — `Card` 삭제, `FilterRow`(검색; children: 세대 `SelectField isLabelHidden width={150}` → 스타일 `Segmented isLabelHidden` → 색 `Segmented isLabelHidden` → 폼 `CheckboxInput`; `end` = 결과 수). `useSlashFocus`.
- [ ] **Step 3: 타일** — 그리드 `Grid columns={{ minWidth: 80, max: 14 }} gap={1.5}`. `SpriteCard`: `padding={1.5}`, `VStack gap={0.5}`, 이미지 래퍼 `aspect-square w-full max-w-20`, `PokeImage size={80} pixelated={false} className="h-full w-full"`(96px 도트를 80px로 축소할 때 nearest-neighbor는 픽셀이 빠지므로 부드럽게), 이름 `maxLines={1}`(크기 `sm` 유지).
- [ ] **Step 4: 검증** — build/lint/test 통과. `after sprites` → compare `OK`; `tilesPerRow` 1280 ≥ 12, 390 ≥ 4; `tilesFullyVisible` 1280 ≥ 54, 390 ≥ 12; 390 `tapMin ≥ 44`. 일러스트·색違い 모드 스크린샷에서 이미지가 타일 밖으로 넘치지 않음. doctor 조건 충족.
- [ ] **Step 5: Commit** — `feat(sprites): one-line filters, smaller tiles, more per row`.

---

### Task 7: 전체 점검

**Files:** 없음(점검에서 결함이 나오면 해당 태스크 파일만 고치고 그 태스크 이름으로 fix 커밋).

- [ ] **Step 1:** `node tools/density-check.cjs final` · `final … en` · `final … ja` (OUT=`<scratchpad>/density/final`) → Task 1 `before-ko.json`과 compare `OK`, 기준선 표의 목표 전부 충족, en/ja 두 폭 모두 scrollWidth = 폭.
- [ ] **Step 2:** `/battle`, `/calc` 1280·390 스크린샷: 구조 동일, 여백만 변경. `git diff <Task1 시작 커밋>..HEAD --stat -- src/lib/battle* src/components/battle src/components/calc src/pages/battle src/pages/CalcPage.tsx` → 출력 없음. `src/layouts/MainLayout.tsx` diff는 className 두 줄뿐.
- [ ] **Step 3:** `npm run build && npm run lint && npm test` 통과, `npx astryx doctor --built .` → `fail: 0`, purity 건수 ≤ 552.
- [ ] **Step 4:** 홈·도감·기술·특성·스프라이트에서 `/` → 검색창 포커스, 상세 ←/→ 이동 유지(Playwright).
