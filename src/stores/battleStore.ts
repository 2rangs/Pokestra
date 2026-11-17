import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { PokemonSet } from '@kyasi/pokebattle-engine'
import type { Controller } from '../pages/battle/useBattleSession'

export type BattleMode = 'vs-cpu' | 'cpu-vs-cpu'

interface BattleStore {
    myTeam:     PokemonSet[]
    foeTeam:    PokemonSet[]
    foeSeed:    number
    mode:       BattleMode
    difficulty: Exclude<Controller, 'human'>
    teamSize:   number
    speed:      number

    setMyTeam:  (team: PokemonSet[]) => void
    updateSlot: (index: number, set: PokemonSet) => void
    removeSlot: (index: number) => void
    addSlot:    (set: PokemonSet) => void
    setFoeTeam: (team: PokemonSet[], seed: number) => void
    setMode:    (mode: BattleMode) => void
    setDifficulty: (d: Exclude<Controller, 'human'>) => void
    setTeamSize: (n: number) => void
    setSpeed:   (ms: number) => void
}

const safeStorage = createJSONStorage(() => {
    try {
        return localStorage
    } catch {
        // 저장소 접근 불가 (프라이빗 모드 등) → 메모리
        const mem = new Map<string, string>()
        return {
            getItem: (k: string) => mem.get(k) ?? null,
            setItem: (k: string, v: string) => void mem.set(k, v),
            removeItem: (k: string) => void mem.delete(k),
        }
    }
})

export const useBattleStore = create<BattleStore>()(
    persist(
        (set) => ({
            myTeam:     [],
            foeTeam:    [],
            foeSeed:    1,
            mode:       'vs-cpu',
            difficulty: 'normal',
            teamSize:   6,
            speed:      450,

            setMyTeam:  (team) => set({ myTeam: team.slice(0, 6) }),
            updateSlot: (index, s) => set(st => ({ myTeam: st.myTeam.map((x, i) => (i === index ? s : x)) })),
            removeSlot: (index) => set(st => ({ myTeam: st.myTeam.filter((_, i) => i !== index) })),
            addSlot:    (s) => set(st => ({ myTeam: st.myTeam.length >= 6 ? st.myTeam : [...st.myTeam, s] })),
            setFoeTeam: (team, seed) => set({ foeTeam: team, foeSeed: seed }),
            setMode:    (mode) => set({ mode }),
            setDifficulty: (difficulty) => set({ difficulty }),
            setTeamSize: (teamSize) => set({ teamSize }),
            setSpeed:   (speed) => set({ speed }),
        }),
        { name: 'pokestra-battle', storage: safeStorage, version: 1 },
    ),
)
