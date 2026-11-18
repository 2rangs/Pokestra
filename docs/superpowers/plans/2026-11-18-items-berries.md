# 배틀 도구·나무열매 페이지 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/items` 목록과 `/items/:slug` 상세에서 배틀 도구·나무열매의 이름(3개 언어)·분류·설명·수치·야생 지닌 포켓몬을 보여 주고, 계산기에 `atkItem`으로 바로 넘긴다.

**Architecture:** 빌드 스크립트(`src/script/buildItemsData.mjs`)가 PokeAPI CSV 덤프로 `src/data/items.json`을 만들어 커밋한다. 화면은 순수 접근자 모듈 `src/lib/items.ts`(필터·검색·정렬·이웃 계산, vitest)만 읽는다. 계산기 지원 도구 목록은 엔진을 끌어오지 않는 `src/lib/calcItems.ts`로 옮겨, 상세 화면이 배틀 엔진 청크 없이 "계산기에서 써 보기" 노출 여부를 판단한다.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Astryx 0.7.16, Tailwind v4 토큰 유틸리티, react-router HashRouter, vitest 5, Playwright(검증용, 사전 설치).

**Spec:** `docs/superpowers/specs/2026-11-18-items-berries-design.md` (원칙: `docs/superpowers/specs/2026-11-18-dense-layout-design.md`)

## Global Constraints
- AGENTS.md: 새 페이지는 Astryx 템플릿에서 시작(`npx astryx build` → `npx astryx template <name> --type page <path>`), 템플릿이 쓰는 외부 아이콘 패키지(`@heroicons/react`, `lucide-react`)는 설치하지 않고 Astryx `Icon`으로 바꾼다. 새 코드에 `<div>`, `style={{}}`, raw hex/px, 임의 값(`max-w-[70ch]`, `p-[13px]`) 금지 — 컴포넌트 prop → 토큰 유틸리티(`max-w-prose`, `top-12`) 순. 밀집 데이터는 `Table`/`List`, `Badge`는 개수에만(분류는 `Text`).
- 모든 새 문구는 아래 "문구" 절의 ko/en/ja 그대로 `src/i18n/messages/items.ts`(`itemsMessages`) 또는 `commonMessages.navItems`에 넣는다. `defineMessages`가 빠진 키를 타입 오류로 잡는다.
- 이름은 `src/data/itemNames.json`과 글자 하나까지 같아야 한다(같은 `nameTable` 규칙: 일본어는 언어 11(한자) 우선, 없으면 1(가나)).
- 설명문은 언어별 가장 최신 버전그룹 문구(현재 덤프에서 291개 모두 vg 20 = sword-shield). 사용자 언어 문구가 없으면 다른 언어 문구 + "({언어} 설명)" 표시, 아무 언어도 없으면 `noDescription`.
- 아이콘: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/<identifier>.png`(원본 30×30)를 `PokeImage`(`pixelated`)로. 목록 24px, 상세 48px.
- 밀집 원칙: 필터 바 고정, 행 전체 클릭, 숫자 오른쪽 정렬 tabular, 글 한 줄 65자(`max-w-prose`), `/`로 검색 포커스, 상세 ←/→, 터치 44px 유지, CLS < 0.1, 390px에서 페이지 가로 스크롤 없음.
- 병렬 밀도 개편 트랙과 충돌을 줄이려고 `src/layouts/MainLayout.tsx`는 `NAV_ITEMS` 한 줄, `src/pages/CalcPage.tsx`는 `atkItem` 관련 두 줄만 바꾼다. `src/i18n/messages/common.ts`는 `navItems` 키 3개만.
- 커밋 메시지 끝 두 줄:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01LWa7NiTKM7PN9RxoSGmNGy
  ```
- 브라우저 확인: dev 서버 포트는 5180 금지(예: `npx vite --port 5191 --strictPort`), 주소는 `http://localhost:5191/portfolio/pokestra/#/items`. Playwright는 `require('playwright')`, 컨텍스트 `locale: 'ko-KR'`(기본 en-US면 영어로 뜬다).

## 확인한 데이터 사실 (PokeAPI `data/v2/csv`, 2026-11-18)
- `items.csv`: `id,identifier,category_id,cost,fling_power,fling_effect_id`
- `item_names.csv`: `item_id,local_language_id,name` (ko 3, en 9, ja 11, ja-kana 1)
- `item_flavor_text.csv`: `item_id,version_group_id,language_id,flavor_text`
- `item_categories.csv`: `id,pocket_id,identifier` / `item_pockets.csv`: `id,identifier` (5 = berries, 1 = misc)
- `item_category_prose.csv`: `item_category_id,local_language_id,name` — **en/fr만** → 분류 이름 ko/ja는 직접 작성(문구 절).
- `item_prose.csv`: `item_id,local_language_id,short_effect,effect` — **en/fr만**, 설명문 없는 59개에는 이것도 없음 → 사용 안 함.
- `item_fling_effects.csv`: `id,identifier` (1 badly-poison, 2 burn, 3 berry-effect, 4 herb-effect, 5 paralyze, 6 poison, 7 flinch) / `item_fling_effect_prose.csv`: `item_fling_effect_id,local_language_id,effect` — **en/fr만** → 문구 절에 ko/ja.
- `berries.csv`: `id,item_id,firmness_id,natural_gift_power,natural_gift_type_id,size,max_harvest,growth_time,soil_dryness,smoothness` (size = mm, growth_time = 단계당 시간; kee/maranga/hopo/roseli 행은 일부·전부 빈 값)
- `berry_flavors.csv`: `berry_id,contest_type_id,flavor` (최대 40; berry 65–68은 행 없음) / `contest_types.csv`: `id,identifier` / `contest_type_names.csv`: `contest_type_id,local_language_id,name,flavor,color` → 맛 매핑 1 spicy, 2 dry, 3 sweet, 4 bitter, 5 sour (ko 없음 → 문구 절).
- `berry_firmness.csv`: `id,identifier` (1 very-soft, 2 soft, 3 hard, 4 very-hard, 5 super-hard) / `berry_firmness_names.csv`: `berry_firmness_id,local_language_id,name` (ko 없음 → 문구 절).
- `types.csv`: `id,identifier,generation_id,damage_class_id` (natural_gift_type_id → identifier).
- `pokemon_items.csv`: `pokemon_id,version_id,item_id,rarity` (rarity ∈ {1,5,50,100}%, 최신 version 30 = ultra-moon, 모든 pokemon_id가 `pokemon.json`에 있음, 범위 안 도구 85개가 기록 보유, oran-berry 26마리 최다, leftovers 2마리 143·446).
- `versions.csv`: `id,version_group_id,identifier` / `version_groups.csv`: `id,identifier,generation_id,order` (설명문 최신 vg 20 sword-shield; 데이터 집계에는 version_id 크기만 사용).
- 범위 분류 identifier(18): 배틀 `held-items`(12), `choice`(13), `bad-held-items`(15), `type-enhancement`(19), `plates`(17), `species-specific`(18), `jewels`(42), `mega-stones`(44), `memories`(45), `scarves`(36) / 나무열매 `effort-drop`(2), `medicine`(3), `other`(4), `in-a-pinch`(5), `picky-healing`(6), `type-protection`(7), `baking-only`(8), `catching-bonus`(48).
- 범위 행 350개, `roseli-berry`가 두 번(id 723: 이름·설명·fling 있음 / id 2279: 이름 없음, berries 행 68은 여기로) → identifier 기준 병합 후 **349개**(배틀 276, 나무열매 73). 사양의 "약 400개"는 실제 349개.
- `hopo-berry`(2278)는 분류 `pp-recovery`(회복약 포켓), 이름 행 없음 → 범위 밖(제외).
- 설명문: 291개는 ko/en/ja 모두 있음, 59개(신규 메가스톤 45, held-items 11 — booster-energy·covert-cloak·loaded-dice 등, plates 2, roseli 2279)는 어느 언어도 없음.
- 계산기 도구 `ITEMS`(src/lib/battle.ts) 54개 모두 범위 안.
- 아이콘 URL 200 확인: leftovers, choice-band, sitrus-berry, clefablite, roseli-berry, booster-energy, gengarite, fire-gem.
- 기대값(테스트용): leftovers id 211 / held-items / fling 10 / effect null · choice-band 197 / choice / fling 10 · flame-orb 250 / bad-held-items / fling 30 / burn · kings-rock 198 / held-items / fling 30 / flinch · sitrus-berry 135 / medicine / fling 10 / berry-effect / 자연의은혜 psychic 60 / firmness very-hard / size 95 / growth 8 / 맛 {spicy 0, dry 10, sweet 10, bitter 10, sour 10} · occa-berry: fire 60 · liechi-berry: grass 80 · kee-berry: firmness null, size null, flavors null.

