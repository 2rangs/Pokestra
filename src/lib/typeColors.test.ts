import { describe, expect, test } from 'vitest'
import { resolveThemeTokens } from '@astryxdesign/core/theme/tokens'
import { pokestraTheme } from '../themes/pokestra/pokestra.js'
import '../themes/pokestra/pokestra.css'
import { contrastRatio, splitLightDark } from './contrast'
import { TYPE_COLOR_CLASSES } from './typeColorClasses'

// 실제 빌드된 테마(src/themes/pokestra)의 값을 검사한다.
const TYPES = [
    'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
    'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy', 'stellar',
] as const
const MODES = ['light', 'dark'] as const
const AA = 4.5

const local = (pokestraTheme as unknown as { localTokens: Record<string, string> }).localTokens
const tok = (type: string, role: string) => {
    const v = local[`--pokestra-type-${type}-${role}`]
    if (!v) throw new Error(`missing --pokestra-type-${type}-${role}`)
    return splitLightDark(v)
}
const sys = MODES.map((mode) => resolveThemeTokens(pokestraTheme, { mode }) as Record<string, string>)

/** 대비 표 (실패 시 메시지에 보이도록) */
function contrastReport() {
    return TYPES.flatMap((type) =>
        MODES.map((mode, i) => ({
            type,
            mode,
            badge: contrastRatio(tok(type, 'bg')[i], tok(type, 'on')[i]),
            textOnSurface: contrastRatio(tok(type, 'text')[i], sys[i]['--color-background-surface']),
            textOnBody: contrastRatio(tok(type, 'text')[i], sys[i]['--color-background-body']),
            primaryOnSubtle: contrastRatio(sys[i]['--color-text-primary'], tok(type, 'subtle')[i]),
            secondaryOnSubtle: contrastRatio(sys[i]['--color-text-secondary'], tok(type, 'subtle')[i]),
        })),
    )
}

describe('타입 색 토큰 (pokestra 테마)', () => {
    const report = contrastReport()

    test.each(report)('$type/$mode 배지 글자 대비 ≥ 4.5', (r) => {
        expect(r.badge).toBeGreaterThanOrEqual(AA)
    })
    test.each(report)('$type/$mode 타입 글자색이 surface·body 위에서 ≥ 4.5', (r) => {
        expect(r.textOnSurface).toBeGreaterThanOrEqual(AA)
        expect(r.textOnBody).toBeGreaterThanOrEqual(AA)
    })
    test.each(report)('$type/$mode 옅은 면 위 본문·보조 글자 ≥ 4.5', (r) => {
        expect(r.primaryOnSubtle).toBeGreaterThanOrEqual(AA)
        expect(r.secondaryOnSubtle).toBeGreaterThanOrEqual(AA)
    })
    test('라이트와 다크 값이 모두 있다', () => {
        for (const type of TYPES) for (const role of ['bg', 'on', 'subtle', 'border', 'text']) expect(tok(type, role)).toHaveLength(2)
    })
    test('Tailwind 클래스 맵이 모든 타입을 덮는다', () => {
        for (const type of TYPES) expect(TYPE_COLOR_CLASSES[type]?.bg).toBe(`bg-type-${type}`)
    })
    test('Token 에 color:<type> 변형이 있다', () => {
        const token = (pokestraTheme as unknown as { components: Record<string, Record<string, unknown>> }).components.token
        for (const type of TYPES) expect(token[`color:${type}`]).toBeTruthy()
    })
})
