import { expect, test } from 'vitest'
import type { BattleEvent } from '@kyasi/pokebattle-engine'
import { effectivenessLabel, effectivenessTone, fieldItems, groupLogByTurn, koLabel, logTone, stageFactor, stageMultiplier } from './battleHud'
import { turnsOf, type Frame, type SideView } from './battleFrame'

test('koLabel: 확정/난수 n타, 세 언어', () => {
    expect(koLabel({ koChance: 1, koHits: 2 }, 'ko')).toBe('확정 2타')
    expect(koLabel({ koChance: 0.438, koHits: 1 }, 'ko')).toBe('난수 1타 (44%)')
    expect(koLabel({ koChance: 1, koHits: 2 }, 'en')).toBe('Guaranteed 2HKO')
    expect(koLabel({ koChance: 1, koHits: 1 }, 'en')).toBe('Guaranteed OHKO')
    expect(koLabel({ koChance: 0.438, koHits: 1 }, 'en')).toBe('44% chance to OHKO')
    expect(koLabel({ koChance: 1, koHits: 2 }, 'ja')).toBe('確定2発')
    expect(koLabel({ koChance: 0.438, koHits: 1 }, 'ja')).toBe('乱数1発 (44%)')
})

test('koLabel: 타수 없음·확률 0 → null, 극단 확률은 1~99%', () => {
    expect(koLabel({ koChance: 0, koHits: 0 }, 'ko')).toBeNull()
    expect(koLabel({ koChance: 1, koHits: 0 }, 'ko')).toBeNull()
    expect(koLabel({ koChance: 0, koHits: 3 }, 'ko')).toBeNull()
    expect(koLabel(null, 'ko')).toBeNull()
    expect(koLabel({ koChance: 0.001, koHits: 3 }, 'ko')).toBe('난수 3타 (1%)')
    expect(koLabel({ koChance: 0.999, koHits: 3 }, 'ko')).toBe('난수 3타 (99%)')
})

test('effectivenessLabel: 0 / 0.25 / 0.5 / 1 / 2 / 4', () => {
    expect(effectivenessLabel(0, 'ko')).toBe('효과 없음')
    expect(effectivenessLabel(0.25, 'ko')).toBe('효과 별로 (×0.25)')
    expect(effectivenessLabel(0.5, 'ko')).toBe('효과 별로 (×0.5)')
    expect(effectivenessLabel(1, 'ko')).toBeNull()
    expect(effectivenessLabel(2, 'ko')).toBe('효과 굉장 (×2)')
    expect(effectivenessLabel(4, 'ko')).toBe('효과 굉장 (×4)')
    expect(effectivenessLabel(4, 'en')).toBe('Super effective (×4)')
    expect(effectivenessLabel(0.5, 'ja')).toBe('いまひとつ (×0.5)')
    expect(effectivenessTone(0)).toBe('none')
    expect(effectivenessTone(0.25)).toBe('weak')
    expect(effectivenessTone(1)).toBe('neutral')
    expect(effectivenessTone(4)).toBe('super')
})

test('stageMultiplier: 일반 능력치 ±6, 명중·회피 ±1', () => {
    expect(stageMultiplier('attack', 0)).toBe('×1.0')
    expect(stageMultiplier('attack', 1)).toBe('×1.5')
    expect(stageMultiplier('attack', 2)).toBe('×2.0')
    expect(stageMultiplier('attack', 6)).toBe('×4.0')
    expect(stageMultiplier('defense', -1)).toBe('×0.67')
    expect(stageMultiplier('speed', -6)).toBe('×0.25')
    expect(stageMultiplier('accuracy', 1)).toBe('×1.33')
    expect(stageMultiplier('accuracy', -1)).toBe('×0.75')
    expect(stageMultiplier('evasion', 6)).toBe('×3.0')
    expect(stageMultiplier('evasion', -6)).toBe('×0.33')
    // 범위를 벗어나면 ±6 으로 자른다
    expect(stageFactor('attack', 9)).toBe(4)
})

const side = (id: 'p1' | 'p2', conditions: SideView['conditions']) => ({ id, conditions }) as unknown as SideView

