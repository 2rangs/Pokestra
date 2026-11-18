# 배틀 시뮬레이터 2단계 — 배틀 화면(HUD) 개편 (계획)

설계: `docs/superpowers/specs/2026-11-18-battle-sim-upgrade-design.md` 2단계 + `2026-11-18-dense-layout-design.md` "원칙".
규칙: 저장소 `AGENTS.md` — 새 코드에 `<div>`·`style={{}}`·raw hex/px·임의 값(`p-[13px]`) 금지, Astryx 컴포넌트 우선(`npx astryx component <Name>`로 props 확인), 토큰 기반 Tailwind 유틸리티만.
범위: `src/pages/battle/**`, `src/lib/battle*.ts`, `src/i18n/messages/battle.ts`, `src/components/battle/**`. 사이트 공용 파일(`components/ui/shared.tsx`, `layouts/*`, 다른 페이지)은 건드리지 않는다(다른 세션 작업 중).

## 화면 목표 (시선 순서)
1. 맨 위 한 줄: `N턴` + 필드 줄(날씨·필드·트릭룸·양 진영 벽/장판, **남은 턴**) + 속도/건너뛰기/나가기.
2. 대치 영역: 상대(위·오른쪽) / 우리(아래·왼쪽) HUD. HUD 한 장 = 이름·Lv·상태이상 | 타입(테라스탈이면 테라 타입 + "테라" 표시) | HP 막대 + HP 값(누르면 숫자↔% 전환) + 파티 점 | 랭크 칩(`공격 +2`, 툴팁 `×2.0`)·휘발성 칩.
3. 행동 영역: 기술 4개(2열 고정, 휴대폰도 2열) → 교체 목록.
4. 오른쪽(데스크톱)/아래(휴대폰) 로그.

휴대폰(390×844) 실패 기준: 배틀 시작 직후 첫 화면에서 기술 버튼 4개가 스크롤 없이 보이고 눌러져야 한다 → 휴대폰에서는 HUD를 컴팩트(스프라이트 작게, 한 HUD 높이 ≈ 88px 이하)로.

## 태스크

### T1. 프레임에 남은 턴 담기 + 순수 헬퍼 (`src/lib/battleHud.ts` + 테스트)
- `Frame`(useBattleSession.ts)에 `weatherTurns`, `terrainTurns: number | null`, `field: {id, turns}[]`, `SideView.conditions`에 `turns: number | null` 추가. 엔진 `Field.weather_turns/terrain_turns/conditions[*].turns_remaining`, `Side.conditions[*].turns_remaining` 사용. 0 이하·없음은 null(장판처럼 무기한).
- `battleHud.ts` 순수 함수(언어 인자 받음, React 없음):
  - `koLabel(r: {koChance, koHits}, lang)` → `확정 2타` / `난수 1타 (44%)` / en `Guaranteed 2HKO`·`44% chance to OHKO`(1타=OHKO, 2타=2HKO…) / ja `確定2発`·`乱数1発 (44%)`. koHits 0 또는 없음 → null.
  - `effectivenessLabel(eff, lang)` → 0: 효과 없음 / ≥2: 효과 굉장 (×2/×4) / <1: 효과 별로 (×0.5/×0.25) / 1: null. 라벨은 battle 메시지에 있는 문구 재사용 가능하면 재사용.
  - `stageMultiplier(stat, stage)` → 일반 능력치 (2+n)/2 또는 2/(2-n), 명중·회피 (3+n)/3 … 문자열 `×1.5`.
  - `fieldItems(frame)` → 표시 순서대로 `{ key, kind: 'weather'|'terrain'|'field'|'side', side?: PlayerID, id, turns, layers }[]`.
- vitest로 각각 검증(경계값: koHits 0, eff 0/0.25/4, stage ±6, 명중 ±1).

### T2. HUD 컴포넌트 분리 + 개편
- `BattleView.tsx`(528줄)를 `src/pages/battle/hud/` 아래로 나눈다: `Combatant.tsx`(HUD), `FieldBar.tsx`, `MovePanel.tsx`(ActionPanel/MoveButton/SwitchList), `BattleLog.tsx`. `BattleView`는 배치만. (3단계 리플레이가 같은 HUD를 프레임만 넘겨 재사용할 수 있게, HUD·필드·로그는 `session` 대신 `Frame`/`frames` props를 받는다.)
- HP 값 전환: HP 숫자를 누르면(버튼, 44px 터치 영역은 HUD 행 높이로 확보) `현재/최대` ↔ `%`. 우리 편 기본 숫자. 상대는 대전 모드에서 %만(정보 비공개 — 실제 게임과 같음), 관전 모드는 둘 다 전환 가능. 선택은 `battleStore`에 `hpAsPercent: boolean` 저장(persist, 버전 올리지 않아도 되는 선택 필드).
- 랭크 칩: `공격 +2` 형태, 툴팁/aria에 배수(`×2.0`) — 6번 원칙(한눈에 모르는 값엔 설명). 오르면 파랑, 내리면 빨강 유지.
- 테라스탈: 테라스탈 상태면 타입 자리에 테라 타입 배지 + "테라" 칩, 아직 안 했으면 HUD에 작게 `테라: 타입`(우리 편만, 상대는 공개 전 숨김).
- 필드 줄: `모래바람 3`, `리플렉터 (우리) 4`, `스텔스록 (상대)`, `압정뿌리기 ×2` — 남은 턴은 숫자 + 툴팁 "남은 턴". 항목이 없으면 줄 자체가 비지 않게 턴 제목만.
- 휴대폰 컴팩트: `sm` 미만에서 HUD 스프라이트 48px, 카드 패딩 축소, 두 HUD를 세로로 붙여 배치.

### T3. 기술 버튼·행동 패널
- 기술 버튼(2열 고정): 1줄 `기술 이름 | 타입 배지`, 2줄 `분류 위력 · PP 남음/최대`(PP 25% 이하면 경고색), 3줄 `상성 라벨 · 예상 데미지 %범위 · 확정 n타`. 상성 라벨 색: 굉장=강조(error 톤), 별로/없음=흐림.
- `previewDamage` 결과의 `koChance/koHits`로 T1 `koLabel` 사용. 테라 토글 시 다시 계산(기존 동작 유지).
- 버튼 aria-label에 같은 정보를 문장으로. 버튼 높이 ≥ 44px.
- 교체 목록은 그대로(필요하면 2열 유지, 휴대폰 1열).

### T4. 로그 — 턴별 접기·중요 사건 강조
- 로그를 턴 단위 묶음으로. 현재 턴과 직전 턴은 펼침, 그 이전 턴은 접힘(Astryx `Collapsible`). 접힌 묶음 머리에 턴 번호 + 그 턴의 중요 사건 요약 아이콘/칩(기절 수, 급소, 효과 굉장).
- 강조: 기절·급소·효과 굉장(진하게+error 톤), 테라스탈·배틀 종료(accent), 기술 사용(semibold). 효과 별로/없음은 흐리게.
- 새 줄이 생기면 맨 아래로 스크롤(기존 동작), 사용자가 위로 스크롤해 읽는 중이면 끌어내리지 않는다.
- `role="log"`·`aria-live` 유지.

### T5. 검증
- `npm run build && npm run lint && npm test`, `npx astryx doctor --built dist`.
- Playwright(`require('playwright')`, 설치 금지), `http://localhost:PORT/portfolio/pokestra/#/battle`, locale `ko-KR`. 1280px·390px 스크린샷: 대전 2–3턴 진행 후, 관전 모드. 390px 첫 화면에서 기술 버튼 4개가 뷰포트 안에 있는지 `boundingBox`로 확인.
