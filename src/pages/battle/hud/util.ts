// ─── HUD 공용 값 (HP 비율·표시 이름·번역 훅) ─────────────────────
import { pokemonLabel } from '../../../lib/battleLog'
import { useT, type Lang } from '../../../i18n'
import { battleMessages } from '../../../i18n/messages/battle'

export type TokenColor = 'default' | 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'cyan' | 'blue' | 'purple' | 'pink' | 'gray'

export const ratioOf = (p: { hp: number; max_hp: number }) => (p.max_hp ? Math.max(0, Math.min(1, p.hp / p.max_hp)) : 0)
/** HP % (살아 있으면 최소 1%, 100% 는 가득 찼을 때만 — 399/400 은 99%) */
export const pctOf = (p: { hp: number; max_hp: number }) =>
    p.hp <= 0 ? 0 : p.hp >= p.max_hp ? 100 : Math.min(99, Math.max(1, Math.ceil(ratioOf(p) * 100)))

type Named = { species: string; nickname?: string | null; setSpecies?: string; set?: { species: string } }
export const nameOf = (p: Named, lang: Lang) => pokemonLabel(p.species, p.nickname, lang, p.setSpecies ?? p.set?.species)

export function useBattleT() {
    return useT(battleMessages)
}

/** 재생 속도 (프레임 간격 ms) */
export const SPEEDS = [
    { value: 900, label: 'speedSlow' },
    { value: 450, label: 'speedNormal' },
    { value: 180, label: 'speedFast' },
    { value: 40, label: 'speedVeryFast' },
] as const
