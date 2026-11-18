// 실능치 계산 (표준 공식). 엔진 없이 로컬 종족값만으로 계산한다.

export type RealStatKey = 'hp' | 'attack' | 'defense' | 'spAtk' | 'spDef' | 'speed'

/** HP: ⌊(2B + I + ⌊E/4⌋) · L / 100⌋ + L + 10. 껍질몬(종족값 1)은 항상 1 */
export function calcHp(base: number, level: number, iv: number, ev: number): number {
    if (base === 1) return 1
    return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10
}

/** HP 외: ⌊(⌊(2B + I + ⌊E/4⌋) · L / 100⌋ + 5) · 성격 보정⌋ */
export function calcStat(base: number, level: number, iv: number, ev: number, nature: number): number {
    return Math.floor((Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5) * nature)
}

export interface RealStatRange { min: number; neutral: number; max: number }

/** min: 개체값 0 / 노력치 0 / 하락 성격, neutral: 31 / 0 / 무보정, max: 31 / 252 / 상승 성격 (HP는 성격 무관) */
export function realStatRange(key: RealStatKey, base: number, level: number): RealStatRange {
    if (key === 'hp') {
        return { min: calcHp(base, level, 0, 0), neutral: calcHp(base, level, 31, 0), max: calcHp(base, level, 31, 252) }
    }
    return {
        min: calcStat(base, level, 0, 0, 0.9),
        neutral: calcStat(base, level, 31, 0, 1),
        max: calcStat(base, level, 31, 252, 1.1),
    }
}
