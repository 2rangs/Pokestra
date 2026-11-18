# Pokestra를 도감 전용으로 — 설계

## 결정 (사용자)
- Pokestra는 도감 역할만 한다. 배틀 시뮬레이터(`/battle`)와 데미지 계산기(`/calc`)를 제거한다.
- 배틀 시연은 엔진 저장소(pokebattle-engine) 쪽 데모가 맡는다. 고도화 작업 결과는 `claude/battle-sim-upgrade` 브랜치에 참고용으로 남긴다(합치지 않음).
- `@kyasi/pokebattle-engine` 의존성을 Pokestra에서 완전히 제거한다.

## 제거 대상
- 라우트·페이지: `/battle`(BattlePage, BattleView, TeamBuilder, useBattleSession, stores/battleStore), `/calc`(CalcPage, components/calc/*).
- 라이브러리: `src/lib/battle.ts`, `src/lib/battleLog.ts`, `src/lib/calcItems.ts`(+테스트), 배틀/계산기 전용 i18n(`messages/battle.ts`, `messages/calc.ts`)과 공용 키 중 배틀/계산기 전용인 것.
- 진입점: 머리말 메뉴 "배틀", "계산기", 홈 바로가기 카드(배틀·계산기), 홈 히어로 문구 중 배틀 언급, 포켓몬 상세 "계산기에서 열기", 도구 상세 "계산기에서 써 보기".
- 문서: README(ko/en) 기능 표·엔진 의존성 절, `docs/engine-integration.md`(삭제하거나 "제거됨"으로 갱신).
- `package.json`에서 엔진 의존성 삭제, lock 갱신. Vite 설정 등에 엔진 관련 항목이 있으면 정리.

## 유지 (엔진 없이 다시 구현)
- 포켓몬 상세의 실능치 패널(Lv.50/Lv.100 최저·무보정·최고): 엔진 `calcBaseStat`/`calcHP`/`getSpecies` 대신 로컬 종족값 + 표준 공식(HP: ⌊(2B+I+⌊E/4⌋)·L/100⌋+L+10, 그 외: ⌊(⌊(2B+I+⌊E/4⌋)·L/100⌋+5)·성격⌋, 껍질몬 HP 1)을 순수 함수로, 단위 테스트(알려진 값 몇 개)로 검증. 패널 문구에서 "계산기" 언급 제거. "특성 (배틀 엔진)" 같은 엔진 표기 제거.
- 이전 링크 호환: `#/battle…`, `#/calc…`로 들어오면 홈(또는 도감)으로 보내고 짧은 안내 없이 조용히 이동(404 대신).

## 비목표
- 도감 기능 변경, 새 기능.

## 검증
- `grep -r "pokebattle-engine\|@pkmn\|@smogon" src package.json` 결과 없음. build/lint/test/doctor 통과, 번들 크기(전/후) 기록. 모든 페이지 1280/390 확인, 메뉴·홈에 배틀/계산기 흔적 없음.
