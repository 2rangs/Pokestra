import { create } from 'zustand'

interface PokedexStore {
    nameSearch: string
    moveSearch: string
    selectedType: string | null
    selectedGenerations: number[]
    selectedEggGroup: string | null
    page: number
    setNameSearch: (v: string) => void
    setMoveSearch: (v: string) => void
    setSelectedType: (v: string | null) => void
    toggleGeneration: (v: number) => void
    setSelectedEggGroup: (v: string | null) => void
    setPage: (v: number) => void
}

export const usePokedexStore = create<PokedexStore>((set) => ({
    nameSearch: '',
    moveSearch: '',
    selectedType: null,
    selectedGenerations: [],
    selectedEggGroup: null,
    page: 1,
    setNameSearch: (nameSearch) => set({ nameSearch, page: 1 }),
    setMoveSearch: (moveSearch) => set({ moveSearch, page: 1 }),
    setSelectedType: (selectedType) => set({ selectedType, page: 1 }),
    toggleGeneration: (v) =>
        set((s) => ({
            selectedGenerations: s.selectedGenerations.includes(v)
                ? s.selectedGenerations.filter((g) => g !== v)
                : [...s.selectedGenerations, v],
            page: 1,
        })),
    setSelectedEggGroup: (selectedEggGroup) => set({ selectedEggGroup, page: 1 }),
    setPage: (page) => set({ page }),
}))