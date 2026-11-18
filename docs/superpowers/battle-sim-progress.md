# 배틀 시뮬레이터 고도화 — 진행 기록

브랜치 `claude/battle-sim-upgrade`. 설계: `specs/2026-11-18-battle-sim-upgrade-design.md`.

## 공통 판단 (Ruling)
- **superpowers 스킬 없음**: 이 세션에는 `superpowers:writing-plans`·`subagent-driven-development` 스킬이 설치돼 있지 않다. 같은 절차(단계별 계획 문서 → 태스크 구현 → 리뷰 서브에이전트)를 수동으로 따른다. 비용: 없음(문서 형식만 직접 정함).

## 1단계 — 엔진 업데이트 반영 ✅
계획: `plans/2026-11-18-battle-sim-engine-update.md`
- 엔진 lock `b298b5f` → `59da4fc`(PR #5 머지 커밋).
- `src/lib/battleLog.ts` 664줄 → 약 150줄. en/ja 자체 포매터와 이름 표를 지우고 엔진 `createFormatter`(언어별 캐시)로 교체. 이름은 Pokestra 이름표 우선(폼 이름·도감 표기 일치), 자동 닉네임은 종 이름으로 바꿔 언어 전환을 따라감. 칩 이름(상태·날씨·장판·휘발성)도 포매터 `name.term`/`name.effect` 사용.
- `useEngineReady`가 `loadNames('ja')`도 기다림.
- 검증
  - 구/신 포매터 비교(랜덤 5판 × 3언어): **ko는 문장이 완전히 같음**. en/ja 차이는 엔진 개선분뿐 — 데미지 문장에 남은 HP, `(Unboost)` → "Stats can't be lowered", 특성 이름 번역(Quark Drive → クォークチャージ).
  - `npm test` 28개 통과(새 `battleLog.test.ts` 6개), build·lint 통과, 빌드 eval 경고 사라짐, 배틀 청크 3.38 MB.
  - 브라우저: ko/en CPU 대전 끝까지, ja 3턴 로그 확인, 콘솔 오류 없음. `/calc?atk=garchomp&def=gholdengo` 확정/난수 타수 정상. 스크린샷 `docs/screenshots/battle/phase1-log-*.png`.
- 판단: en 상태 약어(BRN/PAR…)는 엔진 용어에 없어 Pokestra에 6개만 남김. 비용: 작은 표 하나 유지.

## 2단계 — 배틀 화면(HUD) 개편 ✅
계획: `plans/2026-11-18-battle-sim-hud.md`
- `BattleView.tsx`(528줄)를 `pages/battle/hud/`(Combatant·FieldBar·MovePanel·BattleLog·BattleScene·BattleSprite)로 분리. HUD·필드·로그는 `Frame` props만 받음(3단계 리플레이 재사용). 프레임 타입은 `lib/battleFrame.ts`.
- HUD: HP 숫자↔% 전환(저장), 상대는 대전 모드에서 %만. 랭크 칩(툴팁에 배수), 테라 타입 표시, 필드 줄에 남은 턴(장판은 무기한이라 숫자 없음).
- 기술 버튼(2열 고정): 분류·위력·PP(25% 이하 경고), 상성(효과 굉장 ×2 등), 예상 데미지 %, 확정/난수 n타.
- 로그: 턴별 접기(현재·직전 턴 펼침), 접힌 턴 머리에 기절·급소·효과 굉장 요약 칩, 위로 스크롤해 읽는 중이면 끌어내리지 않음.
- **사용자 피드백 반영 ("실제 배틀 에셋")**: PokeAPI가 호스팅하는 Showdown 애니메이션 배틀 스프라이트(상대 앞모습·우리 뒷모습, 모든 세대·폼), 게임식 배치(하늘→땅 그라데이션, 타원 발판, HUD 박스 오버레이), 날씨·필드 색조, 이벤트 애니메이션(기술 돌진·피격 흔들림/급소 강하게·기절 낙하·등장·회복·테라스탈, `motion-safe`만), 울음소리(기본 꺼짐, "소리" 토글).
- 리뷰 서브에이전트 지적 9건 반영(HP 399/400이 100%로 보이던 버그, 재대전 시 로그 접힘 상태 유지, 매 렌더 데미지 재계산, 새 `<div>`·임의 값, 44px 미만 버튼, en 복수형 등).
- 검증: 테스트 37개 통과, build·lint·`astryx doctor`(실패 0, 기존 폰트 경고 2) 통과. 390×844 대전 시작 직후 기술 버튼 4개 y=496–639(스크롤 없음). 스크린샷 `docs/screenshots/battle/phase2-{desktop,mobile,spectate}.png`.
- 판단과 비용
  - 배경 이미지는 PokeAPI에 없고 Showdown 서버 파일을 핫링크하지 않기로 → 테마 토큰으로 그린 배경·발판. 비용: 게임 배경 그림만큼 화려하지 않음.
  - `src/styles.css`(사이트 공용)에 키프레임·`pixelated` 유틸리티·`--radius-ellipse`를 **추가만** 함. 통합 시 확인 필요.
  - 사이트가 라이트 테마 고정이라 다크 스크린샷 없음(토큰만 써서 다크 값은 있음).
  - 아이콘 버튼도 44px 터치 영역 유지 → 툴바가 조금 투박함.

## 3단계 — 리플레이와 공유 ✅
계획: `plans/2026-11-18-battle-sim-replay.md`
- `lib/replay.ts`: `{v, seed, format('singles'|'doubles'), p1/p2: {team(Showdown 텍스트), ctrl}, actions}` → 행동은 짧은 튜플(move/switch/raw/team, 왕복이 안 되면 원래 객체 그대로) → deflate-raw → base64url. 손상·버전 불일치는 `ReplayError`.
- 세션이 사람·CPU의 **모든 행동을 기록**(재생 시 AI를 다시 돌리지 않음 → AI가 바뀌어도 링크 유지). 프레임 캡처를 `pages/battle/frames.ts`로 공용화, `simulateReplay`가 재현 실패를 `mismatch`로 보고.
- 결과 오버레이에 "리플레이 링크 복사"·"리플레이 보기"(토스트 피드백). `#/battle/replay?d=…` 화면: 실제 배틀과 같은 장면·HUD·로그 + 턴 슬라이더, 처음/이전/재생/다음/끝, ←/→/Space.
- 검증: 테스트 46개, build·lint·doctor(실패 0). E2E: 6:6 CPU 대전 → 링크 → 새 브라우저에서 끝으로 이동 → **승패·마지막 턴(19)·마지막 로그 4줄 동일**. 손상 링크는 오류 배너. 인코딩 1371자(URL 1430자). 390px에서 타임라인이 첫 화면(슬라이더 y≈531). 스크린샷 `phase3-replay-{desktop,mobile}.png`.
- 판단과 비용
  - 승자는 끝에서만 표시(스포일러 방지), 리플레이는 일시정지로 시작.
  - CPU 대전 리플레이는 원래 시점 유지(상대 HP %, 테라 타입 비공개) — 비용: 받은 사람도 상대 정확한 HP를 못 봄.
  - `src/App.tsx`에 지연 import + 라우트 한 줄 추가(통합 시 확인).

## 방향 전환 — 배틀 시뮬레이터 제거
- **사용자 결정**: 3단계(리플레이) 완료와 상태이상 표시 요청 이후, 배틀 기능을 Pokestra에서 빼고 데모는 엔진 저장소 playground로 옮기기로 함 — 2rangs/pokebattle-engine 의 `claude/battle-demo` 브랜치, `playground/` (`#/battle`). Pokestra는 도감·계산기 사이트로 남는다.
- **제거한 것**
  - `src/pages/battle/**`(BattlePage·BattleView·ReplayPage·TeamBuilder·useBattleSession·frames·replayLink·hud/*), `src/stores/battleStore.ts`
  - 배틀 전용 lib와 테스트: `lib/battleLog`·`battleFrame`·`battleHud`·`battleSummary`·`battleStatus`·`replay`
  - 배틀 화면에서만 쓰던 `components/battle/*`(TypeBadge·PokemonSearch)와 `i18n/messages/battle.ts` — grep 결과 계산기·도감은 쓰지 않음(계산기는 `calc/PokemonPicker`를 씀)
  - `src/styles.css`의 배틀 키프레임·`--animate-battle-*`·`pixelated` 유틸리티·`--radius-ellipse`(다른 사용처 없음)
  - 메뉴의 "배틀" 항목, 홈 도구 카드의 배틀 카드와 해당 i18n 키
  - `lib/battle.ts`의 배틀 전용 export(`buildRandomTeam`·`KO_NAMES`·`namesFor`·`dexIdOf`·스프라이트 재수출), `useEngineReady`의 `loadNames('ja')`(계산기는 도감 이름표를 씀), `lib/spriteUrls.ts`의 애니메이션 스프라이트·울음소리 URL
- **남긴 것**: 데미지 계산기(`/calc`), 도감 상세의 실능치 패널(`BattleStatsPanel`), `lib/battle.ts`(엔진 로드·이름·도구·성격·`buildSet`), 엔진 의존성(`@kyasi/pokebattle-engine`).
- **4–5단계(분석, 더블 배틀)는 Pokestra에서 더 이상 계획하지 않음.** 필요하면 엔진 playground 쪽에서 진행.
- 옛 링크: `#/battle`, `#/battle/replay?d=…`는 홈으로 리다이렉트(404 방지). 3단계 리플레이 링크는 Pokestra에서 더는 재생되지 않음.
- 위 1–3단계 기록과 `docs/screenshots/battle/*` 스크린샷은 작업 이력으로 남겨 둠.
