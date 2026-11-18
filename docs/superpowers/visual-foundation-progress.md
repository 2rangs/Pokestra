# 비주얼 기반 (타입 색 토큰 · TypeChip · 박스 아이콘) — 진행 기록

브랜치 `claude/visual-foundation`. 설계 (1)만 했고, 기존 사용처(TypeIcon, battle/TypeBadge, TypeTag)는 **바꾸지 않았다**. 밀도 트랙이 머지된 뒤 원 세션이 교체한다.
계획: `docs/superpowers/plans/2026-11-18-visual-foundation.md`

## 만든 것
| 파일 | 내용 |
|---|---|
| `themes/pokestra/` | editor 테마 원본. `pokestra.settings.json`(editor 소유), `pokestra.theme.ts`(우리 확장), `typeColors.ts`(생성된 색 값) |
| `src/themes/pokestra/` | editor 가 매 빌드마다 쓰는 앱 복사본 (직접 수정 금지) |
| `src/astryx-themes.ts` | `theme add pokestra` + `theme use pokestra` 로 기본 테마가 pokestra (생성 파일) |
| `scripts/type-colors.mjs` | 타입 색 생성기 → `typeColors.ts`, `src/type-colors.css`, `src/lib/typeColorClasses.ts` |
| `src/type-colors.css` | 테마 토큰 → Tailwind 유틸리티 브리지 (`styles.css` 에서 import) |
| `src/lib/typeColorClasses.ts` | 타입 → 유틸리티 클래스 맵 |
| `src/components/ui/TypeChip.tsx` | `TypeChip`, `MultiplierChip`, `TypeGlyph` |
| `src/components/ui/typeChipModel.ts` | 배수 글자·의미 단계·Token 색 매핑 (순수 함수) |
| `src/i18n/messages/typeChips.ts` | 배수 의미 문구 (ko/en/ja, 스크린리더 설명용) |
| `src/lib/spriteUrls.ts` / `images.ts` | `boxIconUrls`, ≤40px 후보 단계 |
| `src/lib/contrast.ts` | WCAG 대비 계산 |
| `scripts/preview/` | 개발용 미리보기 페이지와 스크린샷 스크립트 (라우트 아님, 앱 빌드에 안 들어감) |
| 테스트 | `src/lib/typeColors.test.ts`(117), `src/lib/images.test.ts`, `src/components/ui/typeChipModel.test.ts` |

## API
```ts
// src/components/ui/TypeChip.tsx
<TypeChip type="fire" size?="sm"|"md"(기본 md) label?={string} iconOnly?={boolean} href?={string} className? />
// Astryx Token(color=<type>) 기반. 배경·글자색·굵기는 테마 변형. 모르는 타입은 gray, 아이콘 없는 타입(stellar)은 글자만.

<MultiplierChip multiplier={4|2|1|0.5|0.25|0} type?="ground" perspective?="defense"|"attack"(기본 defense) size?="sm"|"md"(기본 sm) className? />
// 글자 ×4 ×2 ×1 ×½ ×¼ ×0. 의미 색(Token 기본 색): defense ×4 red, ×2 orange, ×1 default, ×½ green, ×¼ teal, ×0 gray.
// attack 은 뒤집음(×4 teal, ×2 green, ×½·×¼ orange, ×0 red). type 이 있으면 타입 아이콘 + 타입 색 테두리,
// aria-description 에 "땅 ×4: 4배 약점" 같은 설명.

<TypeGlyph type="fire" size?="sm"|"md" />   // 타입 원형 아이콘(장식, aria-hidden)

// src/components/ui/typeChipModel.ts
THEMED_TYPES: readonly [...18타입, 'stellar']
isThemedType(type: string): type is ThemedType
typeTokenColor(type: string): TokenColor
typeBorderClass(type: string): string          // 'border-type-fire-border' | 'border-border'
multiplierLabel(m: number): string
multiplierTone(m: number, perspective?): 'danger'|'warning'|'neutral'|'safe'|'strong-safe'|'immune'
multiplierMessageKey(m: number, perspective?)
TONE_TOKEN_COLOR: Record<MultiplierTone, TokenColor>

// src/lib/typeColorClasses.ts
TYPE_COLOR_CLASSES[type] = { bg, on, subtle, border, text }   // 예: bg-type-fire, text-type-fire-on, bg-type-fire-subtle, border-type-fire-border, text-type-fire-text

// src/lib/spriteUrls.ts
boxIconUrls(id: number): string[]   // [SV icons/{id}.png, gen7 icons/{id}.png]

// src/lib/images.ts
BOX_ICON_MAX_PX = 40
pokemonImageCandidates(id, displayPx, { sprite?, back? })
//  ≤40px: [SV 아이콘, 7세대 아이콘, 도트, 일러스트] · ≤64px: [도트, 일러스트] · >64px: [일러스트, 도트] · back: 뒷모습 도트 맨 앞(박스 아이콘 없음)
```

