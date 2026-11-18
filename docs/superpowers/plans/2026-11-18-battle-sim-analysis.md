# 배틀 시뮬레이터 4단계 — 배틀 분석 (계획)

설계: `specs/2026-11-18-battle-sim-upgrade-design.md` 4단계 + "분석 데이터는 엔진 이벤트(BattleEvent)에서 계산하는 순수 함수 + 단위 테스트".
규칙: `AGENTS.md`. 범위: 새 `src/lib/battleAnalysis.ts`(+테스트), `src/pages/battle/**`, `src/i18n/messages/battle.ts`. 차트는 `dataviz` 원칙(색 일관, 범례·축 라벨, 다크 모드 토큰) — 라이브러리 추가 없이 인라인 SVG(토큰 색은 `currentColor`/CSS 변수 클래스), raw hex 금지.

## 태스크

### T1. 순수 분석 함수 (`src/lib/battleAnalysis.ts` + 테스트)
입력: `Frame[]`(각 프레임 = 이벤트 + 그 시점 양 진영 뷰). 출력 `BattleAnalysis`:
- 포켓몬별(`id` 기준) `{ id, side, dealt, taken, dealtPct, takenPct, kos, fainted, turnsOnField }`.
  - **준 데미지**: `damage` 이벤트 중 직전 `move_use`(같은 행동 안, 대상이 맞은 쪽)의 사용자에게 귀속. 엔진의 `damage.source` 값이 기술 데미지일 때 무엇인지 먼저 실제 이벤트로 확인하고 규칙을 문서 주석에 적는다. 반동·혼란 자해·날씨·장판·상태이상 데미지는 상대에게 귀속하지 않는다(`indirect` 합계로 따로).
  - 장판(스텔스록 등)·독압정 데미지는 그 장판을 깐 쪽 포켓몬을 추적할 수 있으면 귀속, 아니면 indirect. (최소: indirect)
  - `dealtPct`: 상대 최대 HP 대비 % 합(여러 마리에 준 %를 더함 — "상대 몇 마리분"으로 읽힘).
  - **쓰러뜨린 수**: `faint` 직전 그 포켓몬에게 마지막으로 데미지를 준 상대 포켓몬(기술 데미지)에게 +1.
- 턴별 HP 흐름: `turns: { turn, p1Pct, p2Pct }[]` — 각 턴 끝(다음 `turn_start` 직전 또는 마지막 프레임) 팀 남은 HP 합 / 팀 최대 HP 합 ×100.
- MVP: 이긴 쪽(무승부면 양쪽) 포켓몬 중 점수 `dealtPct + 40 × kos − 0.2 × takenPct`가 가장 큰 포켓몬. 동점이면 kos 많은 쪽, 그다음 팀 순서. 점수식은 상수로 두고 주석에 이유.
- 결정적 순간(선택): 가장 큰 단일 데미지 `{ turn, attacker, target, pct, crit }`.
- 테스트: 손으로 만든 짧은 프레임 목록(기술 데미지·반동·급소 KO·교체)으로 귀속 규칙 검증 + 실제 AI 배틀 하나에서 불변식(양 진영 taken 합 = 상대 dealt 합 + indirect, 기절 수 = kos 합 + 간접 기절).

### T2. 분석 화면
- 결과 오버레이 아래(배틀 종료 후)와 리플레이 화면 하단에 `배틀 분석` 섹션:
  1. 맨 위 한 줄: MVP 카드(스프라이트·이름·핵심 수치 3개) + 결정적 순간 한 줄.
  2. 표(Astryx Table 또는 List — 밀도 규칙: 행, 숫자 오른쪽 정렬 tabular): 포켓몬 | 준 데미지(%) | 받은 데미지(%) | 쓰러뜨림 | 상태(기절/생존). 진영별 두 표 또는 진영 열. 열 머리말에 툴팁 설명(6번 원칙: "준 데미지 = 상대 최대 HP 대비 %의 합").
  3. HP 흐름 그래프: 인라인 SVG 선 2개(우리/상대, x=턴, y=0–100%), 축 라벨·범례, 마우스 올리면 그 턴 값(또는 각 점에 title). 색은 토큰(우리=accent, 상대=error 등)으로, 범례와 같은 색.
- 휴대폰: 표는 가로 스크롤 없이(열 축약: 포켓몬·준·받은·KO), 그래프는 폭 100%.

### T3. 검증
- build/lint/test/doctor, Playwright 1280·390 스크린샷(배틀 종료 후 분석, 리플레이 화면 분석), 화면의 MVP·수치가 로그와 맞는지 한 판 수동 대조.