## 결정한 모호한 부분
- "약 400개" → 실제 데이터 349개(위). 테스트는 349로 고정.
- `hopo-berry`는 나무열매지만 분류가 `pp-recovery`이고 이름 데이터가 없어 제외(범위는 분류 목록으로만 정한다).
- 분류·맛·단단함·던지기 효과 이름은 CSV에 ko(또는 ja) 없음 → 빌드 데이터에는 identifier만 두고 이름은 i18n 문구.
- "수치" 정렬 값 = 나무열매는 자연의은혜 위력, 그 외는 던지기 위력. 값 없음은 방향과 무관하게 맨 뒤.
- "맛" 열은 나무열매 보기에서만 보인다(전체 보기에서는 수치 칸에 자연의은혜 타입·위력).
- "등장 확률" = `pokemon_items.rarity`(야생에서 그 도구를 지니고 있을 확률). 포켓몬마다 가장 최신 version_id 기록만 쓰고, 기록이 USUM까지라는 안내문을 붙인다.
- 이전/다음 = 목록에서 넘어온 쿼리(`location.search`) 그대로의 결과 순서. 현재 도구가 그 결과에 없으면 기본 쿼리(전체, 이름 오름차순) 순서.
- "계산기 도구 목록" = 계산기 `SidePanel` 선택지인 `ITEMS` 54개. 그 밖 도구는 버튼 숨김, `atkItem`도 무시.
- 계산기에서 공격 포켓몬을 바꾸거나 좌우를 바꾸면 URL의 `atkItem`을 지운다(새로고침 시 낡은 도구가 다시 붙지 않게).
- 행 전체 클릭: Astryx `Table`에 행 클릭 prop이 없어 `transformBodyRow` 플러그인으로 `onClick` → `navigate`. 키보드 포커스는 이름 칸 `Link` 하나.
- 필터 바 고정 위치: 현재 머리말 높이 49px(≥lg), 87px(<lg, 탭 줄 포함) → `sticky top-22 lg:top-12`. 병렬 트랙 병합 후 높이가 바뀌면 Task 5에서 다시 맞춘다.
- 템플릿: 목록은 `table-page`, 상세는 `detail-page`(`npx astryx build`가 지목). 두 템플릿의 `Layout`/`LayoutContent`/`LayoutHeader` 틀은 `MainLayout`이 이미 맡으므로 벗기고(`npx astryx docs layout` 읽고 확인), 안쪽 `VStack`/`HStack` 구조와 gap은 유지한다.

## Review Focus
- 가나/전각/띄어쓰기 섞인 검색(`タベノコシ`, `구애 머리띠`, `choice band`) → 같은 도구가 나와야 함. (Task 1 테스트 `search folds kana, width and spaces`)
- 보기와 맞지 않는 분류가 URL에 남음(`?view=berry&cat=choice`, 모르는 `cat=foo`, `sort=bogus`) → 그 값만 무시, 빈 목록 아님. (Task 1 테스트 `parseItemQuery drops invalid values`)
- 빈 데이터 도구(설명 없는 59개, roseli 병합, kee/maranga/catching-bonus의 빈 berry 필드) → `-`/`noDescription` 표시, `NaN`/크래시 없음. (Task 1 테스트 `sparse items stay renderable`)
- 필터 걸린 목록에서 상세로 왔는데 현재 도구가 그 결과에 없음, 또는 목록 처음/끝 → 이전/다음이 기본 순서로 대체되거나 null. (Task 1 테스트 `itemNeighbors`)
- 계산기 URL에 모르는/계산기 밖 도구(`atkItem=oran-berry`, `atkItem=`) → 무시하고 추천 세트 도구 유지; 맞는 도구면 공격 측 선택. (Task 3 테스트 `parseCalcItem`, `initSideBySlug applies item`)

---

### Task 1: 아이템 데이터 빌드 + `items.json` + 접근자 모듈

**Files:**
- Create: `src/script/pokeapiCsv.mjs` (buildI18nData.mjs의 `parseCsv`, `loadCsv`, `nameTable`, `cleanFlavor`, `flavorTable`, `num`, `LANG`, `CSV_BASE`를 옮김)
- Modify: `src/script/buildI18nData.mjs` (위 함수들을 `./pokeapiCsv.mjs`에서 import, 동작 불변)
- Create: `src/script/buildItemsData.mjs`
- Create: `src/data/items.json` (생성물, 커밋)
- Modify: `src/lib/spriteUrls.ts` (`itemIconUrl` 추가)
- Create: `src/lib/items.ts`
- Test: `src/lib/items.test.ts`

