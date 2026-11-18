# 배틀 시뮬레이터 3단계 — 리플레이와 공유 (계획)

설계: `specs/2026-11-18-battle-sim-upgrade-design.md` 3단계 + "구현 쪽 결정".
규칙: `AGENTS.md`(새 코드에 `<div>`/`style={{}}`/raw hex·px/임의 값 금지, Astryx 우선). 범위: `src/pages/battle/**`, `src/lib/battle*.ts`, 새 `src/lib/replay.ts`, `src/i18n/messages/battle.ts`, `src/stores/battleStore.ts`. 예외: `src/App.tsx`에 라우트 한 줄(보고서에 명시).

## 사전 확인 (오케스트레이터가 확인함)
- 같은 config(seed·팀)로 엔진을 만들고, 기록한 `Action[]`을 순서대로 `submitAction`하면 이벤트 로그가 **완전히 같다**(AI끼리 6:6, 31개 행동, 100개 이벤트 일치).
- 팀을 `exportShowdownTeam` → `parseShowdownTeam`으로 왕복해도 같은 로그. JSON 원문 ≈ 4.9 KB(6:6, 12턴).
- AI는 시드 고정이지만 재생 시 AI를 다시 돌리지 않는다: **모든 행동(사람·AI)을 기록**해서 그대로 넣는다(AI 구현이 바뀌어도 링크가 깨지지 않게).

## 태스크

### T1. 직렬화 (`src/lib/replay.ts` + 테스트)
- 타입 `ReplayData = { v: 1, seed: number, format: 'singles' | 'doubles', p1: ReplaySide, p2: ReplaySide, actions: Action[] }`, `ReplaySide = { team: string /* Showdown 텍스트 */, ctrl: 'human' | 'easy' | 'normal' | 'hard' }`. 진영 이름은 저장하지 않는다(화면에서 언어별로).
- 행동은 짧은 튜플로 인코딩: move `[0, p, slot, moveIndex, flags]`(flags 비트: 1=tera), switch `[1, p, slot, switchToTeamIndex]`, raw `[2, p, choice]`. `pokemon_id`는 `p1_3` 꼴 → 숫자 인덱스로. 디코딩은 정확히 원래 `Action` 객체로(테스트로 왕복 확인).
- `encodeReplay(data): Promise<string>` — JSON → `CompressionStream('deflate-raw')` → base64url(패딩 없음). `decodeReplay(s): Promise<ReplayData>` — 반대, 잘못된 입력은 `ReplayError`(코드: `corrupt` | `version`).
- 테스트: 왕복 동일성, 손상된 문자열, 버전 불일치, 6:6 배틀 하나의 인코딩 길이(< 3000자 기대, 실제 값을 진행 기록에).

### T2. 세션이 행동을 기록 + 프레임 생성 공용화
- `useBattleSession`: 사람·AI 모든 `submitAction` 성공분을 `actionsRef`에 순서대로 기록. `replayData()`가 `ReplayData`를 돌려준다(start 때 받은 config·컨트롤러 사용).
- 프레임 캡처(엔진 → `Frame`)를 순수 함수로 분리(`src/pages/battle/frames.ts` 등): `attachFrameCapture(engine, push)`. 세션과 리플레이가 같은 코드를 쓴다.
- `simulateReplay(data): { frames, winner, error? }` — 엔진을 새로 만들어 행동을 차례로 넣는다. 요청이 없는 플레이어의 행동이 오거나 `submitAction`이 던지면 거기서 멈추고 `error: 'mismatch'`(재현 실패 — 설계의 실패 기준이므로 화면에 분명히 표시).
- 테스트: 실제 AI 배틀을 기록 → encode → decode → simulate 한 프레임의 이벤트 목록이 원래와 같음. 시드 3개.

### T3. 공유 UI
- 결과 오버레이(배틀 종료)에 `리플레이 링크 복사`(주 버튼 옆) + `리플레이 보기`. 복사 성공/실패 피드백(Astryx Toast 있으면 사용, 없으면 버튼 라벨 바꿈 "복사했어요").
- 링크 형식: `${location.origin}${location.pathname}#/battle/replay?d=<encoded>`.
- 배틀 중에도 상단 툴바에서 "지금까지 리플레이" 링크를 만들 필요는 없다(비목표).

### T4. 리플레이 화면 (`#/battle/replay`)
- `src/App.tsx`에 `<Route path="/battle/replay" element={<ReplayPage />} />` 한 줄(지연 로드). 다른 내용 변경 금지.
- `ReplayPage`: `d` 디코드 → `useEngineReady` 후 `simulateReplay` → 2단계 HUD 컴포넌트(Combatant, FieldBar, BattleLog)에 커서 위치 프레임을 넘겨 그린다. 행동 패널 자리에 **타임라인**:
  - Astryx `Slider`(턴 단위 0…마지막 턴), 이전 턴/다음 턴 버튼, 재생/일시정지(재생 시 프레임을 속도에 맞춰 넘김), 처음/끝. 키보드 ←/→ = 이전/다음 턴, Space = 재생/일시정지(입력 요소에 포커스 있으면 무시).
  - 현재 턴 / 전체 턴, 승자 표시. 로그는 커서까지만.
  - 플레이어/컨트롤러 표시(“나 vs CPU(어려움)”, “CPU 1 vs CPU 2”).
- 오류: 링크 손상 → Banner(error) + "배틀 시뮬레이터로" 버튼. 재현 실패(mismatch) → Banner(warning) "이 링크는 현재 엔진 버전에서 같은 결과를 재현하지 못했습니다" + 멈춘 지점까지 재생 허용.
- 휴대폰: 타임라인이 첫 화면 안에(HUD 아래 바로).
- 문서 제목: `리플레이 - A vs B`.

### T5. 검증
- build/lint/test/doctor. Playwright: 대전 한 판 끝 → 링크 복사(클립보드 권한 대신 버튼이 만든 URL을 화면/속성에서 읽거나 `navigator.clipboard` 스텁) → 새 컨텍스트에서 링크 열기 → 마지막 턴으로 이동 → 결과(승자, 마지막 로그 줄)가 원래 배틀과 같은지 비교. 1280·390 스크린샷.
