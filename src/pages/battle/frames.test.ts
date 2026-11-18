import { beforeAll, expect, test } from 'vitest'
import { BattleEngine, preloadData, type Action, type BattleConfig, type PlayerID } from '@kyasi/pokebattle-engine'
import { buildRandomTeam } from '../../lib/battle'
import type { Frame } from '../../lib/battleFrame'
import { decodeReplay, encodeReplay, type ReplayController } from '../../lib/replay'
import { attachFrameCapture, buildReplayData, controllerAI, engineSideNames, simulateReplay } from './frames'

beforeAll(async () => {
    await preloadData()
}, 60_000)

/** 세션과 같은 방식으로 한 판: 프레임 캡처 + CPU 행동 기록 */
function liveBattle(seed: number, ctrl: { p1: Exclude<ReplayController, 'human'>; p2: Exclude<ReplayController, 'human'> }, size = 6) {
    const names = engineSideNames(ctrl.p1, ctrl.p2)
    const config: BattleConfig = {
        format: 'singles', seed,
        p1: { name: names.p1, team: buildRandomTeam(seed * 3 + 1, size) },
        p2: { name: names.p2, team: buildRandomTeam(seed * 3 + 2, size) },
    }
    const e = new BattleEngine(config)
    const frames: Frame[] = []
    attachFrameCapture(e, f => frames.push({ ...f, index: frames.length }))
    e.start()
    const ais = { p1: controllerAI(ctrl.p1, seed, 'p1'), p2: controllerAI(ctrl.p2, seed, 'p2') }
    const actions: Action[] = []
    for (let n = 0; e.getState().phase !== 'ended' && n < 500; n++) {
        for (const p of ['p1', 'p2'] as PlayerID[]) {
            if (!e.getRequest(p)) continue
            const a = ais[p].chooseAction(e, p) ?? e.getAvailableActions(p)[0]!
            e.submitAction(a)
            actions.push(a)
        }
    }
    return { config, frames, actions, winner: e.getState().winner }
}

test.each([
    [101, 'hard', 'normal'],
    [202, 'normal', 'easy'],
    [303, 'easy', 'hard'],
] as const)('기록 → encode → decode → simulate 가 같은 프레임을 만든다 (seed %i)', async (seed, c1, c2) => {
    const live = liveBattle(seed, { p1: c1, p2: c2 })
    expect(live.winner).not.toBeNull()
    const data = buildReplayData(live.config, { p1: c1, p2: c2 }, live.actions)
    const replay = simulateReplay(await decodeReplay(await encodeReplay(data)))
    expect(replay.error).toBeUndefined()
    expect(replay.applied).toBe(live.actions.length)
    expect(replay.winner).toBe(live.winner)
    expect(replay.frames.map(f => f.event)).toEqual(live.frames.map(f => f.event))
    expect(replay.frames).toEqual(live.frames)
    expect(replay.turns).toBe(live.frames.at(-1)!.turn)
})

test('행동이 어긋나면 그 지점에서 멈추고 mismatch', () => {
    const live = liveBattle(404, { p1: 'normal', p2: 'normal' }, 3)
    const data = buildReplayData(live.config, { p1: 'normal', p2: 'normal' }, live.actions)
    // 첫 턴의 p1 행동을 두 번 → 두 번째는 요청이 없는 플레이어의 행동
    const broken = { ...data, actions: [data.actions[0]!, ...data.actions] }
    const r = simulateReplay(broken)
    expect(r.error).toBe('mismatch')
    expect(r.applied).toBeLessThan(broken.actions.length)
    expect(r.frames.length).toBeGreaterThan(0)
    expect(r.frames.length).toBeLessThan(live.frames.length)

    // 끝난 뒤에 남은 행동도 mismatch
    const extra = { ...data, actions: [...data.actions, data.actions.at(-1)!] }
    expect(simulateReplay(extra).error).toBe('mismatch')
})
