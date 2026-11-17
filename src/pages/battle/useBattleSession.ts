// ─── 배틀 세션 훅 ─────────────────────────────────────────────
// 엔진 이벤트마다 화면용 프레임을 기록하고, 일정 간격으로 하나씩 재생한다.
// 로그 문장은 프레임에 저장하지 않고 화면을 그릴 때 현재 언어로 만든다 (frameText).
import { useCallback, useEffect, useRef, useState } from 'react'
import {
    BattleEngine, createAI,
    type Action, type BattleAI, type BattleConfig, type BattleEvent, type BattlePokemon,
    type BattleRequest, type FormatContext, type PlayerID, type Side,
} from '@kyasi/pokebattle-engine'
import { formatBattleEvent } from '../../lib/battleLog'
import type { Lang } from '../../i18n'

export type Difficulty = 'easy' | 'normal' | 'hard'
export type Controller = 'human' | Difficulty

export interface PokeView {
    id:            string
    species:       string
    /** 세트의 원래 종 (폼 체인지 전) */
    setSpecies:    string
    nickname:      string
    level:         number
    hp:            number
    max_hp:        number
    status:        string | null
    types:         string[]
    tera_type:     string | null
    terastallized: boolean
    stages:        Record<string, number>
    item:          string | null
    ability:       string
    fainted:       boolean
    volatiles:     string[]
}

export interface SideView {
    id:         PlayerID
    name:       string
    active:     PokeView
    team:       PokeView[]
    conditions: { id: string; layers: number }[]
    usedTera:   boolean
}

export interface Frame {
    index:   number
    event:   BattleEvent
    /** 로그에 보이지 않는 이벤트 (재생 시 대기 없이 넘김) */
    silent:  boolean
    turn:    number
    p1:      SideView
    p2:      SideView
    weather: string | null
    terrain: string | null
    field:   string[]
}

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
        conditions: Object.entries(side.conditions).map(([id, c]) => ({ id, layers: c?.layers ?? 1 })),
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

export interface SessionOptions {
    p1: Controller
    p2: Controller
    /** 프레임 간 간격 (ms) */
    speed: number
}

const DIFFICULTY_AI: Record<Difficulty, 'random' | 'heuristic' | 'strong'> = {
    easy: 'random', normal: 'heuristic', hard: 'strong',
}

export function useBattleSession() {
    const [engine, setEngine] = useState<BattleEngine | null>(null)
    const [ais, setAis] = useState<Partial<Record<PlayerID, BattleAI>>>({})
    const framesRef = useRef<Frame[]>([])
    const [frames, setFrames] = useState<Frame[]>([])
    const [revealed, setRevealed] = useState(0)
    const [speed, setSpeed] = useState(450)
    const [paused, setPaused] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [version, setVersion] = useState(0)

    const allRevealed = revealed >= frames.length

    // ── 새 배틀 ──────────────────────────────────────────────
    const start = useCallback((config: BattleConfig, opts: SessionOptions) => {
        const e = new BattleEngine(config)
        framesRef.current = []
        const capture = (ev: BattleEvent) => {
            const st = e.getState()
            // 팀 등록 전(battle_start) 이벤트는 화면에 그릴 포켓몬이 없다
            if (!st.sides.p1.active[0] || !st.sides.p2.active[0]) return
            const p1 = viewSide(st.sides.p1)
            const p2 = viewSide(st.sides.p2)
            const frame: Frame = {
                index:   framesRef.current.length,
                event:   ev,
                // 숨김 여부는 언어와 무관하다
                silent:  formatBattleEvent(ev, frameContext({ p1, p2 }), 'en') === null,
                turn:    st.turn,
                p1,
                p2,
                weather: st.field.weather,
                terrain: st.field.terrain,
                field:   Object.keys(st.field.conditions),
            }
            framesRef.current.push(frame)
        }
        e.on('*', capture)
        const nextAis: Partial<Record<PlayerID, BattleAI>> = {}
        for (const p of ['p1', 'p2'] as PlayerID[]) {
            const c = opts[p]
            if (c !== 'human') nextAis[p] = createAI(DIFFICULTY_AI[c], (config.seed ?? 0) + (p === 'p1' ? 11 : 23))
        }
        setAis(nextAis)
        setEngine(e)
        setSpeed(opts.speed)
        setPaused(false)
        setError(null)
        e.start()
        setFrames([...framesRef.current])
        setRevealed(0)
        setVersion(v => v + 1)
    }, [])

    const flush = useCallback(() => {
        setFrames([...framesRef.current])
        setVersion(v => v + 1)
    }, [])

    // ── 사람 행동 제출 ───────────────────────────────────────
    const submit = useCallback((action: Action) => {
        const e = engine
        if (!e) return
        try {
            e.submitAction(action)
            setError(null)
        } catch (err) {
            setError((err as Error).message)
        }
        flush()
    }, [engine, flush])

    // ── AI 자동 행동 (화면 재생이 끝난 뒤) ─────────────────────
    useEffect(() => {
        const e = engine
        if (!e || !allRevealed || paused) return
        if (e.getState().phase === 'ended') return
        const pending = (['p1', 'p2'] as PlayerID[]).filter(p => ais[p] && e.getRequest(p))
        if (pending.length === 0) return
        const humanWaiting = (['p1', 'p2'] as PlayerID[]).some(p => !ais[p] && e.getRequest(p))
        // 사람이 고르는 중이면 AI 는 바로 제출 (사람 선택을 보지 않음)
        const delay = humanWaiting ? 0 : Math.min(400, speed)
        const t = setTimeout(() => {
            for (const p of pending) {
                if (!e.getRequest(p)) continue
                const action = ais[p]!.chooseAction(e, p) ?? e.getAvailableActions(p)[0]
                if (action) e.submitAction(action)
            }
            flush()
        }, delay)
        return () => clearTimeout(t)
    }, [engine, ais, allRevealed, paused, version, speed, flush])

    // ── 프레임 재생 ──────────────────────────────────────────
    useEffect(() => {
        if (revealed >= frames.length || paused) return
        const next = frames[revealed]!
        const t = setTimeout(() => setRevealed(r => r + 1), next.silent ? 0 : speed)
        return () => clearTimeout(t)
    }, [revealed, frames, paused, speed])

    const skip = useCallback(() => setRevealed(framesRef.current.length), [])

    const current: Frame | null = frames[Math.max(0, Math.min(revealed, frames.length) - 1)] ?? null
    const request = (player: PlayerID): BattleRequest | null =>
        engine && allRevealed && !ais[player] ? engine.getRequest(player) : null
    const state = engine?.getState()

    return {
        engine,
        frames,
        revealed,
        current,
        allRevealed,
        request,
        submit,
        start,
        skip,
        speed, setSpeed,
        paused, setPaused,
        error,
        isAI: (p: PlayerID) => !!ais[p],
        phase: state?.phase ?? null,
        winner: state?.winner ?? null,
        version,
    }
}

export type BattleSession = ReturnType<typeof useBattleSession>
