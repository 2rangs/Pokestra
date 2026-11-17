import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type PokedexSortKey = 'id' | 'name' | 'total' | 'hp' | 'attack' | 'defense' | 'spAtk' | 'spDef' | 'speed'
export type SortDir = 'asc' | 'desc'

/** 동시에 선택할 수 있는 최대 타입 수 (선택한 타입을 모두 가진 포켓몬만 표시) */
export const MAX_SELECTED_TYPES = 2

interface PokedexFilters {
    /** 한국어/영어 이름 또는 도감번호 */
    nameSearch: string
    /** 기술 검색 입력값 */
    moveSearch: string
    /** 확정된 기술 slug (추천 목록에서 선택했거나 입력이 정확히 일치할 때) */
    selectedMove: string | null
    /** 선택된 타입 (최대 2개, AND 조건) */
    selectedTypes: string[]
    selectedGenerations: number[]
    /** 현재 UI에서는 사용하지 않음 (로컬 데이터에 알 그룹 정보가 비어 있음) */
    selectedEggGroup: string | null
    includeForms: boolean
    sortKey: PokedexSortKey
    sortDir: SortDir
    /** 불러온 페이지 수 ("더 보기"/무한 스크롤) */
    page: number
}

interface PokedexState extends PokedexFilters {
    setNameSearch: (v: string) => void
    setMoveSearch: (v: string) => void
    setSelectedMove: (slug: string | null, label?: string) => void
    toggleType: (type: string) => void
    clearTypes: () => void
    toggleGeneration: (id: number) => void
    clearGenerations: () => void
    setSelectedEggGroup: (v: string | null) => void
    setIncludeForms: (v: boolean) => void
    setSortKey: (v: PokedexSortKey) => void
    setSortDir: (v: SortDir) => void
    setPage: (v: number) => void
    resetFilters: () => void
}

const INITIAL_FILTERS: PokedexFilters = {
    nameSearch: '',
    moveSearch: '',
    selectedMove: null,
    selectedTypes: [],
    selectedGenerations: [],
    selectedEggGroup: null,
    includeForms: false,
    sortKey: 'id',
    sortDir: 'asc',
    page: 1,
}

export const usePokedexStore = create<PokedexState>()(
    persist(
        (set) => ({
            ...INITIAL_FILTERS,

            setNameSearch: (v) => set({ nameSearch: v, page: 1 }),
            setMoveSearch: (v) => set({ moveSearch: v, selectedMove: null, page: 1 }),
            setSelectedMove: (slug, label) =>
                set((s) => ({ selectedMove: slug, moveSearch: label ?? (slug ? s.moveSearch : ''), page: 1 })),
            toggleType: (type) =>
                set((s) => {
                    if (s.selectedTypes.includes(type)) {
                        return { selectedTypes: s.selectedTypes.filter((t) => t !== type), page: 1 }
                    }
                    // 최대 개수를 넘으면 가장 먼저 고른 타입을 밀어낸다
                    const next = [...s.selectedTypes, type].slice(-MAX_SELECTED_TYPES)
                    return { selectedTypes: next, page: 1 }
                }),
            clearTypes: () => set({ selectedTypes: [], page: 1 }),
            toggleGeneration: (id) =>
                set((s) => ({
                    selectedGenerations: s.selectedGenerations.includes(id)
                        ? s.selectedGenerations.filter((g) => g !== id)
                        : [...s.selectedGenerations, id].sort((a, b) => a - b),
                    page: 1,
                })),
            clearGenerations: () => set({ selectedGenerations: [], page: 1 }),
            setSelectedEggGroup: (v) => set({ selectedEggGroup: v, page: 1 }),
            setIncludeForms: (v) => set({ includeForms: v, page: 1 }),
            setSortKey: (v) => set({ sortKey: v, page: 1 }),
            setSortDir: (v) => set({ sortDir: v, page: 1 }),
            setPage: (v) => set({ page: v }),
            resetFilters: () => set({ ...INITIAL_FILTERS }),
        }),
        {
            name: 'pokestra-pokedex-filters',
            version: 1,
            storage: createJSONStorage(() => sessionStorage),
            partialize: (s): PokedexFilters => ({
                nameSearch: s.nameSearch,
                moveSearch: s.moveSearch,
                selectedMove: s.selectedMove,
                selectedTypes: s.selectedTypes,
                selectedGenerations: s.selectedGenerations,
                selectedEggGroup: s.selectedEggGroup,
                includeForms: s.includeForms,
                sortKey: s.sortKey,
                sortDir: s.sortDir,
                page: s.page,
            }),
        },
    ),
)