### 테마 토큰
`--pokestra-type-<type>-{bg,on,subtle,border,text}` (19타입 × 5역할, 각 `light-dark(라이트, 다크)`).
- **bg/on**: 배지 배경과 그 위 글자 · **subtle**: 옅은 타입 면(카드 배경 등) · **border**: 테두리·띠 · **text**: surface/body 위 타입 글자색
- Tailwind: `bg-type-<t>`, `text-type-<t>-on`, `bg-type-<t>-subtle`, `border-type-<t>-border`, `text-type-<t>-text`.
  동적 이름은 Tailwind 가 못 찾으므로 반드시 `TYPE_COLOR_CLASSES` 를 거친다.
- Token: `<Token color="fire" />` (테마 빌드가 `TokenColorMap` 을 보강해 타입 검사됨).

## 테마 결정
1. editor 로 `npx astryx experimental theme editor new pokestra --like neutral` (설정 변경 없음 = neutral 과 같은 모습).
2. editor 가 못 하는 것 확인:
   - `editor how "18 custom color tokens for pokemon types …"` → 매칭 없음(badge 배경만 이해). 임의 이름 토큰 기능 없음.
   - `editor set pokestra background-color … --on token --when color:fire` → `token has no color "fire"` 로 거부.
3. 그래서 editor 가 "yours to edit" 로 남기는 `themes/pokestra/pokestra.theme.ts` 에서 editor 설정 테마를 `extends` 하고
   `localTokens`(색 토큰) + `components.token['color:<type>']`(custom variant) 를 더했다. `:root` 덮어쓰기 없음.
   빌드: `npx astryx experimental theme compile themes/pokestra/pokestra.theme.ts` → 앱 복사본 `src/themes/pokestra/` 갱신.
   연결: `npx astryx theme add pokestra`, `npx astryx theme use pokestra`.
4. 색 값: 기존 `TYPE_COLOR`(타입 아이콘 SVG 원과 같은 색)에서 OKLCH 의 명도(L)만 움직여 AA 를 맞춘다.
   흰 글자(배경을 어둡게)와 검은 글자(`#141414`, 배경을 밝게) 중 원래 색에서 덜 움직이는 쪽을 고르되 흰 글자를 L 0.14 만큼 우대.
   다크는 L 상한 0.8·채도 92% 로 눈부심을 줄였다. 값을 바꾸려면 `node scripts/type-colors.mjs` → compile.
5. `editor show pokestra --png` 그림(`themes/pokestra/*.png`, gitignore)을 열어 neutral 모습이 그대로인지 확인했고,
   타입 변형은 editor 그림에 안 나오므로 미리보기 스크린샷으로 확인.

## 대비 검사 결과 (WCAG AA 4.5:1, `src/lib/typeColors.test.ts` 117개 통과)
빌드된 테마의 값으로 계산. 글자색 = surface·body 중 낮은 값, subtle = 본문·보조 글자 중 낮은 값.

| 타입 | 라이트 배경/글자 | 배지 | 글자색 | subtle | 다크 배경/글자 | 배지 | 글자색 | subtle |
|---|---|---|---|---|---|---|---|---|
| normal | #a0a29f / 검 | 7.16 | 4.69 | 8.15 | #a0a29f / 검 | 7.16 | 5.88 | 5.24 |
| fire | #fba54c / 검 | 9.29 | 4.60 | 8.15 | #f6a758 / 검 | 9.29 | 7.63 | 5.33 |
| water | #3477bb / 흰 | 4.66 | 4.69 | 8.18 | #3b78b5 / 흰 | 4.63 | 4.63 | 5.25 |
| electric | #f4d23b / 검 | 12.39 | 4.62 | 8.19 | #dbbc34 / 검 | 9.87 | 10.18 | 5.26 |
| grass | #5fbd58 / 검 | 7.81 | 4.61 | 8.25 | #66bb60 / 검 | 7.76 | 6.42 | 5.15 |
| ice | #74cec0 / 검 | 9.94 | 4.61 | 8.22 | #7bcdc0 / 검 | 9.94 | 8.17 | 5.17 |
| fighting | #cf3f5c / 흰 | 4.65 | 4.66 | 8.10 | #ca465f / 흰 | 4.61 | 4.60 | 5.38 |
| poison | #a552bd / 흰 | 4.62 | 4.63 | 8.09 | #a155b6 / 흰 | 4.68 | 4.62 | 5.37 |
| ground | #b55b2a / 흰 | 4.67 | 4.61 | 8.11 | #b15e33 / 흰 | 4.65 | 5.02 | 5.33 |
| flying | #a1bbec / 검 | 9.50 | 4.68 | 8.13 | #a3bbe8 / 검 | 9.50 | 7.81 | 5.29 |
| psychic | #fa8581 / 검 | 7.66 | 4.61 | 8.09 | #f58985 / 검 | 7.72 | 6.30 | 5.36 |
| bug | #92bc2c / 검 | 8.29 | 4.63 | 8.24 | #94bb3e / 검 | 8.28 | 6.81 | 5.18 |
| rock | #c9bb8a / 검 | 9.61 | 4.62 | 8.14 | #c8bb8e / 검 | 9.61 | 7.90 | 5.27 |
| ghost | #5f6dbc / 흰 | 4.77 | 4.68 | 8.11 | #616eb6 / 흰 | 4.76 | 4.68 | 5.31 |
| dragon | #0c69c8 / 흰 | 5.43 | 4.80 | 8.15 | #1d6ac1 / 흰 | 5.41 | 4.61 | 5.28 |
| dark | #595761 / 흰 | 7.09 | 6.28 | 8.12 | #595760 / 흰 | 7.10 | 4.63 | 5.26 |
| steel | #3e7d8a / 흰 | 4.66 | 4.61 | 8.20 | #437c89 / 흰 | 4.68 | 4.60 | 5.24 |
| fairy | #ee90e6 / 검 | 8.57 | 4.68 | 8.04 | #ea94e2 / 검 | 8.63 | 7.04 | 5.38 |
| stellar | #7261e4 / 흰 | 4.62 | 4.66 | 8.15 | #7163da / 흰 | 4.67 | 4.64 | 5.30 |

