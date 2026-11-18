# 이미지 로딩 최적화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 포켓몬 이미지를 공통 `PokeImage`로 통일해 스켈레톤·고정 크기·크기별 소스·폴백·미리 받기를 적용한다.

**Architecture:** `src/lib/images.ts`(URL 후보 선택, 미리 받기) + `src/components/ui/PokeImage.tsx`(렌더링). 기존 호출부를 교체.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Astryx 0.7.16 (`Skeleton`), Tailwind v4 토큰 유틸리티.

**Spec:** `docs/superpowers/specs/2026-11-18-image-loading-design.md`

## Global Constraints
- AGENTS.md: 새 코드에 `<div>`/`style={{}}`/raw hex·px 금지. 레이아웃은 Astryx 컴포넌트, 스타일은 토큰 유틸리티. (기존 코드의 위반을 이번에 고칠 필요는 없음, 손댄 줄은 지킬 것)
- `package.json` 의존성 추가 금지 (병행 트랙과 충돌 방지).
- 표시 크기 ≤ 64px → 도트 우선, > 64px → 공식 일러스트 우선. 둘 다 서로를 폴백으로.
- 감속 모션(`prefers-reduced-motion`)이면 페이드 없음.
- 커밋 메시지 끝에 저장소 규칙의 Co-Authored-By / Claude-Session 줄.

## Review Focus
- 캐시에 이미 있는 이미지(`img.complete`)는 스켈레톤이 깜빡이지 않고 바로 보여야 함 → 마운트 시 complete 확인.
- `src`가 바뀌는 재사용(배틀 교체, 이전/다음 이동) → 상태 초기화(`key` 또는 src 변화 감지).
- 후보 URL이 모두 null/빈 문자열 → 빈 자리, 네트워크 요청 없음.
- 배틀 화면 기절 애니메이션(`translate-y-4 opacity-0`)과 페이드인이 충돌하지 않아야 함.
- 좁은 화면에서 반응형 크기(Tailwind `sm:` 크기 클래스)를 쓰던 자리가 고정 px로 굳지 않아야 함 → `className`으로 크기 클래스를 받는 경로 유지.

---

### Task 1: `images.ts` + `PokeImage`

**Files:**
- Create: `src/lib/images.ts`
- Create: `src/components/ui/PokeImage.tsx`

**Interfaces (Produces):**
```ts
// src/lib/images.ts
export const SPRITE_MAX_PX = 64
export function pokemonImageCandidates(id: number, displayPx: number, opts?: { sprite?: string | null; back?: boolean }): string[]
//  ≤64: [sprite ?? spriteUrl, artwork], >64: [artwork, sprite ?? spriteUrl]; back=true면 맨 앞에 뒷모습 도트. 빈 값 제거·중복 제거.
export function preloadImages(urls: string[]): void   // requestIdleCallback(없으면 setTimeout) 안에서 new Image().src
// src/components/ui/PokeImage.tsx
export function PokeImage(props: {
  sources: (string | null | undefined)[]   // 시도 순서
  alt: string
  size: number                              // width/height 속성 & 스켈레톤 크기
  className?: string                        // 반응형 크기 클래스 등(있으면 size 대신 박스 크기를 정함)
  pixelated?: boolean | "auto"              // auto: 현재 URL이 /sprites/pokemon/ 아래 도트(official-artwork·home 아님)면 true
  priority?: boolean
}): JSX.Element
```
기존 URL 헬퍼(`officialArtworkUrl` in `src/lib/dex.ts`, `artworkUrl`/`spriteUrl`/`backSpriteUrl` 정의 위치)를 재사용하고 새로 만들지 말 것.

