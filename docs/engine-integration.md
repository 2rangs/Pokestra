# pokebattle-engine 연동 목록

엔진(`github:2rangs/pokebattle-engine#main`)이 업데이트될 때 Pokestra 쪽에서 확인할 것들.

## 현재 고정된 버전
- `package-lock.json` → `59da4fc871d3a31d7b8055c432dc926e82d774e4` (2026-11-18, 엔진 PR #5 머지: `createFormatter`·`loadNames`·남은 HP 로그·번들 축소)
- 엔진 의존성: `@pkmn/sim ^0.11.0`, `@pkmn/randoms ^0.11.0`, `@smogon/calc ^0.12.0`
- 최신 엔진 받기: `npm install @kyasi/pokebattle-engine@github:2rangs/pokebattle-engine#main`

## Pokestra가 쓰는 엔진 API (이름이 바뀌면 깨지는 곳)

배틀 시뮬레이터(`pages/battle/**`, `battleLog`·`replay` 등)는 Pokestra에서 제거했다. 배틀 데모는 엔진 저장소 playground(`playground/`, `#/battle`)에 있다. 남은 사용처는 데미지 계산기와 도감 실능치뿐이다.

| API | 쓰는 파일 |
|---|---|
| `calculateDamage`, `toCalcPokemon`, `applyStage`, `CalcPokemonInput`, `DamageResult`, `MoveData`, `Stats`, `Weather`, `Terrain` | `components/calc/calcState.ts`, `FieldPanel.tsx`, `MoveResults.tsx` |
| `getSpecies`, `getMove`, `koName`, `preloadData` | `lib/battle.ts`, `components/calc/*`, `components/BattleStatsPanel.tsx` |
| `generateRandomSet`, `PRNG`, `PokemonSet` | `lib/battle.ts` (`buildSet`), `calcState.ts` |
| `calcBaseStat`, `calcHP`, `Nature`, `PrimaryStatus`, `BattlePokemon` | `BattleStatsPanel.tsx`, `calc/SidePanel.tsx`, `calcState.ts` |

## 엔진 업데이트 후 확인 순서
1. `npm install` (엔진 `prepare`가 `dist/` 빌드) → `git diff package-lock.json`으로 커밋 해시 확인
2. `npm run build && npm run lint && npm test`
3. 브라우저: `/calc?atk=garchomp&def=gholdengo` 16가지 난수·확정/난수 타수, 테라스탈·날씨 반영
4. 도감 상세(`/pokemon/445` 등)의 실능치 패널(Lv50/Lv100 최소·최대) 표시

## 알려진 문제 (엔진 쪽에서 고치면 좋은 것)
- **번들 크기**: 엔진 청크 약 3.27 MB(gzip 718 kB). 500 kB 경고는 남음(계산기·도감 상세에서만 지연 로드).
- ~~direct eval 경고~~: PR #5에서 해결(빌드 경고 없음).
- **`npm audit` high 13건**: 전부 picomatch(vite/tinyglobby/jscodeshift 경유, 개발 도구 전용). 엔진과 무관.

## 앞으로 필요할 수 있는 엔진 기능 (나무열매·도구 페이지)
- 아이템 배틀 효과 데이터: `getItem(slug)` → 효과 설명, 던지기 위력, 자연의은혜 타입/위력, 메가스톤·Z크리스탈 대상 등. 현재 엔진은 `itemSlug`, `itemToShowdown`만 공개.
- 아이템 목록 `listItems()` (세대별 존재 여부 포함).
- 아이템 이름/효과의 한국어·일본어 문구(현재 Pokestra는 PokeAPI에서 이름만 가져옴).