최저: 라이트 배지 4.62(poison·stellar), 다크 배지 4.61(fighting), 타입 글자색 4.60, subtle 위 글자 5.15.

## 스크린샷
`docs/screenshots/visual/` — `node scripts/preview/shoot-visual-foundation.mjs` 로 다시 찍는다 (포트 5191).
- `foundation-desktop-light.png`, `foundation-desktop-dark.png` (1280)
- `foundation-mobile-light.png`, `foundation-mobile-dark.png` (390)

## 검증
- `npm test` 150 통과, `npm run build` 통과, `npx eslint .` 0 문제.
- `npx astryx doctor --built dist`: fail 0 (warn: Figtree 외부 폰트 — 기존과 같음).
- doctor purity: 새 `TypeChip.tsx` 는 토큰 유틸리티 `className` 3건(아이콘 크기 `size-4`, `shrink-0`, 배수 칩 테두리·`tabular-nums`)만. raw `<div>`/`style`/hex 없음.

## Ruling
- **R1 테마 방식**: editor 테마 + editor 소유 아닌 `pokestra.theme.ts` 에서 localTokens·Token custom variant 로 확장. (editor 가 임의 토큰·신규 Token color 를 거부하므로)
- **R2 기본 테마 교체**: 앱 기본 테마를 neutral → pokestra 로 바꿨다. pokestra 는 neutral + 추가분뿐이라 기존 화면 모습은 그대로이고, 토큰이 있어야 새 컴포넌트가 동작한다.
- **R3 스텔라 포함**: 18타입 + stellar(배틀 테라) 19개 토큰. 아이콘이 없어 글자만. 모르는 타입(typeless 등)은 Token gray.
- **R4 글자색 선택**: 타입마다 흰/검 글자를 고르는 방식(흰 글자 우대). 전부 흰 글자로 하면 전기·얼음·벌레 등이 갈색으로 탁해져서.
- **R5 Tailwind 브리지**: core 의 `tailwind-theme.css` 와 같은 `@theme reference inline` 방식으로 `--color-type-*` 를 등록. 값은 테마 토큰을 가리킬 뿐(`:root` 값 없음).
- **R6 배수 칩 의미 색**: Astryx Token 기본 색(red/orange/green/teal/gray)을 쓰고 타입 색은 테두리로만 — 의미(위험/안전)가 타입 색에 묻히지 않게. 공격 관점은 `perspective="attack"` 으로 뒤집음.
- **R7 박스 아이콘 적용 범위**: `pokemonImageCandidates` 를 바꿨으므로 이미 ≤40px 로 `PokeImage` 를 쓰는 기존 자리는 자동으로 박스 아이콘이 먼저 나온다(설계의 의도). 뒷모습(back)은 제외. 픽셀 렌더링은 PokeImage 의 auto 판정이 그대로 처리.
- **R8 미리보기**: 앱 라우트 대신 `scripts/preview/visual-foundation.html`(Vite 개발 서버만 서빙, 빌드 입력 아님) + Playwright 스크립트.
- **R9 eslint**: 테마 빌드가 만드는 `pokestra*.d.ts`(triple-slash reference)는 생성 파일이라 globalIgnores 에 추가.

## 다음 (원 세션)
- `TypeIcon`/`TypeTag`/`battle/TypeBadge` 사용처를 `TypeChip` 으로 교체, 상성표를 `MultiplierChip` 으로.
- 카드·상세 머리말에 `TYPE_COLOR_CLASSES[type].subtle/border` 적용 (설계 3번 디테일 패스).
