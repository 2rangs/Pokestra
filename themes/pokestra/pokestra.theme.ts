// The pokestra theme. `astryx experimental theme editor` wrote this file once and never changes it again.
// The checked settings live in pokestra.settings.json and the generated pokestra.settings.ts;
// change them with `astryx experimental theme editor set pokestra ...`. Add your own changes below: they win over the settings.
//
// Pokestra 추가분 (editor 가 만들 수 없는 것만 여기에):
// - 타입 색 토큰 `--pokestra-type-<type>-{bg,on,subtle,border,text}` (light/dark, 값은 ./typeColors.ts 생성 파일)
//   editor 는 임의 이름 토큰을 받지 않는다(`how` 에 해당 항목 없음) → defineTheme 의 localTokens 로 넣는다.
// - Token 의 타입 색 변형 `color:<type>` — editor 는 Token 에 없는 color 값을 거부한다
//   (`token has no color "fire"`) → components 의 custom variant 로 넣고 theme build 가 타입을 보강한다.
// 빌드: npx astryx experimental theme compile themes/pokestra/pokestra.theme.ts
import {defineTheme} from '@astryxdesign/core/theme';
import {pokestraSettings} from './pokestra.settings';
import {TYPE_COLOR_TOKENS} from './typeColors';
import {GAME_COLOR_TOKENS} from './gameColors';

type Mode = readonly [light: string, dark: string];
const tuple = (v: Mode): [string, string] => [v[0], v[1]];

const localTokens: Record<string, [string, string]> = {};
const tokenVariants: Record<string, Record<string, string>> = {};

for (const [type, roles] of Object.entries(TYPE_COLOR_TOKENS)) {
  for (const [role, value] of Object.entries(roles)) {
    localTokens[`--pokestra-type-${type}-${role}`] = tuple(value);
  }
  tokenVariants[`color:${type}`] = {
    backgroundColor: `var(--pokestra-type-${type}-bg)`,
    color: `var(--pokestra-type-${type}-on)`,
    fontWeight: 'var(--font-weight-semibold)',
    borderRadius: 'var(--radius-inner)',
    // 레퍼런스의 밝은 타입 색(전기·얼음·비행 등) 위 흰 글자를 읽기 쉽게 하는 옅은 그림자
    textShadow: '0 1px 1.5px rgb(0 0 0 / 0.35)',
  };
}

// 종족값 막대 6단계 (낮음 → 높음). 막대 옆에 숫자가 늘 있어 색은 보조 신호다.
// 라이트: 옅은 트랙(#f1f1f1) 위에서 선명하게, 다크: 어두운 트랙 위에서 눈부시지 않게 조금 낮춘 명도.
const STAT_BANDS: Record<string, [string, string]> = {
  '1': ['#e5484d', '#e5484d'],
  '2': ['#f2780c', '#f0812a'],
  '3': ['#e8b100', '#d9a800'],
  '4': ['#7cc513', '#76b81c'],
  '5': ['#22b45c', '#2aa860'],
  '6': ['#0fb5ae', '#16a8a2'],
};
for (const [band, value] of Object.entries(STAT_BANDS)) {
  localTokens[`--pokestra-stat-${band}`] = value;
}

// 작품(게임) 배지 색: 도감 설명의 출처 표시. 작품 고유 색이라 라이트/다크 같은 값
for (const [game, {bg, on}] of Object.entries(GAME_COLOR_TOKENS)) {
  localTokens[`--pokestra-game-${game}-bg`] = [bg, bg];
  localTokens[`--pokestra-game-${game}-on`] = [on, on];
}

export const pokestraTheme = defineTheme({
  extends: pokestraSettings,
  name: 'pokestra',
  localTokens,
  components: {
    token: tokenVariants,
  },
});