**Interfaces:**
- Produces (`src/script/pokeapiCsv.mjs`): `loadCsv(name: string, csvDir: string): Promise<Record<string,string>[]>`, `nameTable(rows, idKey, langKey?, valueKey?): Map<string,{ko?,en?,ja?}>`, `flavorTable(rows, idKey): Map<string,{ko,en,ja}>`, `num(s): number|null`, `LANG`.
- Produces (`src/lib/spriteUrls.ts`): `itemIconUrl(slug: string): string`.
- Produces (`src/lib/items.ts`):
  ```ts
  export const BATTLE_CATEGORIES = ['held-items','choice','bad-held-items','type-enhancement','plates','species-specific','jewels','mega-stones','memories','scarves'] as const
  export const BERRY_CATEGORIES = ['medicine','in-a-pinch','picky-healing','type-protection','effort-drop','other','baking-only','catching-bonus'] as const
  export type ItemCategory = (typeof BATTLE_CATEGORIES)[number] | (typeof BERRY_CATEGORIES)[number]
  export const FLAVORS = ['spicy','dry','sweet','bitter','sour'] as const;  export type Flavor = (typeof FLAVORS)[number]
  export type Firmness = 'very-soft'|'soft'|'hard'|'very-hard'|'super-hard'
  export type FlingEffect = 'badly-poison'|'burn'|'berry-effect'|'herb-effect'|'paralyze'|'poison'|'flinch'
  export interface DexBerry { naturalGiftType: string|null; naturalGiftPower: number|null; firmness: Firmness|null; size: number|null /* mm */; growthTime: number|null /* 단계당 시간 */; flavors: Record<Flavor, number>|null }
  export interface DexItem { id: number; name: string; nameKo: string|null; nameEn: string|null; nameJa: string|null; kind: 'battle'|'berry'; category: ItemCategory; flingPower: number|null; flingEffect: FlingEffect|null; desc: LocalizedText|null; berry: DexBerry|null; heldBy: { id: number; rarity: number }[] }
  export const DEX_ITEMS: readonly DexItem[]            // id 오름차순
  export const ITEM_BY_SLUG: ReadonlyMap<string, DexItem>
  export const ITEM_VIEWS = ['all','battle','berry'] as const; export type ItemView = (typeof ITEM_VIEWS)[number]
  export type ItemSortKey = 'name'|'category'|'value'
  export const ITEM_SORT_DEFAULT_DIR: Record<ItemSortKey,'asc'|'desc'>   // name asc, category asc, value desc
  export interface ItemQuery { q: string; view: ItemView; cats: ItemCategory[]; sort: ItemSortKey; dir: 'asc'|'desc' }
  export function categoriesFor(view: ItemView): readonly ItemCategory[]   // all = BATTLE ++ BERRY
  export function parseItemQuery(params: URLSearchParams): ItemQuery       // 키: q, view, cat(쉼표 구분), sort, dir
  export function itemValue(item: DexItem): number | null
  export function queryItems(query: ItemQuery, lang: Lang): DexItem[]
  export function itemNeighbors(slug: string, query: ItemQuery, lang: Lang): { prev: DexItem|null; next: DexItem|null }
  export function itemName(item: DexItem, lang: Lang): string               // dex.ts localName 규칙
  export function itemDesc(item: DexItem, lang: Lang): { text: string; lang: Lang } | null
  export function heldByPokemon(item: DexItem): { pokemon: DexPokemon; rarity: number }[]  // rarity 내림차순, 그다음 getSpeciesId, id
  ```

- [ ] **Step 1: 공용 CSV 모듈로 옮기고 동작 불변 확인**

`src/script/pokeapiCsv.mjs`로 함수들을 그대로 옮기고 `loadCsv`만 `(name, csvDir)`로 디렉터리를 인자로 받게 한다. 그다음 옛 스크립트와 새 스크립트를 같은 CSV로 각각 복사본 데이터에 돌려 비교한다(스크립트가 `./src/data`를 cwd 기준으로 쓰므로):

```bash
R=$PWD; T=$(mktemp -d); mkdir -p $T/old $T/new
cp -r src $T/old/ && cp -r src $T/new/
git show HEAD:src/script/buildI18nData.mjs > $T/old/old.mjs
(cd $T/old && node old.mjs $R/node_modules/.cache/pokeapi-csv)
(cd $T/new && node $R/src/script/buildI18nData.mjs $R/node_modules/.cache/pokeapi-csv)
diff -r $T/old/src/data $T/new/src/data && echo SAME
```
Expected: `SAME` (`git status src/data`도 변화 없음 — 복사본에만 썼다).

- [ ] **Step 2: `buildItemsData.mjs` 작성**

실행: `node src/script/buildItemsData.mjs [csv-dir]`(기본 `node_modules/.cache/pokeapi-csv`, 없으면 내려받아 캐시). 읽는 CSV: `items, item_names, item_flavor_text, item_categories, berries, berry_flavors, berry_firmness, item_fling_effects, types, pokemon_items`. 규칙:
- 범위 = `item_categories.identifier`가 위 18개인 `items` 행. `kind` = 분류가 `BERRY_CATEGORIES`면 `berry`.
- identifier 기준 병합: `id`는 가장 작은 id; 이름·설명·`fling_*`는 가장 작은 id부터 값이 있는 첫 행; `berries` 행과 `pokemon_items`는 같은 identifier의 모든 id에서 모은다.
- 이름 `nameTable(item_names,'item_id')`, 설명 `flavorTable(item_flavor_text,'item_id')`(모든 언어 null이면 `desc: null`).
- `berry`: `berries` 행이 없으면 null. `naturalGiftType`은 `types.identifier`, 맛은 contest_type_id 1–5 → `spicy,dry,sweet,bitter,sour`, 맛 행이 없으면 `flavors: null`. 빈 칸은 `num()`으로 null.
- `heldBy`: 포켓몬마다 가장 큰 `version_id` 행의 `rarity`, `id` 오름차순.
- 출력은 id 오름차순, 압축(`JSON.stringify(v)`) + 끝 줄바꿈, 마지막에 `✅ items N (battle B, berry R)` 출력.

- [ ] **Step 3: 생성 실행**

Run: `node src/script/buildItemsData.mjs`
Expected: `✅ items 349 (battle 276, berry 73)`, `src/data/items.json` 생성.

- [ ] **Step 4: 실패하는 테스트 작성** (`src/lib/items.test.ts`)

