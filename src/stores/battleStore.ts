import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { PokemonSet } from '@kyasi/pokebattle-engine'
import type { Controller } from '../pages/battle/useBattleSession'
import { stripAutoNickname } from '../lib/battleLog'

export type BattleMode = 'vs-cpu' | 'cpu-vs-cpu'

interface BattleStore {
    myTeam:     PokemonSet[]
    foeTeam:    PokemonSet[]
    foeSeed:    number
    mode:       BattleMode
    difficulty: Exclude<Controller, 'human'>
    teamSize:   number
    speed:      number
    /** HUD 의 HP 값을 % 로 볼지 (기본: 숫자) */
    hpAsPercent: boolean
    /** 울음소리 재생 (기본: 끔) */
    sound:      boolean

    setMyTeam:  (team: PokemonSet[]) => void
    updateSlot: (index: number, set: PokemonSet) => void
    removeSlot: (index: number) => void
    addSlot:    (set: PokemonSet) => void
    setFoeTeam: (team: PokemonSet[], seed: number) => void
    setMode:    (mode: BattleMode) => void
    setDifficulty: (d: Exclude<Controller, 'human'>) => void
    setTeamSize: (n: number) => void
    setSpeed:   (ms: number) => void
    setHpAsPercent: (v: boolean) => void
    setSound:   (v: boolean) => void
}

/** 자동 닉네임(예전 버전의 한국어 이름 등)은 저장하지 않는다 → 표시 언어를 따라간다 */
const clean = (team: PokemonSet[]) => team.map(stripAutoNickname)

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
            hpAsPercent: false,
            sound:      false,

            setMyTeam:  (team) => set({ myTeam: clean(team.slice(0, 6)) }),
            updateSlot: (index, s) => set(st => ({ myTeam: st.myTeam.map((x, i) => (i === index ? stripAutoNickname(s) : x)) })),
            removeSlot: (index) => set(st => ({ myTeam: st.myTeam.filter((_, i) => i !== index) })),
            addSlot:    (s) => set(st => ({ myTeam: st.myTeam.length >= 6 ? st.myTeam : [...st.myTeam, stripAutoNickname(s)] })),
            setFoeTeam: (team, seed) => set({ foeTeam: clean(team), foeSeed: seed }),
            setMode:    (mode) => set({ mode }),
            setDifficulty: (difficulty) => set({ difficulty }),
            setTeamSize: (teamSize) => set({ teamSize }),
            setSpeed:   (speed) => set({ speed }),
            setHpAsPercent: (hpAsPercent) => set({ hpAsPercent }),
            setSound:   (sound) => set({ sound }),
        }),
        {
            name: 'pokestra-battle',
            storage: safeStorage,
            version: 2,
            // v1 → v2: 세트에 저장된 자동 한국어 닉네임 제거
            migrate: (persisted, version) => {
                const st = (persisted ?? {}) as Partial<BattleStore>
                if (version < 2) {
                    if (Array.isArray(st.myTeam)) st.myTeam = clean(st.myTeam)
                    if (Array.isArray(st.foeTeam)) st.foeTeam = clean(st.foeTeam)
                }
                return st as BattleStore
            },
        },
    ),
)
