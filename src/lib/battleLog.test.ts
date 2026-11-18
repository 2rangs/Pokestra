import { beforeAll, expect, test } from 'vitest'
import { BattleEngine, createAI, preloadData, loadNames, type BattleEvent, type PlayerID } from '@kyasi/pokebattle-engine'
import {
    formatBattleEvent, statusName, statusLongName, weatherName, sideConditionName, volatileName, pokemonLabel,
} from './battleLog'
import { buildRandomTeam } from './battle'

/** 고정 시드로 AI 끼리 한 판 → 이벤트와 엔진 */
function playBattle(seed: number, nickname?: string) {
    const p1 = buildRandomTeam(seed, 3)
    if (nickname) p1[0] = { ...p1[0]!, nickname }
    const e = new BattleEngine({ format: 'singles', seed, p1: { name: 'P', team: p1 }, p2: { name: 'C', team: buildRandomTeam(seed + 1, 3) } })
    const events: BattleEvent[] = []
    e.on('*', ev => events.push(ev))
    e.start()
    const ai = createAI('heuristic', seed)
    for (let n = 0; e.getState().phase !== 'ended' && n < 300; n++) {
        for (const p of ['p1', 'p2'] as PlayerID[]) if (e.getRequest(p)) e.submitAction(ai.chooseAction(e, p) ?? e.getAvailableActions(p)[0]!)
    }
    return { e, events, ctx: { getPokemon: (id: string) => e.getPokemon(id) } }
}

beforeAll(async () => {
    await preloadData()
    await loadNames('ja')
}, 60_000)

test('세 언어 모두 기술·데미지 문장을 만들고 남은 HP를 보여 준다', () => {
    const { events, ctx } = playBattle(7)
    const damage = events.find(ev => ev.type === 'damage')!
    expect(formatBattleEvent(damage, ctx, 'ko')).toMatch(/남은 HP \d+\/\d+/)
    expect(formatBattleEvent(damage, ctx, 'en')).toMatch(/\d+\/\d+ HP left/)
    expect(formatBattleEvent(damage, ctx, 'ja')).toMatch(/残りHP \d+\/\d+/)
    const move = events.find(ev => ev.type === 'move_use')!
    for (const lang of ['ko', 'en', 'ja'] as const) expect(formatBattleEvent(move, ctx, lang)).toBeTruthy()
})

test('보여 줄 필요 없는 이벤트는 언어와 무관하게 null', () => {
    const { events, ctx } = playBattle(42)
    for (const ev of events) {
        const nulls = (['ko', 'en', 'ja'] as const).map(l => formatBattleEvent(ev, ctx, l) === null)
        expect(new Set(nulls).size).toBe(1)
    }
})

test('자동 닉네임(한국어 종 이름)은 현재 언어의 종 이름으로 바뀐다', () => {
    const team = buildRandomTeam(3, 1)
    const species = team[0]!.species
    const koLabel = pokemonLabel(species, null, 'ko')
    const enLabel = pokemonLabel(species, null, 'en')
    const { events, ctx } = playBattle(3, koLabel)
    const sw = events.find(ev => ev.type === 'switch' && ev.player === 'p1')!
    expect(formatBattleEvent(sw, ctx, 'en')).toContain(enLabel)
    expect(formatBattleEvent(sw, ctx, 'en')).not.toContain(koLabel)
})

test('직접 붙인 닉네임은 그대로', () => {
    const { events, ctx } = playBattle(3, 'Sparky')
    const sw = events.find(ev => ev.type === 'switch' && ev.player === 'p1')!
    for (const lang of ['ko', 'en', 'ja'] as const) expect(formatBattleEvent(sw, ctx, lang)).toContain('Sparky')
})

test('관전 모드 진영 이름', () => {
    const { events, ctx } = playBattle(9)
    const end = events.find(ev => ev.type === 'battle_end')!
    const named = { ...ctx, sideName: (p: PlayerID) => (p === 'p1' ? 'CPU 1' : 'CPU 2') }
    expect(formatBattleEvent(end, named, 'ko')).toMatch(/CPU [12]/)
    // 같은 언어라도 진영 이름 없는 포매터와 섞이지 않는다
    expect(formatBattleEvent(end, ctx, 'ko')).not.toMatch(/CPU [12]/)
})

test('칩·툴팁용 이름', () => {
    expect(statusName('burn', 'en')).toBe('BRN')
    expect(statusName('burn', 'ko')).toBe('화상')
    expect(statusLongName('paralysis', 'en')).toBe('Paralysis')
    expect(weatherName('sandstorm', 'ja')).toBe('すなあらし')
    expect(sideConditionName('stealth_rock', 'ko')).toBe('스텔스록')
    expect(sideConditionName('stealth_rock', 'en')).toBe('Stealth Rock')
    expect(volatileName('taunt', 'ja')).toBe('ちょうはつ')
    expect(volatileName('confusion', 'ko')).toBe('혼란')
    expect(volatileName('protect_streak', 'ko')).toBeNull()
})