```ts
const q = (p: string) => parseItemQuery(new URLSearchParams(p))
const slugs = (list: DexItem[]) => list.map((i) => i.name)

test('data counts and uniqueness', () => {
  expect(DEX_ITEMS).toHaveLength(349)
  expect(new Set(slugs([...DEX_ITEMS])).size).toBe(349)
  expect(DEX_ITEMS.filter((i) => i.kind === 'berry')).toHaveLength(73)
  expect(ITEM_BY_SLUG.has('hopo-berry')).toBe(false)
  expect(ITEM_BY_SLUG.has('poke-ball')).toBe(false)
})
test('names match itemNames.json', () => {
  for (const i of DEX_ITEMS) expect({ ko: i.nameKo, en: i.nameEn, ja: i.nameJa }).toEqual((itemNamesJson as Record<string, unknown>)[i.name])
})
test('known values', () => {
  expect(ITEM_BY_SLUG.get('leftovers')).toMatchObject({ id: 211, kind: 'battle', category: 'held-items', flingPower: 10, flingEffect: null, berry: null })
  expect(ITEM_BY_SLUG.get('flame-orb')).toMatchObject({ category: 'bad-held-items', flingPower: 30, flingEffect: 'burn' })
  expect(ITEM_BY_SLUG.get('kings-rock')!.flingEffect).toBe('flinch')
  expect(ITEM_BY_SLUG.get('sitrus-berry')).toMatchObject({ id: 135, kind: 'berry', category: 'medicine', flingEffect: 'berry-effect',
    berry: { naturalGiftType: 'psychic', naturalGiftPower: 60, firmness: 'very-hard', size: 95, growthTime: 8,
             flavors: { spicy: 0, dry: 10, sweet: 10, bitter: 10, sour: 10 } } })
  expect(ITEM_BY_SLUG.get('leftovers')!.heldBy.map((h) => h.id)).toEqual([143, 446])
  expect(ITEM_BY_SLUG.get('oran-berry')!.heldBy).toHaveLength(26)
  expect(ITEM_BY_SLUG.get('leftovers')!.desc).toEqual({ ko: expect.any(String), en: expect.any(String), ja: expect.stringContaining('持たせると') })
})
test('sparse items stay renderable', () => {
  const roseli = ITEM_BY_SLUG.get('roseli-berry')!
  expect(roseli).toMatchObject({ id: 723, nameKo: '로셀열매', category: 'type-protection' })
  expect(roseli.desc?.ko).toBeTruthy()
  expect(ITEM_BY_SLUG.get('kee-berry')!.berry).toMatchObject({ firmness: null, size: null, flavors: null, naturalGiftPower: 100 })
  expect(ITEM_BY_SLUG.get('golden-razz-berry')!.berry).toBeNull()
  expect(itemDesc(ITEM_BY_SLUG.get('booster-energy')!, 'ko')).toBeNull()
  expect(itemDesc({ ...ITEM_BY_SLUG.get('leftovers')!, desc: { ko: null, en: 'E', ja: null } }, 'ko')).toEqual({ text: 'E', lang: 'en' })
})
test('parseItemQuery defaults', () =>
  expect(q('')).toEqual({ q: '', view: 'all', cats: [], sort: 'name', dir: 'asc' }))
test('parseItemQuery drops invalid values', () => {
  expect(q('view=berry&cat=choice,medicine,foo&sort=bogus&dir=up')).toEqual({ q: '', view: 'berry', cats: ['medicine'], sort: 'name', dir: 'asc' })
  expect(q('view=nope&sort=value')).toMatchObject({ view: 'all', sort: 'value', dir: 'desc' })
})
test('view and category filter', () => {
  expect(queryItems(q('view=berry'), 'ko').every((i) => i.kind === 'berry')).toBe(true)
  expect(queryItems(q('view=battle'), 'ko')).toHaveLength(276)
  expect(new Set(queryItems(q('cat=choice'), 'en').map((i) => i.name))).toEqual(new Set(['choice-band', 'choice-scarf', 'choice-specs']))
})
test('search across ko/en/ja and slug', () => {
  for (const s of ['먹다남은', 'Leftovers', 'たべのこし', 'leftovers']) expect(slugs(queryItems(q(`q=${encodeURIComponent(s)}`), 'ko'))).toContain('leftovers')
})
test('search folds kana, width and spaces', () => {
  expect(slugs(queryItems(q('q=' + encodeURIComponent('タベノコシ')), 'ja'))).toContain('leftovers')
  expect(slugs(queryItems(q('q=' + encodeURIComponent('구애 머리띠')), 'ko'))).toEqual(['choice-band'])
  expect(slugs(queryItems(q('q=choice%20band'), 'en'))).toEqual(['choice-band'])
})
test('sort by name uses the language collator', () => {
  const names = queryItems(q('cat=choice'), 'ko').map((i) => itemName(i, 'ko'))
  expect(names).toEqual([...names].sort(new Intl.Collator('ko-KR', { numeric: true }).compare))
})
test('sort by value puts nulls last in both directions', () => {
  for (const dir of ['asc', 'desc']) {
    const vals = queryItems(q(`sort=value&dir=${dir}`), 'en').map(itemValue)
    const firstNull = vals.indexOf(null)
    expect(firstNull === -1 || vals.slice(firstNull).every((v) => v == null)).toBe(true)
  }
  expect(itemValue(ITEM_BY_SLUG.get('sitrus-berry')!)).toBe(60)
  expect(itemValue(ITEM_BY_SLUG.get('flame-orb')!)).toBe(30)
})
test('sort by category follows category order', () => {
  const order = categoriesFor('all')
  const idx = queryItems(q('sort=category'), 'en').map((i) => order.indexOf(i.category))
  expect(idx).toEqual([...idx].sort((a, b) => a - b))
})
test('itemNeighbors', () => {
  const list = queryItems(q('cat=choice'), 'en')
  expect(itemNeighbors(list[1].name, q('cat=choice'), 'en')).toEqual({ prev: list[0], next: list[2] })
  expect(itemNeighbors(list[0].name, q('cat=choice'), 'en').prev).toBeNull()
  const all = queryItems(q(''), 'en'); const i = all.findIndex((x) => x.name === 'leftovers')
  expect(itemNeighbors('leftovers', q('cat=choice'), 'en')).toEqual({ prev: all[i - 1], next: all[i + 1] })
})
test('heldByPokemon sorted by rarity', () => {
  const r = heldByPokemon(ITEM_BY_SLUG.get('oran-berry')!).map((h) => h.rarity)
  expect(r).toEqual([...r].sort((a, b) => b - a))
})
```
(`itemNamesJson`은 `../data/itemNames.json` import.)

- [ ] **Step 5: 실패 확인**

Run: `npx vitest run src/lib/items.test.ts`
Expected: FAIL (`Cannot find module './items'`).

- [ ] **Step 6: `src/lib/items.ts`와 `itemIconUrl` 구현**

검색 키는 `buildSearchKey(name, nameKo, nameEn, nameJa)`(src/components/dex/text.ts)를 모듈 로드 때 한 번 만들고, 바늘은 `foldSearch(q)`; `includes`로 매칭. 이름 정렬은 `collator(lang)`, 같으면 id. 분류 정렬은 `categoriesFor('all')` 순서 → 이름. 수치 정렬은 MovesPage의 null-last 비교와 같고 동점은 이름. `itemName`은 `localName`, `itemDesc`는 `[lang, 'en', 'ko', 'ja']` 순으로 첫 값. `heldByPokemon`은 `getDexPokemon(id)`가 없는 항목을 건너뛴다. `itemIconUrl = (slug) => \`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png\``.

- [ ] **Step 7: 통과 확인**

Run: `npx vitest run src/lib/items.test.ts && npx tsc -b && npm run lint`
Expected: 모든 테스트 PASS, 타입·린트 오류 없음.

- [ ] **Step 8: Commit**

```bash
git add src/script/pokeapiCsv.mjs src/script/buildI18nData.mjs src/script/buildItemsData.mjs src/data/items.json src/lib/spriteUrls.ts src/lib/items.ts src/lib/items.test.ts
git commit -m "feat(items): build battle item and berry data with typed accessors" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LWa7NiTKM7PN9RxoSGmNGy"
```

---

