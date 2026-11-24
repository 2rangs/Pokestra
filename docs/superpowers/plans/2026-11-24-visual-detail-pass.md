# 비주얼 디테일 고도화 (2)+(3) — 사용처 교체·화면별 디테일 패스

설계: `docs/superpowers/specs/2026-11-18-visual-detail-design.md` 의 (2)·(3). 기반(1)은 main 에 있다.
현재 main: 밀도 트랙 머지 완료, 배틀/계산기 제거(도감 전용). 상세 화면은 밀도 트랙이 이미 타입 색 머리말·
막대(타입 색, 0–200 고정 눈금)·`TypeChip`/`MultiplierChip` 을 적용했으므로 그 결정은 유지한다.

기준선: doctor purity 284건(홈 37). 결과는 이 수치보다 늘지 않아야 한다.
스크린샷: `node scripts/preview/shoot-pages.mjs <폴더> [desktop|mobile|all] [필터]` (포트 5192).

## 작업
1. **타입 표시 통일** — 남은 `TypeTag`/`TypeIconDot`/`typeColor` 사용처(PokemonCard, PokedexTable, MovesPanel,
   DexUi.TypeBadge, ItemDetailPage, HomePage, 필터의 타입 점)를 `TypeChip`/`TypeGlyph` 로. 안 쓰이게 된 옛 API 삭제.
2. **포켓몬 카드** — 이미지 칸에 주 타입의 옅은 면(`subtle`), 타입 배지 `TypeChip sm`. hover/focus 는 ClickableCard 기본.
3. **기술 분류** — 물리/특수/변화를 글자 대신 Token(의미 색 + 아이콘)으로: `DamageClassChip`.
4. **홈** — 오늘의 포켓몬을 토큰 기반 타입 면으로(인라인 `color-mix` 제거), raw div/span 을 Astryx 레이아웃으로,
   능력치 막대 공용화, 첫 화면 빈 공간 줄이기.
5. **도구 상세·공용 StatBar** — 라벨 흐리게/값 진하게, StatBar 인라인 style 제거.
6. **검증** — vitest, build, eslint, doctor(purity 기준선 이하), 전/후 스크린샷(1280/390) 직접 확인.
7. **기록** — `docs/superpowers/visual-detail-progress.md`, 푸시.
