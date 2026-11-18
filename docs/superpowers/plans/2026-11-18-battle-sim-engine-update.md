# 배틀 시뮬레이터 1단계 — 엔진 업데이트 반영 (계획)

설계: `docs/superpowers/specs/2026-11-18-battle-sim-upgrade-design.md` 1단계.

## 목표
엔진 PR #5(머지 커밋 `59da4fc`)를 받아 자체 로그 포매터(`src/lib/battleLog.ts`, 664줄)를 엔진 `createFormatter`로 교체한다. 화면·기능은 그대로.

## 태스크
1. **엔진 버전 올림** — `npm install github:2rangs/pokebattle-engine#main` → lock 해시 `59da4fc…` 확인.
2. **로그 포매터 교체** (`src/lib/battleLog.ts`)
   - en/ja 자체 포매터(`formatEn`/`formatJa`, 이름 표 L3) 삭제 → 언어별 `createFormatter({ locale, names, getPokemon, sideName })` 캐시.
   - 이름은 Pokestra 이름표 우선(`namesFor(lang)` + `speciesName`) — 폼 이름·한국어 표기가 도감과 같게.
   - 자동 닉네임은 계속 종 이름으로 바꿔 넘긴다(언어 전환 시 따라감).
   - 프레임마다 포매터를 새로 만들지 않도록, 포매터의 `getPokemon`/`sideName`이 "지금 포맷 중인 컨텍스트"를 읽게 한다(포매터는 동기).
   - 칩·툴팁 이름(`statusName`, `weatherName`, `sideConditionName`, `volatileName` …)도 포매터 `name.term`/`name.effect`로. en 상태 약어(BRN 등)만 남긴다.
   - `useEngineReady`에서 `loadNames('ja')`도 함께 기다린다.
3. **테스트** — `src/lib/battleLog.test.ts`: 3개 국어 문장·남은 HP, null 일관성, 자동/직접 닉네임, 관전 진영 이름, 칩 이름.
4. **검증** — 구/신 포매터 비교(5판 × 3언어), build/lint/test, 브라우저 3개 국어 한 판, `/calc?atk=garchomp&def=gholdengo`, `docs/engine-integration.md` 갱신.