### Task 2: `/items` 목록 화면 + 메뉴 + 라우트 + 문구

**Files:**
- Create: `src/i18n/messages/items.ts` (문구 절 전체)
- Modify: `src/i18n/messages/common.ts` (`navItems` ko/en/ja)
- Modify: `src/layouts/MainLayout.tsx` (`NAV_ITEMS`에 abilities 다음 한 줄)
- Modify: `src/App.tsx` (lazy import 2개 + 라우트 2개)
- Create: `src/components/dex/useRowLink.ts`
- Create: `src/components/dex/useSlashFocus.ts`
- Create: `src/pages/items/ItemUi.tsx`
- Create: `src/pages/items/ItemListPage.tsx` (템플릿 `table-page`에서)
- Create: `src/pages/items/ItemDetailPage.tsx` (이 태스크에서는 Task 4 전까지 `null` 반환하는 자리표시 — 라우트 import가 깨지지 않게)

**Interfaces:**
- Consumes: Task 1의 `DEX_ITEMS`, `parseItemQuery`, `queryItems`, `categoriesFor`, `ITEM_SORT_DEFAULT_DIR`, `itemName`, `itemDesc`, `itemValue`, `itemIconUrl`, `ItemQuery`.
- Produces:
  - `useRowLink<T extends Record<string, unknown>>(getHref: (row: T) => string): TablePlugin<T>` — `rowModel: 'flat'`, `transformBodyRow`가 `htmlProps.onClick`(대상이 `a, button, input` 안이거나 선택된 글자가 있으면 무시, 아니면 `navigate(getHref(row))`)과 `className`에 `cursor-pointer`를 더한다.
  - `useSlashFocus(): void` — 편집 요소 밖에서 `/`(수식키 없음) 누르면 `preventDefault` 후 `main input[type="search"]` 첫 요소에 포커스.
  - `ItemUi.tsx`: `ItemIcon({ slug, size }: { slug: string; size: 24 | 48 })`(PokeImage `pixelated`, `alt=""`), `categoryLabel(c: ItemCategory, t): string`, `ItemValueCell({ item })`(berry면 `TypeIconDot` + 자연의은혜 위력, 아니면 던지기 위력, 없으면 `-`; `Text size="sm" hasTabularNumbers`), `FlavorSummary({ flavors })`(값>0인 맛만 `flavorShort_*` + 숫자를 ` · `로 이음, null이면 `-`), `itemQueryToSearch(q: ItemQuery): string`(기본값은 생략한 `?…` 또는 `''`).
  - 라우트: `/items` → `ItemListPage`, `/items/:slug` → `ItemDetailPage`.

- [ ] **Step 1: 템플릿 확인과 스캐폴드**

Run: `npx astryx build "dense searchable item table with view toggle and category filter chips"` → `table-page`를 지목하는지 확인. `npx astryx docs layout`을 읽고, `npx astryx template table-page --type page src/pages/items/ItemListPage.tsx`로 스캐폴드. `Layout`/`LayoutContent`(와 `contentWidth`)를 벗기고 안쪽 `VStack`/`HStack` 구조와 gap을 남긴 채 내용만 바꾼다. 인보이스 픽스처·`MetadataList`·합계 행·HoverCard·`usePowerSearchConfig`·열 팝오버는 지운다(검색창 + 보기 토글 + 분류 칩이 같은 일을 한다).

- [ ] **Step 2: 문구·메뉴·라우트 연결**

`itemsMessages`(문구 절), `commonMessages.navItems`, `NAV_ITEMS`에 `{ to: '/items', key: 'navItems', match: ['/items'] }`, `App.tsx`에 `const ItemListPage = lazy(() => import('./pages/items/ItemListPage.tsx'))`, `ItemDetailPage` 동일, `<Route path="/items" …/>`, `<Route path="/items/:slug" …/>`.

- [ ] **Step 3: 목록 구현**

- 쿼리는 `useUrlParams()` + `parseItemQuery(params)`; 쓰기는 `update({ q, view, cat: cats.join(',') || null, sort: sort==='name'?null:sort, dir: dir===default?null:dir })`. 보기를 바꾸면 `cat`을 지운다.
- 필터 바(`VStack`, `className="sticky top-22 z-40 bg-surface py-2 lg:top-12"`):
  - 첫 줄 `HStack wrap`: `SearchField`(왼쪽, 넓게) | `Segmented` 보기(`viewAll/viewBattle/viewBerry`, `isLabelHidden`) | 정렬 `SelectField`(name/category/value) + 방향 `IconButton`(MovesPage와 같은 방식) | 필터가 있을 때 `resetFilters` ghost 버튼.
  - 둘째 줄 `role="group" aria-label={t('filterCategory')}`인 `HStack wrap`(<640px은 `overflow-x-auto`로 가로 스크롤 한 줄): `FilterChip` "전체" + `categoriesFor(view)` 각각 토글(여러 개 선택).
  - 결과 수 `aria-live="polite"` `Text type="supporting"` `tc('results', { n })`.
- 표: `Table density="compact" hasHover textOverflow="truncate" rowCount plugins={{ sortable, rowLink }}`; 열(`useMediaQuery('(min-width: 640px)')`가 false면 *표시한 열만*):
  | key | header | width | 내용 |
  |---|---|---|---|
  | icon | `''`(aria 이름은 `colIcon`) | `pixel(40)` | `ItemIcon size={24}` |
  | name (sortable) | `colItem` | `proportional(2, { minWidth: 160 })` | `Link href={/items/slug + search}` semibold 이름 + 같은 줄 다른 언어 이름 `Text type="supporting"`(`lang` 속성); <640px이면 둘째 줄에 분류 |
  | category (sortable, ≥640) | `colCategory` | `pixel(128)` | `Text size="sm" color="secondary"` |
  | desc (≥640) | `colDesc` | `proportional(3, { minWidth: 200 })` | `cleanDesc(itemDesc(...).text)` 한 줄, 없으면 `-` |
  | value (sortable) | `colValue` | `pixel(112)`, `align: 'end'` | `ItemValueCell` |
  | flavor (`view==='berry'`만) | `colFlavor` | `pixel(176)` | `FlavorSummary` |
- 진행형 렌더 `useProgressive(filtered.length, resetKey, 60)` + `LoadMore`; 0건이면 `EmptyState` + 초기화 버튼.
- `useDocumentTitle(t('title'))`, `useSlashFocus()`, `PageHeader title subtitle={t('subtitle', { n: DEX_ITEMS.length })}`.

- [ ] **Step 4: 정적 검사**

Run: `npx tsc -b && npm run lint && npm test`
Expected: 오류 없음, Task 1 테스트 PASS.

- [ ] **Step 5: 자기 점검**

파일을 다시 읽고 `style={{`, `<div`, `<span`(행 안 `lang` 표시처럼 Astryx가 못 하는 곳만 허용, `Text`에 `lang`을 못 주면 `span lang`), `[#`, `-[` 임의값, `.css` import가 없는지 `grep -nE "style=\{\{|<div|\[#|-\[[0-9]" src/pages/items src/components/dex/useRowLink.ts src/components/dex/useSlashFocus.ts`로 확인. Expected: 출력 없음.