- [ ] **Step 1:** `npx astryx component Skeleton` 으로 props 확인.
- [ ] **Step 2:** `images.ts` 구현.
- [ ] **Step 3:** `PokeImage` 구현: 고정 박스 안에 Skeleton(로드 전) + img(로드 후 opacity 전환, `motion-reduce:transition-none`). onError → 다음 후보, 다 실패 → `bg-muted` 빈 박스. ref로 `complete && naturalWidth>0`이면 바로 로드 상태. sources 내용이 바뀌면 상태 초기화.
- [ ] **Step 4:** `npx tsc -b && npm run lint` 통과.
- [ ] **Step 5:** 커밋 `feat: PokeImage with skeleton, fallbacks and size-aware sources`.

### Task 2: 호출부 교체

**Files (Modify):** `src/components/PokemonCard.tsx`, `src/components/dex/DexUi.tsx`, `src/components/calc/PokemonPicker.tsx`, `src/components/calc/SidePanel.tsx`, `src/components/battle/PokemonSearch.tsx`, `src/components/pokedex/SpritesGallery.tsx`, `src/components/pokedex/EvolutionChain.tsx`, `src/pages/SpritesPage.tsx`, `src/pages/HomePage.tsx` (Sprite, 오늘의 포켓몬, 대결 미리보기, 검색 아이콘), `src/pages/battle/BattlePage.tsx`, `src/pages/battle/BattleView.tsx`, `src/pages/battle/TeamBuilder.tsx`, `src/pages/pokedex/PokemonDetailPage.tsx`(폼 목록 작은 도트만; 메인 Artwork는 Task 3)

**Interfaces:** Consumes Task 1 전부.

- [ ] **Step 1:** 각 자리를 `PokeImage`로. 포켓몬 id로 그리는 곳은 `pokemonImageCandidates(id, 표시px, …)`. 고정 URL(갤러리 특정 게임 도트 등)은 `sources=[url]`. 표시 px = 기존 클래스의 최대 크기(예 `h-7`→28, `sm:h-28`→112).
- [ ] **Step 2:** 이미 위쪽에 보이는 대표 이미지(홈 오늘의 포켓몬)는 `priority`.
- [ ] **Step 3:** BattleView: 기절 클래스/전환은 `className`으로 유지, 후보는 기존 순서(뒷모습→도트→일러스트) 그대로.
- [ ] **Step 4:** `grep -rn "<img" src --include=*.tsx` 결과가 `PokeImage.tsx`와 `TypeIconDot`(shared.tsx)만.
- [ ] **Step 5:** `npm run build && npm run lint` 통과.
- [ ] **Step 6:** 커밋 `refactor: use PokeImage across pages`.

### Task 3: 상세 화면 아트워크 + 미리 받기 + 브라우저 확인

**Files (Modify):** `src/pages/pokedex/PokemonDetailPage.tsx`

- [ ] **Step 1:** `Artwork` 컴포넌트를 `PokeImage`(`priority`, sources `[artwork, spriteFallback]`, 크기 기존 `h-56 w-56 sm:h-64 sm:w-64`, size 256)로 교체하고 `Artwork` 삭제.
- [ ] **Step 2:** `prev`/`next`가 바뀔 때 `preloadImages([officialArtworkUrl(prev.id), officialArtworkUrl(next.id)])`.
- [ ] **Step 3:** `npm run build && npm run lint` 통과, `npx astryx doctor --built dist` 통과.
- [ ] **Step 4:** Playwright로 `npm run dev` 띄워 확인(네트워크 느리게 `route`로 지연 1s): `/`, `/pokedex`, `/pokemon/25`, `/calc`, `/battle`, `/sprites` — 로딩 중 스켈레톤 보임, 로드 후 이미지, 레이아웃 시프트 없음(CLS: `PerformanceObserver('layout-shift')` 합 < 0.1), 상세 화면에서 →키 이동 시 다음 아트워크가 캐시에서 바로 뜸. 390px 폭 확인. 스크린샷을 `docs/superpowers/` 밖 스크래치에 저장.
- [ ] **Step 5:** 커밋 `feat: prioritized detail artwork and neighbor preloading`.
