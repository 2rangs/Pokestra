// ─── 엔진 → 화면 프레임 ──────────────────────────────────────
// 엔진 이벤트마다 화면용 스냅숏을 만든다. 실시간 배틀(useBattleSession)과 리플레이(simulateReplay)가 같은 코드를 쓴다.
// 로그 문장은 프레임에 저장하지 않고 화면을 그릴 때 현재 언어로 만든다 (frameText).
import {
    BattleEngine, createAI, exportShowdownTeam, parseShowdownTeam,
    type Action, type BattleAI, type BattleConfig, type BattleEvent, type BattlePokemon, type FormatContext, type PlayerID, type Side,
} from '@kyasi/pokebattle-engine'
import { formatBattleEvent } from '../../lib/battleLog'
import { turnsOf, type Frame, type PokeView, type SideView } from '../../lib/battleFrame'
import type { ReplayController, ReplayData } from '../../lib/replay'
import type { Lang } from '../../i18n'

function viewPokemon(p: BattlePokemon): PokeView {
    const stages: Record<string, number> = {}
    for (const [k, v] of Object.entries(p.stages)) if (v !== 0) stages[k] = v
    return {
        id: p.id, species: p.species, setSpecies: p.set?.species ?? p.species, nickname: p.nickname, level: p.level,
        hp: p.hp, max_hp: p.max_hp, status: p.status, types: p.types.filter(Boolean) as string[],
        tera_type: p.tera_type ?? null, terastallized: !!p.terastallized, stages,
        item: p.item, ability: p.ability, fainted: p.fainted,
        volatiles: Object.keys(p.volatile_statuses).filter(v => v !== 'protect_streak'),
    }
}

function viewSide(side: Side): SideView {
    return {
        id: side.id,
        name: side.name ?? side.id,
        active: viewPokemon(side.active[0]!),
        team: side.team.map(viewPokemon),
        conditions: Object.entries(side.conditions).map(([id, c]) => ({ id, layers: c?.layers ?? 1, turns: turnsOf(c) })),
        usedTera: !!side.used_tera,
    }
}

/** 프레임 시점의 포켓몬 정보로 로그 포매터 컨텍스트를 만든다 */
function frameContext(f: Pick<Frame, 'p1' | 'p2'>, sideName?: (p: PlayerID) => string): FormatContext {
    return {
        getPokemon: id => {
            const p = f.p1.team.find(x => x.id === id) ?? f.p2.team.find(x => x.id === id)
            // 포매터는 species / nickname / max_hp 만 읽는다
            return p ? ({ ...p, set: { species: p.setSpecies } } as unknown as BattlePokemon) : undefined
        },
        sideName,
    }
}

/**
 * 프레임의 로그 문장 (현재 언어).
 * sideName 은 관전 모드처럼 진영 이름을 직접 보여줄 때만 넘긴다.
 */
export function frameText(f: Frame, lang: Lang, sideName?: (p: PlayerID) => string): string | null {
    return formatBattleEvent(f.event, frameContext(f, sideName), lang)
}

/** 엔진의 모든 이벤트를 프레임으로 만들어 push 한다. 엔진 start() 전에 붙인다. 떼는 함수를 돌려준다 */
export function attachFrameCapture(engine: BattleEngine, push: (frame: Omit<Frame, 'index'>) => void): () => void {
    return engine.on('*', (ev: BattleEvent) => {
        const st = engine.getState()
        // 팀 등록 전(battle_start) 이벤트는 화면에 그릴 포켓몬이 없다
        if (!st.sides.p1.active[0] || !st.sides.p2.active[0]) return
        const p1 = viewSide(st.sides.p1)
        const p2 = viewSide(st.sides.p2)
        push({
            event:   ev,
            // 숨김 여부는 언어와 무관하다
            silent:  formatBattleEvent(ev, frameContext({ p1, p2 }), 'en') === null,
            turn:    st.turn,
            p1,
            p2,
            weather: st.field.weather,
            weatherTurns: st.field.weather ? turnsOf(st.field.weather_turns) : null,
            terrain: st.field.terrain,
            terrainTurns: st.field.terrain ? turnsOf(st.field.terrain_turns) : null,
            field:   Object.entries(st.field.conditions).map(([id, c]) => ({ id, turns: turnsOf(c) })),
        })
    })
}

