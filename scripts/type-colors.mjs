// 타입 색 토큰 생성기: 기준 색(public/assets/types 아이콘과 같은 TYPE_COLOR)에서
// 라이트/다크 배지 배경·글자·옅은 면·테두리·글자색을 만들어 themes/pokestra/typeColors.ts 로 쓴다.
// 실행: node scripts/type-colors.mjs   (결과 파일은 커밋한다. 대비 검사는 src/lib/typeColors.test.ts)
import { writeFileSync } from 'node:fs'

const BASE = {
    normal: '#A0A29F', fire: '#FBA54C', water: '#4D90D5', electric: '#F4D23B', grass: '#5FBD58', ice: '#74CEC0',
    fighting: '#D3425F', poison: '#B763CF', ground: '#DA7C4D', flying: '#A1BBEC', psychic: '#FA8581', bug: '#92BC2C',
    rock: '#C9BB8A', ghost: '#5F6DBC', dragon: '#0C69C8', dark: '#595761', steel: '#5695A3', fairy: '#EE90E6',
    stellar: '#7C6CF0',
}

// neutral 테마 값 (resolveThemeTokens 로 확인)
const SURFACE = { light: '#ffffff', dark: '#262626' }
const BODY = { light: '#f1f1f1', dark: '#1b1b1b' }
const ON_LIGHT = '#ffffff' // 진한 배경 위 글자
const ON_DARK = '#141414' // 밝은 배경 위 글자
const AA = 4.6 // 4.5 + 반올림 여유

// ── 색 변환 (sRGB ↔ OKLab/OKLCH) ──
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const fromLin = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)
function rgbToOklch([r, g, b]) {
    ;[r, g, b] = [r, g, b].map(toLin)
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
    return [L, Math.hypot(A, B), Math.atan2(B, A)]
}
function oklchToRgb([L, C, H]) {
    const A = C * Math.cos(H)
    const B = C * Math.sin(H)
    const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
    const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
    const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3
    return [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ]
}
const inGamut = (rgb) => rgb.every((c) => c >= -1e-4 && c <= 1 + 1e-4)
/** 색역 밖이면 채도를 줄여 맞춘다 */
function lch(L, C, H) {
    let c = C
    let rgb = oklchToRgb([L, c, H])
    while (!inGamut(rgb) && c > 0) {
        c -= 0.002
        rgb = oklchToRgb([L, Math.max(c, 0), H])
    }
    const hex = rgb
        .map((v) => Math.round(Math.min(1, Math.max(0, fromLin(v))) * 255).toString(16).padStart(2, '0'))
        .join('')
    return `#${hex}`
}
const lum = (hex) => {
    const [r, g, b] = hexToRgb(hex).map(toLin)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
    return (x + 0.05) / (y + 0.05)
}

/** 기준 색의 L 만 움직여 text 와의 대비가 AA 가 될 때까지. 움직인 거리와 결과 */
function fit(L0, C, H, text, dir) {
    for (let d = 0; d <= 1; d += 0.005) {
        const L = L0 + dir * d
        if (L < 0 || L > 1) break
        const hex = lch(L, C, H)
        if (contrast(hex, text) >= AA) return { d, hex }
    }
    return { d: Infinity, hex: null }
}

/**
 * 배지 색의 출발점(타입 기준 색과 다를 때만). 흰 글자 대비 때문에 명도를 내리면 주황은 갈색, 노랑은 올리브가 되어
 * 비슷한 타입끼리 겹친다(불꽃↔땅, 전기↔바위, 에스퍼↔격투). 그래서 색상(hue)을 서로 벌린 출발점을 쓴다.
 */
const BADGE_SEED = {
    fire: '#F04E14', // 붉은 주황
    fighting: '#93302B', // 어두운 벽돌 (불꽃과 구분)
    psychic: '#F2386A', // 빨강 쪽 핑크 (격투·페어리와 구분)
    poison: '#9150D6', // 푸른 보라 (페어리와 구분)
    fairy: '#E05AAE', // 핑크
    electric: '#EDBB00', // 채도 높은 금색
    ground: '#9A6B45', // 채도 낮춘 갈색 (불꽃·전기와 구분)
    rock: '#8F8466', // 회색빛 카키 (땅·전기와 구분)
}

/**
 * 배지: 모든 타입이 흰 글자·흰 문양 (사용자 결정 — 진한 단색 배지).
 * 기준 색의 명도(L)만 낮춰 흰 글자 대비 AA 에 맞춘다. 어두워지며 탁해지는 것을 줄이려 채도를 조금 올린다(색역 안에서).
 */
function badge(base, { lMax = 1, chroma = 1 } = {}) {
    const [L0, C0, H] = rgbToOklch(hexToRgb(base))
    const L = Math.min(L0, lMax)
    const C = C0 * chroma * 1.15
    return { bg: fit(L, C, H, ON_LIGHT, -1).hex, on: ON_LIGHT }
}

