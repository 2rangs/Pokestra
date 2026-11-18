# 비주얼 디테일 고도화 (1) 기반 — 구현 계획

설계: `docs/superpowers/specs/2026-11-18-visual-detail-design.md` "진행"의 (1). 사용처 교체·화면별 디테일 패스는 범위 밖.

## 목표
타입 색 18종(+스텔라)을 테마 토큰으로, 새 `TypeChip`/`MultiplierChip`, 박스 아이콘 후보, 라이트/다크 미리보기.

## 작업
1. **조사** — `astryx docs theme`/`author-a-theme`, `editor how`, `editor set … --on token --when color:fire` 로 editor 가 임의 토큰·Token 신규 색을 받는지 확인.
   - 결과: editor 는 임의 이름 토큰을 모르고(`how` 무응답), Token 의 새 color 는 거부(`token has no color "fire"`).
   - Ruling R1: editor 로 `pokestra` 테마(neutral 기반)를 만들고, editor 가 "yours to edit"로 남기는 `themes/pokestra/pokestra.theme.ts` 에서 `localTokens` + Token custom variant 로 확장. `experimental theme compile` 로 빌드, `theme add`/`theme use` 로 연결.
2. **색 생성** — `scripts/type-colors.mjs`: 기존 TYPE_COLOR(아이콘 SVG 와 같은 색)에서 OKLCH 명도만 움직여 AA 를 맞춘다.
   역할 5개(bg/on/subtle/border/text) × [light, dark] → `themes/pokestra/typeColors.ts`, Tailwind 브리지 `src/type-colors.css`, 클래스 맵 `src/lib/typeColorClasses.ts`.
3. **대비 테스트** — `src/lib/typeColors.test.ts`: 빌드된 테마(`src/themes/pokestra/pokestra.js`)의 `light-dark()` 값을 직접 파싱해 검사.
4. **컴포넌트** — `src/components/ui/TypeChip.tsx`(TypeChip, MultiplierChip, TypeGlyph) + 순수 로직 `typeChipModel.ts`(테스트) + 메시지 `i18n/messages/typeChips.ts`.
5. **박스 아이콘** — `boxIconUrls(id)`, `pokemonImageCandidates` ≤40px 단계 + `images.test.ts`. 픽셀 렌더링은 PokeImage 의 auto 판정(`/sprites/pokemon/` 아래)으로 이미 적용.
6. **미리보기** — `scripts/preview/visual-foundation.{html,tsx}`(라우트 아님) + `shoot-visual-foundation.mjs`(Vite 개발 서버 5191 + Playwright) → `docs/screenshots/visual/`.
7. **검증** — vitest, tsc/build, eslint, `astryx doctor --built`, `editor show --png` 그림과 스크린샷 직접 확인.
8. **기록·푸시** — `docs/superpowers/visual-foundation-progress.md`, `claude/visual-foundation` 푸시.
