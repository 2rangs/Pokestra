import { beforeAll, expect, test } from 'vitest'
import { BattleEngine, createAI, exportShowdownTeam, preloadData, type Action, type PlayerID } from '@kyasi/pokebattle-engine'
import { buildRandomTeam } from './battle'
import { decodeAction, decodeReplay, encodeAction, encodeReplay, ReplayError, type ReplayData } from './replay'

beforeAll(async () => {
    await preloadData()
}, 60_000)

/** AI 끼리 6:6 한 판 → 리플레이 데이터 */
function aiReplay(seed: number): ReplayData {
    const p1 = buildRandomTeam(seed, 6)
    const p2 = buildRandomTeam(seed + 1, 6)
    const e = new BattleEngine({ format: 'singles', seed, p1: { name: 'CPU 1', team: p1 }, p2: { name: 'CPU 2', team: p2 } })
    e.start()
    const ais = { p1: createAI('strong', seed + 11), p2: createAI('heuristic', seed + 23) }
    const actions: Action[] = []
    for (let n = 0; e.getState().phase !== 'ended' && n < 500; n++) {
        for (const p of ['p1', 'p2'] as PlayerID[]) {
            if (!e.getRequest(p)) continue
            const a = ais[p].chooseAction(e, p) ?? e.getAvailableActions(p)[0]!
            e.submitAction(a)
            actions.push(a)
        }
    }
    return {
        v: 1, seed, format: 'singles',
        p1: { team: exportShowdownTeam(p1), ctrl: 'hard' },
        p2: { team: exportShowdownTeam(p2), ctrl: 'normal' },
        actions,
    }
}

test('행동 튜플: 원래 Action 객체로 정확히 돌아온다', () => {
    const cases: Action[] = [
        { type: 'move', player: 'p1', pokemon_id: 'p1_0', move_index: 2 },
        { type: 'move', player: 'p2', pokemon_id: 'p2_5', move_index: 0, terastallize: true },
        { type: 'move', player: 'p1', pokemon_id: 'p1_1', move_index: -1 },
        { type: 'move', player: 'p1', pokemon_id: 'p1_1', move_index: 1, target_id: 'p2_0', terastallize: true },
        { type: 'move', player: 'p2', pokemon_id: 'p2_2', move_index: 3, rotate: 'left' },
        { type: 'switch', player: 'p2', pokemon_id: 'p2_0', switch_to_id: 'p2_4' },
        { type: 'raw', player: 'p1', choice: 'move 1 terastallize, switch 3' },
        { type: 'raw', player: 'p2', choice: 'move 2', pokemon_id: 'p2_1' },
        { type: 'team', player: 'p1', order: ['p1_2', 'p1_0', 'p1_1'] },
        // 짧은 꼴로 표현할 수 없는 값 → 원래 객체 그대로
        { type: 'move', player: 'p1', pokemon_id: 'p1_0', move_index: 0, terastallize: false },
        { type: 'switch', player: 'p1', pokemon_id: 'weird', switch_to_id: 'p1_1' },
    ]
    for (const a of cases) {
        const t = encodeAction(a)
        expect(decodeAction(JSON.parse(JSON.stringify(t)))).toEqual(a)
    }
    expect(encodeAction(cases[0]!)).toEqual([0, 1, 0, 2, 0])
    expect(encodeAction(cases[1]!)).toEqual([0, 2, 5, 0, 1])
    expect(encodeAction(cases[5]!)).toEqual([1, 2, 0, 4])
    expect(encodeAction(cases[6]!)).toEqual([2, 1, 'move 1 terastallize, switch 3'])
    expect(encodeAction(cases[9]!)[0]).toBe(9)
})

test('encode → decode 왕복 (6:6 AI 배틀) + 링크 길이', async () => {
    const data = aiReplay(42)
    expect(data.actions.length).toBeGreaterThan(10)
    const s = await encodeReplay(data)
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(await decodeReplay(s)).toEqual(data)
    console.info(`replay: ${data.actions.length} actions → ${s.length} chars`)
    expect(s.length).toBeLessThan(3000)
})

test('doubles 형식과 raw 행동도 담을 수 있다', async () => {
    const data: ReplayData = {
        v: 1, seed: 7, format: 'doubles',
        p1: { team: 'Pikachu\n- Thunderbolt', ctrl: 'human' },
        p2: { team: 'Eevee\n- Tackle', ctrl: 'easy' },
        actions: [{ type: 'raw', player: 'p1', choice: 'move 1 2, move 2 1' }, { type: 'raw', player: 'p2', choice: 'switch 3, move 1 1' }],
    }
    expect(await decodeReplay(await encodeReplay(data))).toEqual(data)
})

test('손상된 문자열 → ReplayError(corrupt)', async () => {
    const s = await encodeReplay(aiReplay(3))
    const bad = [
        '',
        'not a replay!',
        s.slice(0, Math.floor(s.length / 2)),
        s.slice(0, 40) + (s[40] === 'A' ? 'B' : 'A') + s.slice(41),
        'AAAA',
    ]
    for (const b of bad) {
        await expect(decodeReplay(b)).rejects.toSatisfy(e => e instanceof ReplayError && e.code === 'corrupt')
    }
})

test('버전 불일치 → ReplayError(version)', async () => {
    const data = { ...aiReplay(5), v: 2 } as unknown as ReplayData
    const s = await encodeReplay(data)
    await expect(decodeReplay(s)).rejects.toSatisfy(e => e instanceof ReplayError && e.code === 'version')
})
