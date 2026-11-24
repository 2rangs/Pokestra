import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/** 화면 모드: 기기 설정(system) · 밝게 · 어둡게. localStorage 에 저장 */
export const COLOR_MODES = ['system', 'light', 'dark'] as const
export type ColorMode = (typeof COLOR_MODES)[number]

interface ColorModeState {
    mode: ColorMode
    setMode: (mode: ColorMode) => void
}

export const useColorModeStore = create<ColorModeState>()(
    persist(
        (set) => ({
            mode: 'system',
            setMode: (mode) => set({ mode }),
        }),
        {
            name: 'pokestra-color-mode',
            version: 1,
            storage: createJSONStorage(() => localStorage),
        },
    ),
)
