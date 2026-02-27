import { create } from 'zustand'

interface PokedexState {
    nameSearch: string
    moveSearch: string
    selectedType: string | null
    selectedGenerations: number[]
    selectedEggGroup: string | null
    page: number

    setNameSearch: (v: string) => void
    setMoveSearch: (v: string) => void
    setSelectedType: (v: string | null) => void
    toggleGeneration: (id: number) => void
    setSelectedEggGroup: (v: string | null) => void
    setPage: (v: number) => void
    resetFilters: () => void
}

export const usePokedexStore = create<PokedexState>((set) => ({
    nameSearch: '',
    moveSearch: '',
    selectedType: null,
    selectedGenerations: [],
    selectedEggGroup: null,
    page: 1,

    setNameSearch: (v) => set({ nameSearch: v, page: 1 }),
    setMoveSearch: (v) => set({ moveSearch: v, page: 1 }),
    setSelectedType: (v) => set({ selectedType: v, page: 1 }),
    toggleGeneration: (id) =>
        set((s) => ({
            selectedGenerations: s.selectedGenerations.includes(id)
                ? s.selectedGenerations.filter((g) => g !== id)
                : [...s.selectedGenerations, id],
            page: 1,
        })),
    setSelectedEggGroup: (v) => set({ selectedEggGroup: v, page: 1 }),
    setPage: (v) => set({ page: v }),
    resetFilters: () =>
        set({
            moveSearch: '',
            selectedType: null,
            selectedGenerations: [],
            selectedEggGroup: null,
            page: 1,
        }),
}))