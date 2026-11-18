# 배틀 도구·나무열매 페이지 — 설계

## 의도
배틀에서 쓰는 지닌 도구와 나무열매 정보를 한곳에 모아, 설명·수치·가진 포켓몬·계산기 연결까지 한 화면에서 끝내게 한다.
처음부터 `dense-layout` 설계의 원칙(시선·마우스 동선·읽는 방식)을 따른다.

## 범위
- 포함: PokeAPI 아이템 분류 중 배틀 관련 — held-items, choice, bad-held-items, type-enhancement, plates, species-specific,
  jewels, mega-stones, memories, scarves + 나무열매 포켓 전체(effort-drop, medicine, other, in-a-pinch, picky-healing,
  type-protection, baking-only, catching-bonus). 약 400개.
- 제외: 볼, 회복약, 기술머신, 중요한 도구, 편지, 소재류.

## 화면
- **`/items` 목록** (머리말 메뉴에 "도구" 추가)
  - 첫 줄: 검색창(3개 언어 이름) | 보기 전환(전체 / 배틀 도구 / 나무열매) — 왼쪽 위 시선 시작점.
  - 둘째 줄: 분류 토글 칩(선택 보기의 하위 분류). 스크롤 시 필터 바 고정.
  - 결과는 촘촘한 표: 아이콘 24px · 이름(다른 언어 이름 흐리게) · 분류 · 한 줄 설명(길면 말줄임, 전체는 상세) · 핵심 수치(배틀 도구: 던지기 위력 / 나무열매: 자연의은혜 타입·위력, 맛). 행 전체 클릭 → 상세.
  - 정렬: 이름, 분류, 수치.
- **`/items/:slug` 상세**
  - 머리말: 아이콘 · 이름(3개 언어) · 분류 · 게임 설명문(사용자 언어) · 오른쪽 위 주요 행동 "계산기에서 써 보기".
  - 수치 묶음(라벨/값): 던지기 위력·효과, 나무열매는 자연의은혜 타입/위력, 맛 5종 막대, 단단함, 크기, 자라는 시간.
  - 야생에서 지니고 있는 포켓몬: 도트 + 이름 + 등장 확률 촘촘한 목록, 클릭 시 포켓몬 상세.
  - 이전/다음 도구(목록 정렬 기준), ←/→ 키.
- **계산기 연결**: 계산기 URL에 `atkItem=<slug>`(공격 측 도구 미리 선택) 지원 추가. 계산기 도구 목록에 없는 아이템이면 버튼 숨김.

## 데이터
- `src/script/buildItemsData.mjs`: PokeAPI CSV 덤프(items, item_names, item_flavor_text, item_categories, item_category_prose,
  item_prose, berries, berry_flavors, berry_firmness, pokemon_items, item_fling_effect_prose 등)로 `src/data/items.json` 생성·커밋.
  설명문은 각 언어의 가장 최신 버전 문구. 아이콘은 PokeAPI 스프라이트 URL(`sprites/items/<slug>.png`)을 `PokeImage`로.
- 이름은 기존 `itemNames.json`과 일치시킬 것.

## 접근 방식
- **빌드 시 데이터 생성 후 커밋 (채택)**: 기존 도감/기술/특성과 같은 방식. 검색·필터가 즉시, 오프라인 안정.
- 화면에서 PokeAPI 실시간 조회: 목록 필터/정렬에 400번 요청 필요 → 기각.

## 비목표
- 볼·회복약 등 비배틀 도구, 아이템 획득 장소, 배틀 엔진 내부 효과 시뮬레이션.

## 실패로 볼 것
- 한국어/일본어 설명이 비어 영어만 나오는 항목이 많음(가능하면 최신 버전 문구로 채우고, 없으면 영어 표시 + 표시).
- 계산기 버튼을 눌렀는데 도구가 선택되지 않음.
