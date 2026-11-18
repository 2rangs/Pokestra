# 배틀 시뮬레이터 5단계 — 더블배틀 (계획)

설계: `specs/2026-11-18-battle-sim-upgrade-design.md` 5단계. 트리플·로테이션은 비목표. 2–4단계 화면 구조 위에 얹는다.
규칙: `AGENTS.md`. 범위: `src/pages/battle/**`, `src/lib/battle*.ts`, 새 `src/lib/doublesAI.ts`(+테스트), `src/lib/replay.ts`, `src/lib/battleAnalysis.ts`, `src/i18n/messages/battle.ts`, `src/stores/battleStore.ts`.

## 사전 확인 (오케스트레이터가 확인함) — 엔진 API의 더블 지원 범위
- `new BattleEngine({ format: 'doubles', ... })` 동작. 상태 `sides.pX.active`가 2칸.
- `getRequest(player)`는 싱글/로테이션 전용(더블에서는 첫 칸만 돌려줌). 더블은 **`getRawRequest(player)`(Showdown 원본 요청: `active[i].moves[j].target`, `side.pokemon`, `forceSwitch: boolean[]`, `wait`) + `submitChoice(player, 'move 1 2, move 2 -1 terastallize')`**를 써야 한다. 대상 번호: 상대 1·2, 아군 -1·-2, 대상 없는 기술은 번호 생략. 교체 `switch N`(N = side.pokemon 순서 1부터), 할 게 없으면 `pass`.
- **엔진 AI(`createAI`)는 더블 대상을 고르지 못한다**: `chooseAction`이 대상 없는 단일 행동을 내고 `submitAction`이 "needs a target"으로 실패함(시드 5, heuristic/strong 둘 다). → Pokestra에 더블 전용 AI를 둔다(판단 Ruling, 엔진 수정은 비목표이므로 엔진 요청 목록에 "더블 대상 선택 AI"를 적는다).
- `previewDamage`도 싱글 전용 → 더블 기술 버튼의 예상 데미지는 `calculateDamage`(엔진 공개 API)로 대상별 계산.

## 태스크

### T1. 더블 요청 모델 + AI (`src/lib/doublesAI.ts` + 테스트)
- `doublesOptions(engine, player)`: 원본 요청을 화면/AI가 쓰기 쉬운 형태로 — 칸별 `{ slot, pokemon, moves: { index, move, pp, disabled, targets: TargetSpec[] }[], canTera, forceSwitch, switches }`. `TargetSpec`: 원본 `target` 값(normal/any/adjacentFoe/adjacentAlly/adjacentAllyOrSelf/allAdjacentFoes/allAdjacent/self/…)을 고를 수 있는 대상 목록(번호 + 포켓몬 id)으로. 고를 필요 없는 기술(전체기·자신)은 빈 목록.
- `buildChoice(slotChoices)` → Showdown 선택 문자열. 같은 포켓몬 두 칸 교체 금지, 테라는 한 칸만.
- `chooseDoubles(engine, player, difficulty, rng)`: easy = 합법 무작위, normal/hard = 휴리스틱(대상별 `calculateDamage` 기대 % + KO 가능 보너스, 전체기는 0.75배, 아군 맞추는 전체기 감점, 방어 연속 금지, hard는 무작위성 낮게·테라 활용). 쓰러진 칸 교체는 남은 HP 많은 순.
- 결정성: AI는 시드 받은 `PRNG`만 사용.
- 테스트: 시드 3개로 AI끼리 더블 끝까지(무한루프 없음, 승자 있음), 모든 선택 문자열이 엔진에 받아들여짐.

### T2. 세션·리플레이·분석의 더블 대응
- `useBattleSession`: format 이 doubles 면 `getRawRequest`/`submitChoice`, 기록은 `{ type: 'raw', player, choice }`. 프레임 `SideView.active`를 배열로(싱글은 길이 1) — 2단계 HUD가 `active[0]`을 쓰던 곳을 정리.
- `replay.ts`: format 'doubles' 저장·재생(raw 튜플 이미 있음). `simulateReplay`가 raw 를 `submitChoice`로.
- `battleAnalysis.ts`: 더블에서 `move_use.target_id`·스프레드 기술(한 기술이 두 마리) 귀속 확인, 테스트 추가.

### T3. 더블 화면
- 설정에 `형식: 싱글 | 더블` (battleStore `format`, persist). 더블은 마릿수 3 이상만(1 vs 1 선택 시 비활성 + 설명).
- 배치: 상대 두 HUD(위, 오른쪽 정렬, 가로로 나란히), 우리 두 HUD(아래). 휴대폰은 HUD 컴팩트 2×2 그리드.
- 행동 패널: 칸 하나씩 차례로 고른다 — "1/2: A는 무엇을 할까?" → 기술 → (필요하면) **대상 선택**: 대상 후보 버튼(상대 2·아군 1, HUD 위치와 같은 배치, 각 버튼에 그 대상 기준 상성·예상 데미지) → 다음 칸 → 두 칸 다 고르면 제출. "이전 칸으로" 버튼으로 되돌리기. 전체기는 대상 단계 건너뜀(“상대 전체”라고 표시).
- 교체 요청(쓰러짐)도 칸별.
- 관전(CPU vs CPU) 더블 지원.

### T4. 검증
- build/lint/test/doctor. Playwright: 더블 대전 3턴(대상 선택 포함) + 관전 한 판 끝까지 + 리플레이 링크로 같은 결과. 1280·390 스크린샷: 대상 선택 화면 포함. 390px 첫 화면에서 기술 버튼이 보이는지.