/** 면(surface) 위에 바로 쓰는 타입 글자색 */
function textOn(base, surface, dir) {
    const [L0, C, H] = rgbToOklch(hexToRgb(base))
    return fit(L0, C, H, surface, dir).hex
}

const out = {}
for (const [type, base] of Object.entries(BASE)) {
    const [, C, H] = rgbToOklch(hexToRgb(base))
    const seed = BADGE_SEED[type] ?? base
    const light = badge(seed)
    const dark = badge(seed, { lMax: 0.8, chroma: 0.92 })
    out[type] = {
        bg: [light.bg, dark.bg],
        on: [light.on, dark.on],
        subtle: [lch(0.955, Math.min(C * 0.3, 0.035), H), lch(0.29, Math.min(C * 0.45, 0.05), H)],
        border: [lch(0.72, C * 0.9, H), lch(0.58, C * 0.85, H)],
        // light 는 더 어두운 body, dark 는 더 밝은 surface 가 기준(둘 다 통과)
        text: [textOn(base, BODY.light, -1), textOn(base, SURFACE.dark, +1)],
    }
}

const format = (o) =>
    '{\n' +
    Object.entries(o)
        .map(([t, v]) => `    ${t}: {\n` + Object.entries(v).map(([k, [a, b]]) => `        ${k}: ['${a}', '${b}'],\n`).join('') + '    },\n')
        .join('') +
    '}'
const header = `// 생성 파일: node scripts/type-colors.mjs 로 다시 만든다 (직접 수정 금지).
// 각 값은 [light, dark]. 대비 검사: src/lib/typeColors.test.ts
// bg/on: 배지 배경과 그 위 글자 (AA 4.5:1 이상) · subtle: 옅은 타입 면 · border: 테두리·띠 · text: 면 위 타입 글자색
// 기준 면: surface ${SURFACE.light}/${SURFACE.dark}, body ${BODY.light}/${BODY.dark} (neutral)
`
const body = `export const TYPE_COLOR_TOKENS = ${format(out)} as const satisfies Record<string, Record<'bg' | 'on' | 'subtle' | 'border' | 'text', readonly [string, string]>>
`
writeFileSync(new URL('../themes/pokestra/typeColors.ts', import.meta.url), header + body)
for (const [t, v] of Object.entries(out)) {
    console.log(
        t.padEnd(9),
        v.bg[0], v.on[0] === ON_LIGHT ? 'W' : 'B', contrast(v.bg[0], v.on[0]).toFixed(2),
        '|', v.bg[1], v.on[1] === ON_LIGHT ? 'W' : 'B', contrast(v.bg[1], v.on[1]).toFixed(2),
    )
}

// ── Tailwind 브리지: 테마 토큰 → 유틸리티 (bg-type-fire, text-type-fire-on, bg-type-fire-subtle, border-type-fire-border, text-type-fire-text)
const ROLES = ['on', 'subtle', 'border', 'text']
const css = `/* 생성 파일: node scripts/type-colors.mjs (직접 수정 금지).
 * 타입 색 테마 토큰(--pokestra-type-*, themes/pokestra)을 Tailwind 유틸리티로 잇는다.
 * core 의 tailwind-theme.css 와 같은 방식: 값은 테마가 가진다(라이트/다크 전환 포함). */
@theme reference inline {
${Object.keys(out)
    .map((t) => [`  --color-type-${t}: var(--pokestra-type-${t}-bg);`, ...ROLES.map((r) => `  --color-type-${t}-${r}: var(--pokestra-type-${t}-${r});`)].join('\n'))
    .join('\n')}
}
`
writeFileSync(new URL('../src/type-colors.css', import.meta.url), css)

// Tailwind 가 찾을 수 있도록 클래스 이름을 글자 그대로 둔다
const cls = `// 생성 파일: node scripts/type-colors.mjs (직접 수정 금지).
// 타입 slug → 타입 색 유틸리티 클래스 (src/type-colors.css 브리지, 값은 pokestra 테마 토큰).
export type TypeColorClasses = {
    /** 배지 배경 */ bg: string
    /** 배지 배경 위 글자 */ on: string
    /** 옅은 타입 면 */ subtle: string
    /** 타입 색 테두리 */ border: string
    /** 면 위 타입 글자색 */ text: string
    /** SVG 채움: 진한 타입 색(테두리 단계). 차트 막대처럼 옅은 트랙 위에서 구분돼야 할 때 (노말·전기 등 밝은 타입 포함) */ fill: string
}

export const TYPE_COLOR_CLASSES: Record<string, TypeColorClasses> = {
${Object.keys(out)
    .map((t) => `    ${t}: { bg: 'bg-type-${t}', on: 'text-type-${t}-on', subtle: 'bg-type-${t}-subtle', border: 'border-type-${t}-border', text: 'text-type-${t}-text', fill: 'fill-type-${t}-border' },`)
    .join('\n')}
}
`
writeFileSync(new URL('../src/lib/typeColorClasses.ts', import.meta.url), cls)