test('fieldItems: 날씨 → 필드 → 전체 효과 → 상대 → 우리, 소원 제외', () => {
    const f = {
        weather: 'sandstorm', weatherTurns: 3,
        terrain: 'electric', terrainTurns: null,
        field: [{ id: 'trick_room', turns: 4 }],
        p1: side('p1', [{ id: 'reflect', layers: 1, turns: 4 }, { id: 'wish', layers: 1, turns: 1 }]),
        p2: side('p2', [{ id: 'spikes', layers: 2, turns: null }]),
    } satisfies Pick<Frame, 'weather' | 'weatherTurns' | 'terrain' | 'terrainTurns' | 'field' | 'p1' | 'p2'>
    expect(fieldItems(f)).toEqual([
        { key: 'w:sandstorm', kind: 'weather', id: 'sandstorm', turns: 3, layers: 1 },
        { key: 't:electric', kind: 'terrain', id: 'electric', turns: null, layers: 1 },
        { key: 'f:trick_room', kind: 'field', id: 'trick_room', turns: 4, layers: 1 },
        { key: 's:p2:spikes', kind: 'side', side: 'p2', id: 'spikes', turns: null, layers: 2 },
        { key: 's:p1:reflect', kind: 'side', side: 'p1', id: 'reflect', turns: 4, layers: 1 },
    ])
    expect(fieldItems({ ...f, weather: null, terrain: null, field: [], p1: side('p1', []), p2: side('p2', []) })).toEqual([])
})

test('turnsOf: 남은 턴 0 이하·없음은 null', () => {
    expect(turnsOf({ turns_remaining: 3 })).toBe(3)
    expect(turnsOf({ turns_remaining: 0 })).toBeNull()
    expect(turnsOf({ turns_remaining: Infinity })).toBeNull()
    expect(turnsOf({ turns_remaining: null })).toBeNull()
    expect(turnsOf(null)).toBeNull()
})

test('groupLogByTurn: turn_start 로 묶고 기절·급소·효과 굉장을 센다', () => {
    const fr = (es: BattleEvent[]) => es.map((event, index) => ({ index, turn: 0, event }))
    const frames = fr([
        { type: 'switch', pokemon_id: 'a', player: 'p1' } as unknown as BattleEvent,
        { type: 'turn_start', turn: 1 },
        { type: 'move_use', pokemon_id: 'a', move: 'tackle' } as unknown as BattleEvent,
        { type: 'damage', pokemon_id: 'b', amount: 10, source: 'tackle', crit: true, effectiveness: 2 },
        { type: 'faint', pokemon_id: 'b' } as unknown as BattleEvent,
        { type: 'turn_start', turn: 2 },
        { type: 'damage', pokemon_id: 'a', amount: 1, source: 'x', effectiveness: 0.5 },
    ])
    const g = groupLogByTurn(frames)
    expect(g.map(x => [x.key, x.turn, x.items.length])).toEqual([['start', 0, 1], ['t1', 1, 3], ['t5', 2, 1]])
    expect(g[1]!.summary).toEqual({ faints: 1, crits: 1, supers: 1 })
    expect(g[2]!.summary).toEqual({ faints: 0, crits: 0, supers: 0 })
    expect(groupLogByTurn([])).toEqual([])
})

test('logTone: 강조 단계', () => {
    expect(logTone({ type: 'faint', pokemon_id: 'a' } as unknown as BattleEvent)).toBe('key')
    expect(logTone({ type: 'damage', pokemon_id: 'a', amount: 1, source: 'x', crit: true })).toBe('key')
    expect(logTone({ type: 'damage', pokemon_id: 'a', amount: 1, source: 'x', effectiveness: 4 })).toBe('key')
    expect(logTone({ type: 'damage', pokemon_id: 'a', amount: 1, source: 'x', effectiveness: 0.5 })).toBe('dim')
    expect(logTone({ type: 'damage', pokemon_id: 'a', amount: 1, source: 'x' })).toBe('normal')
    expect(logTone({ type: 'battle_end' } as unknown as BattleEvent)).toBe('accent')
    expect(logTone({ type: 'terastallize' } as unknown as BattleEvent)).toBe('accent')
    expect(logTone({ type: 'move_use' } as unknown as BattleEvent)).toBe('move')
})
