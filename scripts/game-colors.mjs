// 게임(작품) 배지 색 생성기: 작품별 대표 색(위키에서 흔히 쓰는 버전 색)으로
// 테마 토큰(themes/pokestra/gameColors.ts), Tailwind 브리지(src/game-colors.css), 클래스 표(src/lib/gameColorClasses.ts)를 만든다.
// 배지 글자색은 배경 밝기로 흰색/검정 중 대비가 높은 쪽을 고른다.
// 실행: node scripts/game-colors.mjs   (결과 파일은 커밋한다)
import { writeFileSync } from 'node:fs'

/** version slug → [대표 색, 약칭] */
const GAMES = {
    red: ['#DA3914', 'R'], blue: ['#2E50D8', 'B'], yellow: ['#F4C430', 'Y'],
    gold: ['#C9A227', 'G'], silver: ['#A8A9AD', 'S'], crystal: ['#3FB8D9', 'C'],
    ruby: ['#CD2236', 'Ru'], sapphire: ['#3D51A7', 'Sa'], emerald: ['#009652', 'E'],
    firered: ['#F15C01', 'FR'], leafgreen: ['#7DBA00', 'LG'],
    diamond: ['#5F8DCB', 'D'], pearl: ['#D27BA8', 'P'], platinum: ['#8B8B7A', 'Pt'],
    heartgold: ['#D9A400', 'HG'], soulsilver: ['#8FA1BD', 'SS'],
    black: ['#3A3A3A', 'B'], white: ['#D8D8D8', 'W'], 'black-2': ['#424B50', 'B2'], 'white-2': ['#D9C3C6', 'W2'],
    x: ['#025DA6', 'X'], y: ['#EA1A3E', 'Y'], 'omega-ruby': ['#AB2813', 'OR'], 'alpha-sapphire': ['#26649C', 'AS'],
    sun: ['#F1912B', 'S'], moon: ['#5599CA', 'M'], 'ultra-sun': ['#E95B2B', 'US'], 'ultra-moon': ['#226DB5', 'UM'],
    'lets-go-pikachu': ['#F0CF1C', 'LP'], 'lets-go-eevee': ['#C8864A', 'LE'],
    sword: ['#00A1E9', 'Sw'], shield: ['#BF004F', 'Sh'],
    'legends-arceus': ['#36597B', 'LA'], 'brilliant-diamond': ['#1F8EE6', 'BD'], 'shining-pearl': ['#E44A85', 'SP'],
    scarlet: ['#F34134', 'Sc'], violet: ['#8334B7', 'Vi'], 'legends-za': ['#2A9D6F', 'ZA'],
}

const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const lum = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
const onColor = (hex) => (contrast(lum(hex), 1) >= contrast(lum(hex), lum('#141414')) ? '#ffffff' : '#141414')

const header = '// 생성 파일: node scripts/game-colors.mjs (직접 수정 금지).\n'
const entries = Object.entries(GAMES)

writeFileSync(
    new URL('../themes/pokestra/gameColors.ts', import.meta.url),
    header +
        '/** 작품 slug → 배지 배경·글자 (라이트/다크 같은 값: 작품 고유 색) */\n' +
        'export const GAME_COLOR_TOKENS: Record<string, { bg: string; on: string }> = {\n' +
        entries.map(([v, [bg]]) => `    '${v}': { bg: '${bg}', on: '${onColor(bg)}' },`).join('\n') +
        '\n}\n',
)

writeFileSync(
    new URL('../src/game-colors.css', import.meta.url),
    '/* 생성 파일: node scripts/game-colors.mjs (직접 수정 금지).\n * 작품 배지 색 테마 토큰(--pokestra-game-*)을 Tailwind 유틸리티로 잇는다. */\n@theme reference inline {\n' +
        entries.map(([v]) => `  --color-game-${v}: var(--pokestra-game-${v}-bg);\n  --color-game-${v}-on: var(--pokestra-game-${v}-on);`).join('\n') +
        '\n}\n',
)

writeFileSync(
    new URL('../src/lib/gameColorClasses.ts', import.meta.url),
    header.replace('// ', '// ') +
        '// 작품 slug → 배지 클래스·약칭 (src/game-colors.css 브리지, 값은 pokestra 테마 토큰).\n' +
        'export const GAME_BADGES: Record<string, { cls: string; abbr: string }> = {\n' +
        entries.map(([v, [, abbr]]) => `    '${v}': { cls: 'bg-game-${v} text-game-${v}-on', abbr: '${abbr}' },`).join('\n') +
        '\n}\n',
)
console.log('games:', entries.length)
