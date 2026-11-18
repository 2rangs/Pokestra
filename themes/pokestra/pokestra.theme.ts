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
  };
}

export const pokestraTheme = defineTheme({
  extends: pokestraSettings,
  name: 'pokestra',
  localTokens,
  components: {
    token: tokenVariants,
  },
});
