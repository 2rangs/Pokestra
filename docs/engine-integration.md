# pokebattle-engine 연동 목록

엔진(`github:2rangs/pokebattle-engine#main`)이 업데이트될 때 Pokestra 쪽에서 확인할 것들.

## 현재 고정된 버전
- `package-lock.json` → `b298b5ffe1a62d2215701b8487f235d75b51f56b` (2026-11-18 업데이트)
- 엔진 의존성: `@pkmn/sim ^0.11.0`, `@pkmn/randoms ^0.11.0`, `@smogon/calc ^0.12.0`
- 최신 엔진 받기: `npm install @kyasi/pokebattle-engine@github:2rangs/pokebattle-engine#main`

## Pokestra가 쓰는 엔진 API (이름이 바뀌면 깨지는 곳)

| API | 쓰는 파일 |
|---|---|
| `BattleEngine`, `createAI`, `Action`, `BattleAI`, `BattleConfig`, `BattleEvent`, `Side`, `PlayerID` | `pages/battle/useBattleSession.ts`, `BattlePage.tsx`, `BattleView.tsx` |
| `BattleRequest`, `MoveOption`, `fixParticles` | `pages/battle/BattleView.tsx` |
| `formatEvent`, `FormatContext`, `*_NAME_KO`, `SIDE_CONDITION_KO`, `FIELD_CONDITION_KO`, `VOLATILE_NAME_KO` | `lib/battleLog.ts` |
| `calculateDamage`, `toCalcPokemon`, `applyStage`, `CalcPokemonInput`, `DamageResult`, `MoveData`, `Stats`, `Weather`, `Terrain` | `components/calc/calcState.ts`, `FieldPanel.tsx`, `MoveResults.tsx` |
| `getSpecies`, `getMove`, `koName`, `preloadData`, `NameResolver` | `lib/battle.ts`, calc, `TeamBuilder.tsx`, `BattleStatsPanel.tsx` |
| `generateRandomTeam`, `generateRandomSet`, `PRNG` | `lib/battle.ts`, `calcState.ts`, `TeamBuilder.tsx` |
| `parseShowdownTeam`, `exportShowdownTeam`, `toId`, `PokemonSet` | `TeamBuilder.tsx`, `stores/battleStore.ts`, `lib/battle.ts` |
| `calcBaseStat`, `calcHP`, `Nature`, `PrimaryStatus`, `BattlePokemon` | `BattleStatsPanel.tsx`, `calc/SidePanel.tsx`, `calcState.ts` |

## 엔진 업데이트 후 확인 순서
1. `npm install` (엔진 `prepare`가 `dist/` 빌드) → `git diff package-lock.json`으로 커밋 해시 확인
2. `npm run build && npm run lint && npm test`
3. 브라우저: `/battle` 랜덤 팀 CPU 대전 한 판, Showdown 가져오기/내보내기, `/calc?atk=garchomp&def=gholdengo` 16가지 난수·확정 타수, 테라스탈
4. 세 언어 배틀 로그 문구(`*_NAME_KO` 등 이름 변경 여부)

## 알려진 문제 (엔진 쪽에서 고치면 좋은 것)
- **번들 크기**: 빌드 시 500 kB 넘는 청크 경고. 배틀/계산기 페이지를 동적 import로 나누거나, 엔진이 `@pkmn/sim` 없이 쓸 수 있는 가벼운 진입점(데이터·계산 전용)을 내주면 개선 가능.
- **direct eval 경고**: `@pkmn/sim/build/esm/sim/battle-stream.mjs:162`의 `eval` — 엔진이 battle-stream을 쓰지 않으면 import 경로에서 빼는 것으로 회피 가능.
- **`npm audit` high 13건**: 전부 picomatch(vite/tinyglobby/jscodeshift 경유, 개발 도구 전용). 엔진과 무관.

## 앞으로 필요할 수 있는 엔진 기능 (나무열매·도구 페이지)
- 아이템 배틀 효과 데이터: `getItem(slug)` → 효과 설명, 던지기 위력, 자연의은혜 타입/위력, 메가스톤·Z크리스탈 대상 등. 현재 엔진은 `itemSlug`, `itemToShowdown`만 공개.
- 아이템 목록 `listItems()` (세대별 존재 여부 포함).
- 아이템 이름/효과의 한국어·일본어 문구(현재 Pokestra는 PokeAPI에서 이름만 가져옴).
