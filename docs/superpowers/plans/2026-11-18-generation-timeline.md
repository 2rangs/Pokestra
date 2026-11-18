# 세대 타임라인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 포켓몬 상세 화면에서 세대를 고르면 스프라이트·타입·특성·종족값·울음소리가 그 세대 기준으로 바뀌게 한다.

**Architecture:** 세대 계산은 `src/lib/generation.ts`의 순수 함수(vitest로 테스트). 화면은 `GenerationBar` 컴포넌트(세대 선택 + 울음소리)와 `PokemonDetailPage`의 연결로 구성. 데이터는 이미 받는 PokeAPI `pokemon/{id}` 응답의 `past_*`, `cries`, `sprites.versions`.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Astryx 0.7.16, TanStack Query, vitest (신규).

**Spec:** `docs/superpowers/specs/2026-11-18-generation-timeline-design.md`

## Global Constraints
- AGENTS.md 규칙: 새 코드에 `<div>`/`style={{}}`/raw hex·px 금지, Astryx 컴포넌트와 토큰 유틸리티만. Badge는 개수 전용.
- 모든 문구는 `src/i18n/messages/pokedex.ts`에 ko/en/ja 세 언어 (`defineMessages`가 빠진 키를 타입 오류로 잡음).
- URL: `?gen=N` (1–9). 값이 없거나 범위 밖이면 "현재"(파라미터 없음과 동일). 기존 `?tab=`과 공존.
- 실전 능력치 패널·기술 탭·배틀·계산기는 변경 없음.
- 커밋 메시지 끝에 저장소 규칙의 Co-Authored-By / Claude-Session 줄.

## Review Focus
- 등장 세대보다 이른 `?gen=`(예: 9세대 포켓몬에 `?gen=3`) → 현재로 취급, 선택 줄에도 없음. (Task 3 테스트: `clampGen`)
- `detail`이 아직 로딩 중이거나 실패(로컬 데이터만 있음) → 선택 줄은 보이되 값은 현재 기준, 크래시 없음. (Task 3 수동 확인)
- 다른 폼(메가·지역폼, id>10000)은 `past_*`가 비어 있고 `sprites.versions`도 거의 비어 있음 → 스프라이트는 아트워크로 폴백. (Task 1 테스트: `spriteAt` 빈 versions)
- `cries.legacy`가 null → 옛날 버튼 숨김, 최신만. (Task 1 테스트)
- 방향키로 이전/다음 포켓몬 이동 시 `gen`이 다음 포켓몬 등장 세대보다 이르면 현재로 → `clampGen`으로 처리.

---

### Task 1: 세대 계산 순수 함수 + vitest

**Files:**
- Create: `src/lib/generation.ts`
- Create: `src/lib/generation.test.ts`
- Create: `src/lib/__fixtures__/clefairy.json` (PokeAPI `pokemon/clefairy`에서 `types, abilities, stats, past_types, past_abilities, past_stats, cries, sprites.versions`만 남긴 것)
- Modify: `package.json` (devDependency `vitest`, script `"test": "vitest run"`)
- Modify: `src/hooks/usePokemon.ts` (`PokemonDetail`에 필드 추가)

**Interfaces:**
- Produces (`src/hooks/usePokemon.ts`):
  ```ts
  export interface PastEntry<T> { generation: NamedAPIResource; } // + 아래 필드
  PokemonDetail += {
    past_types?: { generation: NamedAPIResource; types: { slot: number; type: { name: string } }[] }[]
    past_abilities?: { generation: NamedAPIResource; abilities: { slot: number; is_hidden: boolean; ability: { name: string } | null }[] }[]
    past_stats?: { generation: NamedAPIResource; stats: { base_stat: number; stat: { name: string } }[] }[]
    cries?: { latest: string | null; legacy: string | null }
  }
  ```
  (`PastEntry` 줄은 넣지 말 것 — 위 세 필드만 인라인 타입으로.)
