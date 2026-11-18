# pokebattle-engine 연동 목록

엔진(`github:2rangs/pokebattle-engine#main`)이 업데이트될 때 Pokestra 쪽에서 확인할 것들.

## 현재 고정된 버전
- `package-lock.json` → `59da4fc871d3a31d7b8055c432dc926e82d774e4` (2026-11-18, 엔진 PR #5 머지: `createFormatter`·`loadNames`·남은 HP 로그·번들 축소)
- 엔진 의존성: `@pkmn/sim ^0.11.0`, `@pkmn/randoms ^0.11.0`, `@smogon/calc ^0.12.0`
- 최신 엔진 받기: `npm install @kyasi/pokebattle-engine@github:2rangs/pokebattle-engine#main`

## Pokestra가 쓰는 엔진 API (이름이 바뀌면 깨지는 곳)

| API | 쓰는 파일 |
|---|---|
| `BattleEngine`, `createAI`, `Action`, `BattleAI`, `BattleConfig`, `BattleEvent`, `Side`, `PlayerID` | `pages/battle/useBattleSession.ts`, `BattlePage.tsx`, `BattleView.tsx` |
| `BattleRequest`, `MoveOption`, `fixParticles` | `pages/battle/BattleView.tsx` |
| `createFormatter`, `Formatter`, `FormatContext`, `CONDITION_ENTITY`, `SHOWN_VOLATILES` | `lib/battleLog.ts` (로그 문장·상태/날씨/장판 이름, ko/en/ja) |
| `loadNames('ja')` | `lib/battle.ts` (`useEngineReady`) |
| `calculateDamage`, `toCalcPokemon`, `applyStage`, `CalcPokemonInput`, `DamageResult`, `MoveData`, `Stats`, `Weather`, `Terrain` | `components/calc/calcState.ts`, `FieldPanel.tsx`, `MoveResults.tsx` |
| `getSpecies`, `getMove`, `koName`, `preloadData`, `NameResolver` | `lib/battle.ts`, calc, `TeamBuilder.tsx`, `BattleStatsPanel.tsx` |
| `generateRandomTeam`, `generateRandomSet`, `PRNG` | `lib/battle.ts`, `calcState.ts`, `TeamBuilder.tsx` |
| `parseShowdownTeam`, `exportShowdownTeam`, `toId`, `PokemonSet` | `TeamBuilder.tsx`, `stores/battleStore.ts`, `lib/battle.ts` |
| `calcBaseStat`, `calcHP`, `Nature`, `PrimaryStatus`, `BattlePokemon` | `BattleStatsPanel.tsx`, `calc/SidePanel.tsx`, `calcState.ts` |

## 엔진 업데이트 후 확인 순서
1. `npm install` (엔진 `prepare`가 `dist/` 빌드) → `git diff package-lock.json`으로 커밋 해시 확인
2. `npm run build && npm run lint && npm test`
3. 브라우저: `/battle` 랜덤 팀 CPU 대전 한 판, Showdown 가져오기/내보내기, `/calc?atk=garchomp&def=gholdengo` 16가지 난수·확정 타수, 테라스탈
4. 세 언어 배틀 로그 문구 (`npm test` → `lib/battleLog.test.ts`가 남은 HP·닉네임·진영 이름을 확인)

## 알려진 문제 (엔진 쪽에서 고치면 좋은 것)
- **번들 크기**: 엔진 PR #5로 배틀 청크 3.38 MB(gzip 753 kB). 여전히 500 kB 경고는 남음(배틀 페이지는 이미 지연 로드).
- ~~direct eval 경고~~: PR #5에서 해결(빌드 경고 없음).
- **`npm audit` high 13건**: 전부 picomatch(vite/tinyglobby/jscodeshift 경유, 개발 도구 전용). 엔진과 무관.

## 앞으로 필요할 수 있는 엔진 기능 (나무열매·도구 페이지)
- 아이템 배틀 효과 데이터: `getItem(slug)` → 효과 설명, 던지기 위력, 자연의은혜 타입/위력, 메가스톤·Z크리스탈 대상 등. 현재 엔진은 `itemSlug`, `itemToShowdown`만 공개.
- 아이템 목록 `listItems()` (세대별 존재 여부 포함).
- 아이템 이름/효과의 한국어·일본어 문구(현재 Pokestra는 PokeAPI에서 이름만 가져옴).
