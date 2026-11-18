// ─── 울음소리 ───────────────────────────────────────────────
// 교체로 나올 때와 기절할 때 울음소리. 보통 재생으로 프레임이 하나씩 보일 때만 (건너뛰기·매우 빠름은 무음).
import { useEffect, useRef } from 'react'
import { cryUrl, dexIdOf } from '../../../lib/battle'
import type { Frame } from '../useBattleSession'

/** 이 간격(ms)보다 빠른 재생에서는 소리를 내지 않는다 */
const MIN_SPEED = 180

function crySpecies(f: Frame): string | null {
    const e = f.event
    const id = e.type === 'switch' ? e.in_id : e.type === 'faint' ? e.pokemon_id : null
    if (!id) return null
    return (f.p1.team.find(p => p.id === id) ?? f.p2.team.find(p => p.id === id))?.species ?? null
}

export function useBattleCries(frame: Frame | null, enabled: boolean, speed: number) {
    const last = useRef(-1)
    useEffect(() => {
        if (!frame) return
        const prev = last.current
        last.current = frame.index
        // 한 프레임씩 나아갈 때만 (건너뛰기·처음 진입은 무음)
        if (!enabled || speed < MIN_SPEED || frame.index !== prev + 1) return
        const species = crySpecies(frame)
        const id = species && dexIdOf(species)
        if (!id || typeof Audio === 'undefined') return
        try {
            const audio = new Audio(cryUrl(id))
            audio.volume = 0.4
            audio.play()?.catch(() => {})
        } catch {
            // 오디오를 못 쓰는 환경은 무시
        }
    }, [frame, enabled, speed])
}
