import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** 업데이트 소식: 마지막으로 본 소식 id (헤더의 "새 소식" 점). localStorage 에 저장, 막혀 있으면 이번 방문 동안만 */
interface UpdatesState {
    seen: string
    markSeen: (id: string) => void
}

export const useUpdatesStore = create<UpdatesState>()(
    persist(
        (set) => ({
            seen: '',
            markSeen: (id) => set({ seen: id }),
        }),
        { name: 'pokestra-updates-seen', version: 1, storage: createJSONStorage(() => localStorage) },
    ),
)