- Produces (`src/lib/generation.ts`):
  ```ts
  export const LATEST_GEN = 9
  export type GenStatKey = StatKey | "special"   // StatKey는 constants/pokemon 기존 타입
  export interface Changed<T> { value: T; changedIn: number | null }  // changedIn: 현재 값으로 바뀐 세대, 선택값==현재면 null
  export function genNumber(resource: { name: string }): number        // "generation-vi" → 6
  export function clampGen(gen: number | null, debut: number): number | null  // 범위 밖·debut 미만·LATEST_GEN → null(현재)
  export function typesAt(d: PokemonDetail, gen: number): Changed<string[]>
  export function abilitiesAt(d: PokemonDetail, gen: number): Changed<{ name: string; hidden: boolean }[]> | null // gen<=2 → null
  export function statsAt(d: PokemonDetail, gen: number): { key: GenStatKey; value: number; changedIn: number | null }[]
  export function spriteAt(sprites: PokemonSprites, gen: number): string | null
  export function cryAt(cries: PokemonDetail["cries"], gen: number): { primary: string | null; legacy: string | null; latest: string | null }
  ```

규칙 (스펙 그대로):
- `past_*` 항목의 `generation: N` = "N세대까지 이 값". 선택 세대 G에는 `N >= G`인 항목 중 N이 가장 작은 것, 없으면 현재 값. `changedIn` = 적용한 항목의 N + 1 (값이 현재와 같으면 null).
- `past_stats`/`past_abilities`는 바뀐 항목(능력치 이름·슬롯)만 담으므로 항목별로 적용.
- `past_abilities`의 `ability: null` = 그 슬롯 없음(결과에서 제외). G 3–4는 `hidden` 특성 제외(데이터에 없어도).
- G=1: `special-attack`/`special-defense` 대신 `special` 하나(값은 `past_stats`의 `special`, 없으면 `special-attack` 값). 순서 hp, attack, defense, special, speed.
- `spriteAt`: `versions["generation-" + 로마숫자소문자]`에서 `icons` 키를 제외한 첫 게임의 `front_default`, 없으면 null.
- `cryAt`: G<=5면 `primary = legacy ?? latest`, 아니면 `latest ?? legacy`.

- [ ] **Step 1:** `npm install -D vitest`, `package.json`에 `"test": "vitest run"` 추가.
- [ ] **Step 2: 실패하는 테스트 작성** (`src/lib/generation.test.ts`, fixture = clefairy):
  ```ts
  test("genNumber", () => expect(genNumber({ name: "generation-vi" })).toBe(6))
  test("typesAt gen5 is normal, changed in 6", () => expect(typesAt(f, 5)).toEqual({ value: ["normal"], changedIn: 6 }))
  test("typesAt gen6 is fairy, unchanged", () => expect(typesAt(f, 6)).toEqual({ value: ["fairy"], changedIn: null }))
  test("abilitiesAt gen2 is null", () => expect(abilitiesAt(f, 2)).toBeNull())
  test("abilitiesAt gen3 has no hidden and no slot 2", ...)   // value.every(a => !a.hidden), 길이 1, name "cute-charm"
  test("abilitiesAt gen9 matches current", ...)               // changedIn null, hidden "friend-guard" 포함
  test("statsAt gen1 uses special", ...)                      // keys == ["hp","attack","defense","special","speed"], special 60
  test("statsAt gen5 spAtk 60 changed in 6", ...)             // 픽시 5세대 특공 60 → 6세대 70 (fixture 값으로 확인 후 고정)
  test("spriteAt skips icons", ...)                           // gen5 → black-white URL
  test("spriteAt empty versions → null", () => expect(spriteAt({ front_default: null, versions: {} }, 3)).toBeNull())
  test("cryAt legacy first up to gen5", ...)                  // gen5 primary == legacy, gen6 primary == latest
  test("cryAt legacy null → latest", ...)                     // { latest: "x", legacy: null }, gen 1 → primary "x", legacy null
  test("clampGen", () => { expect(clampGen(3, 9)).toBeNull(); expect(clampGen(9, 1)).toBeNull(); expect(clampGen(12, 1)).toBeNull(); expect(clampGen(5, 1)).toBe(5) })
  ```
- [ ] **Step 3:** `npm test` → FAIL (모듈 없음).
- [ ] **Step 4:** `src/hooks/usePokemon.ts` 타입 추가, `src/lib/generation.ts` 구현.
- [ ] **Step 5:** `npm test` → 전부 PASS. `npx tsc -b` 오류 없음.
- [ ] **Step 6:** 커밋 `feat: generation lookup helpers for past types, abilities, stats, sprites, cries`.

### Task 2: GenerationBar 컴포넌트 + 문구

**Files:**
- Create: `src/components/pokedex/GenerationBar.tsx`
- Modify: `src/i18n/messages/pokedex.ts` (ko/en/ja)

