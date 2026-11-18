/** WCAG 2.x 상대 휘도·대비 (#rrggbb). 타입 색 토큰 검사용. */
export function relativeLuminance(hex: string): number {
    const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
    const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
}

/** 'light-dark(#aaa, #bbb)' 또는 '#aaa' → [light, dark] */
export function splitLightDark(value: string): [string, string] {
    const m = /^light-dark\(\s*(#[0-9a-f]{6})\s*,\s*(#[0-9a-f]{6})\s*\)$/i.exec(value.trim())
    if (m) return [m[1].toLowerCase(), m[2].toLowerCase()]
    return [value.trim().toLowerCase(), value.trim().toLowerCase()]
}
