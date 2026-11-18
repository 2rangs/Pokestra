// ─── 배틀 세션 훅 ─────────────────────────────────────────────
// 엔진 이벤트마다 화면용 프레임을 기록하고(frames.ts), 일정 간격으로 하나씩 재생한다.
// 받아들여진 모든 행동(사람·AI)을 순서대로 기록해 리플레이 데이터로 내보낸다.
import { useCallback, useEffect, useRef, useState } from 'react'
import {
    BattleEngine,
    type Action, type BattleAI, type BattleConfig, type BattleRequest, type PlayerID,
} from '@kyasi/pokebattle-engine'
import type { Frame } from '../../lib/battleFrame'
import type { ReplayData } from '../../lib/replay'
import { attachFrameCapture, buildReplayData, controllerAI } from './frames'

export type Difficulty = 'easy' | 'normal' | 'hard'
export type Controller = 'human' | Difficulty

export type { PokeView, SideView, Frame } from '../../lib/battleFrame'
export { turnsOf } from '../../lib/battleFrame'

export { frameText } from './frames'

export interface SessionOptions {
    p1: Controller
    p2: Controller
    /** 프레임 간 간격 (ms) */
    speed: number
}

export function useBattleSession() {
    const [engine, setEngine] = useState<BattleEngine | null>(null)
    const [ais, setAis] = useState<Partial<Record<PlayerID, BattleAI>>>({})
    const framesRef = useRef<Frame[]>([])
    /** 엔진이 받아들인 행동 (사람·AI, 제출 순서) */
    const actionsRef = useRef<Action[]>([])
    const setupRef = useRef<{ config: BattleConfig; ctrl: { p1: Controller; p2: Controller } } | null>(null)
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
        actionsRef.current = []
        setupRef.current = { config, ctrl: { p1: opts.p1, p2: opts.p2 } }
        attachFrameCapture(e, f => framesRef.current.push({ ...f, index: framesRef.current.length }))
        const nextAis: Partial<Record<PlayerID, BattleAI>> = {}
        for (const p of ['p1', 'p2'] as PlayerID[]) {
            const c = opts[p]
            if (c !== 'human') nextAis[p] = controllerAI(c, config.seed ?? 0, p)
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
            actionsRef.current.push(action)
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
                if (!action) continue
                e.submitAction(action)
                actionsRef.current.push(action)
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

    /** 지금까지의 리플레이 데이터 (배틀 전이면 null) */
    const replayData = useCallback((): ReplayData | null => {
        const setup = setupRef.current
        return setup ? buildReplayData(setup.config, setup.ctrl, actionsRef.current) : null
    }, [])

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
        replayData,
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