- [ ] **Step 6: Commit**

```bash
git add src/i18n/messages/items.ts src/i18n/messages/common.ts src/layouts/MainLayout.tsx src/App.tsx src/components/dex/useRowLink.ts src/components/dex/useSlashFocus.ts src/pages/items
git commit -m "feat(items): dense item list with view toggle, category chips and sticky filters" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LWa7NiTKM7PN9RxoSGmNGy"
```

---

### Task 3: 계산기 `atkItem` 파라미터

**Files:**
- Create: `src/lib/calcItems.ts` (battle.ts의 `ITEMS` 배열을 엔진 import 없이 옮김)
- Modify: `src/lib/battle.ts` (`import { CALC_ITEMS as ITEMS } from './calcItems'` + `export { ITEMS }`, 배열 삭제 — 나머지 불변)
- Modify: `src/components/calc/calcState.ts` (`initSideBySlug`에 세 번째 인자)
- Modify: `src/pages/CalcPage.tsx` (두 줄)
- Test: `src/lib/calcItems.test.ts`

**Interfaces:**
- Produces (`src/lib/calcItems.ts`): `CALC_ITEMS: readonly { id: string; ko: string }[]`, `isCalcItem(slug: string): boolean`, `parseCalcItem(raw: string | null): string | null`.
- Produces (`calcState.ts`): `initSideBySlug(slug: string | null, fallback: string, item?: string | null): SideState | null` — `item`이 있으면 반환 상태의 `item`을 그것으로.
- URL 형식(Task 4가 씀): `/calc?atkItem=<slug>`.

- [ ] **Step 1: 실패하는 테스트**

```ts
test('parseCalcItem', () => {
  expect(parseCalcItem('choice-band')).toBe('choice-band')
  expect(parseCalcItem('sitrus-berry')).toBe('sitrus-berry')
  expect(parseCalcItem('oran-berry')).toBeNull()
  expect(parseCalcItem('')).toBeNull()
  expect(parseCalcItem(null)).toBeNull()
  expect(parseCalcItem('Choice-Band')).toBeNull()
})
test('every calc item exists in the item dex', () => {
  for (const { id } of CALC_ITEMS) expect(ITEM_BY_SLUG.has(id)).toBe(true)
  expect(CALC_ITEMS).toHaveLength(54)
})
test('initSideBySlug applies item', () => {
  expect(initSideBySlug('garchomp', 'garchomp', 'choice-band')!.item).toBe('choice-band')
  const plain = initSideBySlug('garchomp', 'garchomp')!
  expect(initSideBySlug('garchomp', 'garchomp', null)!.item).toBe(plain.item)
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/calcItems.test.ts` → Expected: FAIL (`Cannot find module './calcItems'`).

- [ ] **Step 3: 구현**

`CALC_ITEMS`로 배열을 옮기고 `ID_SET`으로 `isCalcItem`; `parseCalcItem`은 `raw && isCalcItem(raw) ? raw : null`. `initSideBySlug`는 기존 결과에 `item`이 있으면 `{ ...side, item }`. `CalcPage.tsx`:
- `initSideBySlug(params.get('atk'), 'garchomp', parseCalcItem(params.get('atkItem')))`
- `syncUrl` 안에 `next.delete('atkItem')`

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run && npx tsc -b && npm run lint` → Expected: 전부 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/calcItems.ts src/lib/calcItems.test.ts src/lib/battle.ts src/components/calc/calcState.ts src/pages/CalcPage.tsx
git commit -m "feat(calc): preselect attacker item from atkItem URL param" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LWa7NiTKM7PN9RxoSGmNGy"
```

---

### Task 4: `/items/:slug` 상세 화면

**Files:**
- Modify: `src/pages/items/ItemDetailPage.tsx` (Task 2 자리표시를 템플릿 `detail-page`로 교체)

**Interfaces:**
- Consumes: Task 1 `ITEM_BY_SLUG`, `parseItemQuery`, `itemNeighbors`, `itemName`, `itemDesc`, `heldByPokemon`, `FLAVORS`; Task 2 `ItemIcon`, `categoryLabel`, `itemQueryToSearch`, `itemsMessages`; Task 3 `isCalcItem`; 기존 `StatBar`, `TypeTag`, `PokeImage`, `pokemonImageCandidates`, `displayName`, `BackLink`, `EmptyState`, `cleanDesc`, `LANG_LABEL`.

- [ ] **Step 1: 템플릿 확인과 스캐폴드**

Run: `npx astryx build "item detail page with header actions, key facts and dense related list"` → `detail-page` 확인. 내용을 `ItemDetailPage.tsx`에 `npx astryx template detail-page --type page src/pages/items/ItemDetailPage.tsx`로 덮어쓰고(자리표시였으니), `Layout*` 틀과 `@heroicons/react` import, 탭·Dialog·Timeline·합계 블록을 벗긴다. 머리말 `HStack`(왼쪽 정체, 오른쪽 행동)과 2열 본문 구조·gap은 유지.

- [ ] **Step 2: 상세 구현**

- `useParams().slug` → `ITEM_BY_SLUG`; 없으면 `BackLink` + `EmptyState title={t('notFound')} description={t('notFoundBody')}`. 제목 `useDocumentTitle(\`${name} · ${t('title')}\`)`.
- 쿼리 = `parseItemQuery(new URLSearchParams(location.search))`, 이웃 = `itemNeighbors(slug, query, lang)`; 링크는 `/items/<slug>${location.search}`; `BackLink to={/items + location.search}`.
- 머리말(첫 화면 왼쪽 위): `ItemIcon size={48}` · `Heading level={1}` 이름 · 다른 언어 이름(`otherNames` 라벨, MoveDetail과 같은 방식) · 분류 `Text color="secondary"` · 설명 `Text as="p"`를 `max-w-prose`로; 대체 언어면 뒤에 `Text type="supporting"` `t('descFallback', { lang: LANG_LABEL[d.lang] })`, 없으면 `noDescription`(secondary).
- 머리말 오른쪽 위 `HStack`: 이전/다음 `IconButton`(`chevronLeft`/`chevronRight`, `label` = `t('prev')`/`t('next')` + 이름, 없으면 `isDisabled`) · `isCalcItem(slug)`일 때만 `Button variant="primary" href={\`/calc?atkItem=${slug}\`} label={t('tryInCalc')}`.
- ←/→: PokemonDetailPage의 `onKey` 가드(수식키, `input, textarea, select, [contenteditable], [role=tablist], [role=radiogroup], [role=listbox]`) 그대로, `navigate(\`/items/${target.name}${location.search}\`)`. 슬러그가 바뀌면 `window.scrollTo({ top: 0 })`.
- 본문 `Grid columns={{ minWidth: 400, max: 2 }}`(템플릿 2열 그대로, 좁으면 1열):
  - 왼쪽 `Card` `MetadataList columns="multi"`: `flingPower`(값 또는 `-`), `flingEffect`(`t('flingEffect_<id>')` 또는 `-`); berry면 `naturalGiftType`(`TypeTag`), `naturalGiftPower`, `firmness`(`t('firmness_<id>')`), `size`(`t('sizeValue', { n: size/10 })`, 소수 1자리), `growthTime`(`t('growthValue', { n })`); 빈 값은 `-`. 그 아래 berry이고 `flavors`가 있으면 `Heading level={2}` `flavors` + 5행(`List` 행마다 `HStack`: 라벨 `flavor_*`(`Text`, 고정 폭은 `w-16` 토큰) · `StatBar max={40} label=…`(남은 폭) · 숫자 `hasTabularNumbers` 오른쪽 정렬).
  - 오른쪽 `section aria-labelledby`: `Heading level={2}` `heldBy` + `Badge` 개수(`heldByCount` aria) + `Text type="supporting"` `heldByNote`; `List`의 `ListItem href={/pokemon/id} startContent={PokeImage 40 pokemonImageCandidates(id, 40, { sprite })} label={displayName(p, lang)} endContent={<Text size="sm" hasTabularNumbers aria-label={t('heldChanceLabel', { n })}>{n}%</Text>}`; 0건이면 `EmptyState title={t('noHeldBy')}`.

