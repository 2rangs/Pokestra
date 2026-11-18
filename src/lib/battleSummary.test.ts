import { beforeAll, describe, expect, test } from 'vitest'
import { BattleEngine, preloadData, type PlayerID } from '@kyasi/pokebattle-engine'
import { buildRandomTeam } from './battle'
import type { Frame } from './battleFrame'
import { formatBattleSummary, summarizeBattle } from './battleSummary'
import { attachFrameCapture, controllerAI, engineSideNames } from '../pages/battle/frames'
import { LANGS } from '../i18n'

beforeAll(async () => {
    await preloadData()
}, 60_000)

/** 세션과 같은 방식의 CPU 대 CPU 한 판 → 프레임 */
function battleFrames(seed: number): Frame[] {
    const names = engineSideNames('normal', 'normal')
    const e = new BattleEngine({
        format: 'singles', seed,
        p1: { name: names.p1, team: buildRandomTeam(seed * 3 + 1, 6) },
        p2: { name: names.p2, team: buildRandomTeam(seed * 3 + 2, 6) },
    })
    const frames: Frame[] = []
    attachFrameCapture(e, f => frames.push({ ...f, index: frames.length }))
    e.start()
    const ais = { p1: controllerAI('normal', seed, 'p1'), p2: controllerAI('normal', seed, 'p2') }
    for (let n = 0; e.getState().phase !== 'ended' && n < 500; n++) {
        for (const p of ['p1', 'p2'] as PlayerID[]) {
            if (!e.getRequest(p)) continue
            e.submitAction(ais[p].chooseAction(e, p) ?? e.getAvailableActions(p)[0]!)
        }
    }
    return frames
}

/** 상태이상이 걸린 포켓몬이 필드에 있는 프레임 (여러 시드에서 찾는다) */
function frameWithStatus(): Frame {
    for (let seed = 1; seed < 60; seed++) {
        const f = battleFrames(seed).find(x => (x.p1.active.status || x.p2.active.status) && !x.p1.active.fainted && !x.p2.active.fainted && x.event.type === 'turn_start')
        if (f) return f
    }
    throw new Error('no status frame')
}

describe('summarizeBattle', () => {
    let frame: Frame
    beforeAll(() => { frame = frameWithStatus() }, 60_000)

    test('보는 쪽이 먼저, 필드·대기·남은 수', () => {
        const s = summarizeBattle(frame)
        expect(s.turn).toBe(frame.turn)
        expect(s.perspective).toBe('p1')
        expect(s.sides.map(x => x.id)).toEqual(['p1', 'p2'])
        expect(s.sides.map(x => x.role)).toEqual(['ours', 'foe'])
        for (const side of s.sides) {
            const src = frame[side.id]
            expect(side.active.id).toBe(src.active.id)
            expect(side.active.hp).toBe(src.active.hp)
            expect(side.active.maxHp).toBe(src.active.max_hp)
            expect(side.active.item).toBe(src.active.item)
            expect(side.active.ability).toBe(src.active.ability)
            expect(side.bench).toHaveLength(src.team.length - 1)
            expect(side.bench.some(p => p.id === src.active.id)).toBe(false)
            expect(side.remaining).toBe(src.team.filter(p => !p.fainted).length)
            expect(side.total).toBe(src.team.length)
            expect(side.active.pct).toBeGreaterThanOrEqual(0)
            expect(side.active.pct).toBeLessThanOrEqual(100)
        }
        const st = s.sides.find(x => x.active.status)!
        expect(st.active.status).toBe(frame[st.id].active.status)
    })

    test('perspective p2 면 p2 가 우리 편', () => {
        const s = summarizeBattle(frame, { perspective: 'p2' })
        expect(s.sides.map(x => x.id)).toEqual(['p2', 'p1'])
        expect(s.sides[0].role).toBe('ours')
    })

    test('hideFoeExact: 상대의 정확한 HP·도구·특성·공개 전 테라를 숨긴다', () => {
        const s = summarizeBattle(frame, { hideFoeExact: true })
        const [ours, foe] = s.sides
        expect(ours.active.hp).toBe(frame.p1.active.hp)
        expect(ours.active.item).toBe(frame.p1.active.item)
        expect(foe.active.hp).toBeNull()
        expect(foe.active.maxHp).toBeNull()
        expect('item' in foe.active).toBe(false)
        expect('ability' in foe.active).toBe(false)
        if (!frame.p2.active.terastallized) expect(foe.active.tera.type).toBeNull()
        expect(foe.bench.every(p => p.hp === null && p.maxHp === null)).toBe(true)
        expect(foe.active.pct).toBe(summarizeBattle(frame).sides[1].active.pct)

        const ko = formatBattleSummary(s, 'ko')
        // 상대 줄에는 정확한 HP 가 없다
        const foeBlock = ko.split('\n\n')[2]!
        expect(foeBlock).not.toContain(`/${frame.p2.active.max_hp}`)
        expect(foeBlock).toContain(`HP ${foe.active.pct}%`)
    })

    test('세 언어 모두 글을 만든다', () => {
        const s = summarizeBattle(frame)
        const texts = LANGS.map(l => formatBattleSummary(s, l))
        for (const t of texts) {
            expect(t.split('\n').length).toBeGreaterThan(6)
            expect(t).toContain('▶')
            expect(t).toContain(`HP ${frame.p1.active.hp}/${frame.p1.active.max_hp}`)
        }
        expect(texts[0]).toContain('우리 편')
        expect(texts[1]).toContain('Your side')
        expect(texts[2]).toContain('味方')
        expect(new Set(texts).size).toBe(3)
    })

    test('sideName 으로 진영 이름을 바꾼다', () => {
        const t = formatBattleSummary(summarizeBattle(frame), 'en', { sideName: p => (p === 'p1' ? 'CPU 1' : 'CPU 2') })
        expect(t).toContain('[CPU 1]')
        expect(t).toContain('[CPU 2]')
    })
})

describe('frame capture: 상태이상 카운터', () => {
    test('맹독은 데미지 횟수, 잠듦은 잠든 턴 수를 센다', () => {
        let toxicMax = 0
        let sleptMax = 0
        for (let seed = 1; seed < 40 && (toxicMax < 2 || sleptMax < 1); seed++) {
            for (const f of battleFrames(seed)) {
                for (const p of [f.p1.active, f.p2.active]) {
                    if (p.status === 'toxic') toxicMax = Math.max(toxicMax, p.statusTurns ?? 0)
                    else if (p.status === 'sleep') sleptMax = Math.max(sleptMax, p.statusTurns ?? 0)
                    else expect(p.statusTurns).toBeNull()
                }
            }
        }
        expect(toxicMax).toBeGreaterThanOrEqual(2)
        expect(sleptMax).toBeGreaterThanOrEqual(1)
    }, 60_000)
})
