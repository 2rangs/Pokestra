import { expect, test } from 'vitest'
import { statBand, statBandFill } from './statBand'

test('구간 경계', () => {
    expect([1, 29, 30, 59, 60, 89, 90, 119, 120, 149, 150, 255].map(statBand)).toEqual([
        'very-low', 'very-low', 'low', 'low', 'mid', 'mid', 'good', 'good', 'high', 'high', 'very-high', 'very-high',
    ])
    expect(statBandFill(100)).toBe('fill-stat-4')
})