- [ ] **Step 3: 정적 검사와 자기 점검**

Run: `npx tsc -b && npm run lint && npm test && grep -nE "style=\{\{|<div|\[#|-\[[0-9]|heroicons" src/pages/items`
Expected: 오류·출력 없음.

- [ ] **Step 4: Commit**

```bash
git add src/pages/items/ItemDetailPage.tsx
git commit -m "feat(items): item detail with stats, flavors, wild holders, prev/next and calculator link" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LWa7NiTKM7PN9RxoSGmNGy"
```

---

### Task 5: 브라우저 검증 + 빌드 진단

**Files:**
- Create (커밋 안 함): `$SCRATCH/verify-items.cjs`(세션 스크래치 폴더), 스크린샷 `$SCRATCH/shots/*.png`
- Modify (필요할 때만): `src/pages/items/ItemListPage.tsx`의 `top-*` 값

- [ ] **Step 1: 빌드·진단**

Run: `npm run build && npx astryx doctor --built dist && npm run lint && npm test`
Expected: 전부 exit 0(doctor 경고는 새 파일에서 나온 raw 요소/임의값이면 고친다).

- [ ] **Step 2: dev 서버**

Run(백그라운드): `npx vite --port 5191 --strictPort` → `http://localhost:5191/portfolio/pokestra/#/items` 응답 확인.

- [ ] **Step 3: Playwright 스크립트 작성·실행** (`locale: 'ko-KR'`, 1280×800과 390×844)

검사 항목과 통과 조건:
1. 스크린샷: `/items`, `/items?view=berry`, `/items/leftovers`, `/items/sitrus-berry`를 1280·390 각각 → 8장 저장 후 직접 열어 본다(왼쪽 위 검색창이 첫 시선, 390에서 분류 칩 한 줄 가로 스크롤, 상세 머리말 오른쪽 위 행동).
2. CLS: `PerformanceObserver({ type: 'layout-shift', buffered: true })`로 `hadRecentInput` 아닌 값 합 — `/items`, `/items/leftovers` 로드 후 3초, 각 폭에서 `< 0.1`.
3. 390에서 `document.documentElement.scrollWidth <= 390`.
4. 고정 필터 바: `window.scrollTo(0, 1500)` 뒤 필터 바 `getBoundingClientRect().top`과 `header.getBoundingClientRect().bottom` 차이 `≤ 1`(두 폭). 어긋나면 `top-*`를 측정값에 맞는 토큰 단계로 고치고 다시 실행.
5. 키보드: `/items`에서 `/` → `document.activeElement`가 검색창; `たべのこし` 입력 → 행 1개, 이름 `먹다남은음식`; 그 행의 설명 칸 클릭 → URL `#/items/leftovers?q=…`; `ArrowRight` → 슬러그 바뀜, `ArrowLeft` → `leftovers`로 복귀; 검색창에 포커스한 채 `ArrowRight`는 URL 그대로.
6. 계산기: `/items/choice-band`에서 `계산기에서 써 보기` 클릭 → URL에 `#/calc?atkItem=choice-band`, 엔진 로드 후 첫 `도구` 선택 상자(공격 측) 글자가 `구애머리띠`; `/items/oran-berry`에는 그 버튼이 없음.
7. 언어 전환: 상세에서 `EN` 누르면 `h1`이 `Leftovers`.

Expected: 7개 모두 PASS 출력, 스크린샷 8장.

- [ ] **Step 4: Commit (고친 것이 있을 때만)**

```bash
git add src/pages/items/ItemListPage.tsx
git commit -m "fix(items): align sticky filter bar with header" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01LWa7NiTKM7PN9RxoSGmNGy"
```

---

## 문구 (`src/i18n/messages/items.ts` — `export const itemsMessages = defineMessages({ ko, en, ja })`)

`common.ts`: `navItems` — ko `도구`, en `Items`, ja `どうぐ`.