const DIFFICULTY_AI: Record<Exclude<ReplayController, 'human'>, 'random' | 'heuristic' | 'strong'> = {
    easy: 'random', normal: 'heuristic', hard: 'strong',
}

/** 난이도별 CPU (시드 고정: 배틀 시드 + 진영별 오프셋) */
export function controllerAI(difficulty: Exclude<ReplayController, 'human'>, battleSeed: number, player: PlayerID): BattleAI {
    return createAI(DIFFICULTY_AI[difficulty], battleSeed + (player === 'p1' ? 11 : 23))
}

/** 엔진에 넘기는 진영 이름 (화면에는 언어별 이름을 따로 그린다) */
export function engineSideNames(p1: ReplayController, p2: ReplayController): { p1: string; p2: string } {
    const spectate = p1 !== 'human' && p2 !== 'human'
    return spectate ? { p1: 'CPU 1', p2: 'CPU 2' } : { p1: 'Player', p2: 'CPU' }
}

/** 배틀 설정 + 컨트롤러 + 기록한 행동 → 리플레이 데이터 */
export function buildReplayData(
    config: BattleConfig,
    ctrl: { p1: ReplayController; p2: ReplayController },
    actions: readonly Action[],
): ReplayData {
    return {
        v: 1,
        seed: config.seed ?? 0,
        format: config.format === 'doubles' ? 'doubles' : 'singles',
        p1: { team: exportShowdownTeam(config.p1.team), ctrl: ctrl.p1 },
        p2: { team: exportShowdownTeam(config.p2.team), ctrl: ctrl.p2 },
        actions: [...actions],
    }
}

/** 리플레이 데이터 → 엔진 설정 */
export function replayConfig(data: ReplayData): BattleConfig {
    const names = engineSideNames(data.p1.ctrl, data.p2.ctrl)
    return {
        format: data.format,
        seed: data.seed,
        p1: { name: names.p1, team: parseShowdownTeam(data.p1.team) },
        p2: { name: names.p2, team: parseShowdownTeam(data.p2.team) },
    }
}

export interface SimulatedReplay {
    frames: Frame[]
    winner: PlayerID | 'draw' | null
    /** 마지막 턴 */
    turns: number
    /** mismatch: 기록한 행동을 이 엔진이 받아들이지 못했다 (재현 실패) — frames 는 멈춘 지점까지 */
    error?: 'mismatch'
    /** 받아들인 행동 수 */
    applied: number
}

/** 엔진을 새로 만들어 기록한 행동을 차례로 넣는다 (AI 는 다시 돌리지 않는다) */
export function simulateReplay(data: ReplayData): SimulatedReplay {
    const frames: Frame[] = []
    let engine: BattleEngine
    try {
        engine = new BattleEngine(replayConfig(data))
        attachFrameCapture(engine, f => frames.push({ ...f, index: frames.length }))
        engine.start()
    } catch {
        return { frames, winner: null, turns: 0, error: 'mismatch', applied: 0 }
    }
    let applied = 0
    let error: SimulatedReplay['error']
    for (const a of data.actions) {
        if (engine.getState().phase === 'ended') { error = 'mismatch'; break }
        // 싱글의 기술·교체는 그 플레이어에게 요청이 있어야 한다 (raw·team 은 엔진이 검사)
        if ((a.type === 'move' || a.type === 'switch') && data.format === 'singles' && !engine.getRequest(a.player)) {
            error = 'mismatch'
            break
        }
        try {
            engine.submitAction(a)
        } catch {
            error = 'mismatch'
            break
        }
        applied++
    }
    const st = engine.getState()
    return { frames, winner: st.winner, turns: frames.at(-1)?.turn ?? 0, error, applied }
}
