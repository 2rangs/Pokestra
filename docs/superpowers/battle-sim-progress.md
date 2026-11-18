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
