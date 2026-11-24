/**
 * 종족값 구간 → 막대 색. 도감 사이트의 관례(PokémonDB 등)처럼 값이 낮으면 빨강, 높을수록 초록·청록.
 * 색이 "이 포켓몬의 타입"이 아니라 "이 값이 높은지"를 말하게 한다 (막대만 봐도 강점·약점이 보인다).
 */
export type StatBand = 'very-low' | 'low' | 'mid' | 'good' | 'high' | 'very-high'

/** 구간 경계(이상): 30·60·90·120·150 */
export function statBand(value: number): StatBand {
    if (value < 30) return 'very-low'
    if (value < 60) return 'low'
    if (value < 90) return 'mid'
    if (value < 120) return 'good'
    if (value < 150) return 'high'
    return 'very-high'
}

/** SVG 채움 유틸리티 (pokestra 테마 토큰 --pokestra-stat-1..6, 브리지는 src/stat-colors.css) */
export const STAT_BAND_FILL: Record<StatBand, string> = {
    'very-low': 'fill-stat-1',
    low: 'fill-stat-2',
    mid: 'fill-stat-3',
    good: 'fill-stat-4',
    high: 'fill-stat-5',
    'very-high': 'fill-stat-6',
}

export const statBandFill = (value: number): string => STAT_BAND_FILL[statBand(value)]