| key | ko | en | ja |
|---|---|---|---|
| title | 도구 | Items | どうぐ |
| subtitle | 배틀 도구와 나무열매 {n}개를 이름, 분류, 수치로 찾을 수 있습니다. | Find any of {n} held items and Berries by name, category or stats. | {n}種類の持ち物ときのみを、名前、分類、数値で探せます。 |
| searchLabel | 도구 검색 | Search items | どうぐを検索 |
| searchPlaceholder | 도구 이름 (예: 먹다남은음식, Leftovers, たべのこし) | Item name (e.g. Leftovers, 먹다남은음식, たべのこし) | どうぐの名前（例: たべのこし、Leftovers） |
| view | 보기 | View | 表示 |
| viewAll | 전체 | All | すべて |
| viewBattle | 배틀 도구 | Battle items | バトル用どうぐ |
| viewBerry | 나무열매 | Berries | きのみ |
| filterCategory | 분류 | Category | 分類 |
| sortBy | 정렬 | Sort by | 並び替え |
| sortName | 이름 | Name | 名前 |
| sortCategory | 분류 | Category | 分類 |
| sortValue | 수치 | Value | 数値 |
| ascending | 오름차순 | Ascending | 昇順 |
| descending | 내림차순 | Descending | 降順 |
| toggleDirection | 정렬 방향 바꾸기 | Toggle sort direction | 並び順を切り替え |
| resetFilters | 필터 초기화 | Reset filters | 条件をリセット |
| list | 도구 목록 | Item list | どうぐ一覧 |
| colIcon | 아이콘 | Icon | アイコン |
| colItem | 도구 | Item | どうぐ |
| colCategory | 분류 | Category | 分類 |
| colDesc | 설명 | Description | 説明 |
| colValue | 수치 | Value | 数値 |
| colFlavor | 맛 | Flavor | 味 |
| fling | 던지기 | Fling | なげつける |
| flingPower | 던지기 위력 | Fling power | なげつけるの威力 |
| flingEffect | 던지기 효과 | Fling effect | なげつけるの効果 |
| naturalGift | 자연의은혜 | Natural Gift | しぜんのめぐみ |
| naturalGiftType | 자연의은혜 타입 | Natural Gift type | しぜんのめぐみのタイプ |
| naturalGiftPower | 자연의은혜 위력 | Natural Gift power | しぜんのめぐみの威力 |
| flavors | 맛 | Flavors | 味 |
| firmness | 단단함 | Firmness | かたさ |
| size | 크기 | Size | 大きさ |
| sizeValue | {n} cm | {n} cm | {n} cm |
| growthTime | 자라는 시간 | Growth time | 育つ時間 |
| growthValue | 단계마다 {n}시간 | {n} h per stage | 1段階 {n}時間 |
| description | 설명 | Description | 説明 |
| noDescription | 게임 설명문이 아직 없어요. | No in-game description yet. | ゲーム内の説明文はまだありません。 |
| descFallback | ({lang} 설명) | ({lang} text) | （{lang}の説明） |
| tryInCalc | 계산기에서 써 보기 | Try in calculator | ダメージ計算で試す |
| heldBy | 야생에서 지니고 있는 포켓몬 | Held by wild Pokémon | 野生で持っているポケモン |
| heldByCount | {n}마리 | {n} Pokémon | {n}匹 |
| heldChanceLabel | 지니고 있을 확률 {n}% | Held {n}% of the time | 持っている確率 {n}% |
| heldByNote | 기록은 울트라썬·울트라문까지의 야생 포켓몬 기준이에요. | Based on wild Pokémon records up to Ultra Sun and Ultra Moon. | ウルトラサン・ウルトラムーンまでの野生ポケモンの記録です。 |
| noHeldBy | 야생에서 이 도구를 지닌 포켓몬 기록이 없어요. | No wild Pokémon are recorded holding this item. | この道具を持つ野生ポケモンの記録はありません。 |
| prev | 이전 도구 | Previous item | 前のどうぐ |
| next | 다음 도구 | Next item | 次のどうぐ |
| back | 도구 목록 | All items | どうぐ一覧 |
| notFound | 도구를 찾을 수 없어요 | Item not found | どうぐが見つかりません |
| notFoundBody | 주소를 확인하거나 목록에서 다시 골라 주세요. | Check the address or pick an item from the list. | アドレスを確認するか、一覧から選び直してください。 |
| otherNames | 다른 언어 | Other languages | 他の言語 |
| cat_held-items | 지닌 도구 | Held items | もちもの |
| cat_choice | 구애 도구 | Choice items | こだわりアイテム |
| cat_bad-held-items | 불리한 도구 | Bad held items | デメリットアイテム |
| cat_type-enhancement | 타입 강화 | Type enhancement | タイプ強化 |
| cat_plates | 플레이트 | Plates | プレート |
| cat_species-specific | 전용 도구 | Species-specific | 専用アイテム |
| cat_jewels | 주얼 | Gems | ジュエル |
| cat_mega-stones | 메가스톤 | Mega Stones | メガストーン |
| cat_memories | 메모리 | Memories | メモリ |
| cat_scarves | 스카프 | Scarves | スカーフ |
| cat_medicine | 회복 | Medicine | 回復 |
| cat_in-a-pinch | 위기 발동 | In a pinch | ピンチ発動 |
| cat_picky-healing | 맛 회복 | Picky healing | 好き嫌い回復 |
| cat_type-protection | 반감 열매 | Type protection | 半減きのみ |
| cat_effort-drop | 노력치 감소 | Effort drop | 努力値ダウン |
| cat_other | 기타 | Other | その他 |
| cat_baking-only | 과자 재료 | Baking only | おかし用 |
| cat_catching-bonus | 포획 보조 | Catching bonus | 捕獲ボーナス |
| flingEffect_badly-poison | 상대를 맹독 상태로 만든다. | Badly poisons the target. | 相手を もうどく状態にする。 |
| flingEffect_burn | 상대를 화상 상태로 만든다. | Burns the target. | 相手を やけど状態にする。 |
| flingEffect_berry-effect | 상대에게 나무열매 효과가 바로 나타난다. | Immediately activates the berry’s effect on the target. | 相手に きのみの効果が すぐに出る。 |
| flingEffect_herb-effect | 상대에게 허브 효과가 바로 나타난다. | Immediately activates the herb’s effect on the target. | 相手に ハーブの効果が すぐに出る。 |
| flingEffect_paralyze | 상대를 마비 상태로 만든다. | Paralyzes the target. | 相手を まひ状態にする。 |
| flingEffect_poison | 상대를 독 상태로 만든다. | Poisons the target. | 相手を どく状態にする。 |
| flingEffect_flinch | 상대가 이번 턴에 아직 행동하지 않았다면 풀죽게 만든다. | Target will flinch if it has not yet gone this turn. | 相手が まだ行動していなければ ひるませる。 |
| flavor_spicy | 매운맛 | Spicy | からい |
| flavor_dry | 떫은맛 | Dry | しぶい |
| flavor_sweet | 단맛 | Sweet | あまい |
| flavor_bitter | 쓴맛 | Bitter | にがい |
| flavor_sour | 신맛 | Sour | すっぱい |
| flavorShort_spicy | 매운 | Spicy | から |
| flavorShort_dry | 떫은 | Dry | しぶ |
| flavorShort_sweet | 단 | Sweet | あま |
| flavorShort_bitter | 쓴 | Bitter | にが |
| flavorShort_sour | 신 | Sour | すっぱ |
| firmness_very-soft | 아주 부드러움 | Very soft | とてもやわらかい |
| firmness_soft | 부드러움 | Soft | やわらかい |
| firmness_hard | 딱딱함 | Hard | かたい |
| firmness_very-hard | 아주 딱딱함 | Very hard | とてもかたい |
| firmness_super-hard | 엄청 딱딱함 | Super hard | とてつもなくかたい |

## Self-Review 결과
- 사양 대조: 범위(Task 1 분류 18개), 목록 첫 줄·둘째 줄·고정·표 열·정렬·행 클릭(Task 2), 상세 머리말·수치·맛 막대·단단함·크기·자라는 시간·지닌 포켓몬·이전/다음·←/→(Task 4), `atkItem`·버튼 숨김(Task 3·4), 데이터 생성·커밋·최신 문구·아이콘·이름 일치(Task 1), 실패 조건 두 가지(Task 1 `itemDesc` 대체 표시, Task 5 항목 6). 빈 곳 없음.
- 순서 조정: 상세가 `isCalcItem`을 쓰므로 계산기(Task 3)를 상세(Task 4) 앞으로 옮겼다.
- 타입 일관성: `DexItem.name`(slug), `ItemQuery.cats`, `itemNeighbors` 반환 `{prev,next}`, `initSideBySlug(…, item?)`, `CALC_ITEMS`/`ITEMS` 별칭을 모든 태스크에서 같게 썼다.