**Interfaces:**
- Consumes: `LATEST_GEN`, `cryAt` 결과 타입 (Task 1)
- Produces:
  ```ts
  export function GenerationBar(props: {
    debut: number; gen: number | null; onChange: (gen: number | null) => void
    cry: { primary: string | null; legacy: string | null; latest: string | null }
    lang: Lang; t: TFunction<PokedexKey>
  }): JSX.Element
  ```
- 문구 키: `genBarLabel`(세대 선택 / Generation / 世代), `genCurrent`(현재 / Current / 現在), `cryPlay`(울음소리 / Cry / 鳴き声), `cryLegacy`(옛날 / Classic / 旧), `cryLatest`(최신 / Latest / 最新), `changedInGen`(`{gen}세대에 변경` / `Changed in Gen {gen}` / `第{gen}世代で変更`), `noAbilitiesBeforeGen3`(특성은 3세대부터 / Abilities were introduced in Gen III / 特性は第3世代から), `matchupCurrentNote`(현재 상성표 기준 / Based on the current type chart / 現在のタイプ相性基準), `specialStat`(특수 / Special / とくしゅ).

- [ ] **Step 1:** `npx astryx component SegmentedControl` 와 `npx astryx component Button`으로 props 확인.
- [ ] **Step 2:** 문구 추가 후 `npx tsc -b` 통과 확인.
- [ ] **Step 3:** 구현: SegmentedControl 항목 = 로마숫자 `debut..LATEST_GEN-1` + 마지막 "현재"(값 null 대응). 울음소리는 Button(아이콘+라벨), 클릭 시 `new Audio(url).play()`; `legacy`가 있고 `latest`와 다를 때만 옛날/최신 두 버튼, 아니면 하나. 좁은 화면에서 줄바꿈(HStack `wrap="wrap"`).
- [ ] **Step 4:** `npx tsc -b && npm run lint` 통과.
- [ ] **Step 5:** 커밋 `feat: generation bar with cry playback`.

### Task 3: 상세 화면 연결

**Files:**
- Modify: `src/pages/pokedex/PokemonDetailPage.tsx`
- Modify: `src/components/ui/shared.tsx` (능력치 막대에서 `special` 키 라벨이 필요하면)

**Interfaces:**
- Consumes: Task 1 전부, Task 2 `GenerationBar`

- [ ] **Step 1:** `gen = clampGen(Number(searchParams.get("gen")) || null, debut)`. `debut`은 기존 `generation` 값. 세대 변경 시 `?tab`을 지우지 않고 `gen`만 설정/삭제(`replace: true`). 방향키 이동 링크에도 현재 `gen` 유지.
- [ ] **Step 2:** 표본 카드 위(또는 카드 안 상단)에 `GenerationBar` 배치.
- [ ] **Step 3:** `gen != null && detail`일 때: 아트워크 대신 `spriteAt` 도트(없으면 아트워크), 타입은 `typesAt`, 개요 탭의 특성은 `abilitiesAt`(null이면 `noAbilitiesBeforeGen3`), 능력치는 `statsAt`. `changedIn`이 있는 항목 옆에 `Token size="sm"`로 `changedInGen`. 그 외(`gen==null` 또는 detail 없음)는 기존 코드 경로 그대로.
- [ ] **Step 4:** `gen != null`이면 상성 패널 제목 옆에 `matchupCurrentNote` 표시. 상성 계산은 그대로.
- [ ] **Step 5:** `npm run build && npm run lint && npm test` 통과.
- [ ] **Step 6:** 브라우저 확인 (dev 서버 `http://localhost:5173/portfolio/pokestra/`):
  `/pokemon/35?gen=5`(노말, 변경 표시), `/pokemon/35?gen=1`(특수 한 칸, 특성 안내), `/pokemon/1006?gen=3`(현재로 취급), `/pokemon/10034`(메가, 폴백), 모바일 폭 390px 줄바꿈, 울음소리 재생 요청 발생. 스크린샷 확인.
- [ ] **Step 7:** `npx astryx doctor --built dist` 통과.
- [ ] **Step 8:** 커밋 `feat: generation timeline on pokemon detail page`, README(ko/en) 기능 표의 `/pokemon/:id` 설명에 세대 타임라인 한 줄 추가해 같이 커밋. 푸시.
