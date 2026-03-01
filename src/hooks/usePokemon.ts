import { useQuery } from '@tanstack/react-query'
import { api } from '../common/api'

// ── Types ──

interface PokemonListResult {
    results: { name: string; url: string }[]
}

interface TypeResponse {
    pokemon: { pokemon: { name: string } }[]
}

interface EggGroupResponse {
    pokemon_species: { name: string }[]
}

interface MoveResponse {
    learned_by_pokemon: { name: string }[]
}

export interface PokemonMoveEntry {
    move: { name: string; url: string }
    version_group_details: {
        level_learned_at: number
        move_learn_method: { name: string }
        version_group: { name: string }
    }[]
}

export interface PokemonDetail {
    id: number
    name: string
    species: { name: string; url: string }
    types: { type: { name: string } }[]
    sprites: {
        front_default: string
        other: { 'official-artwork': { front_default: string } }
    }
    stats: { base_stat: number; stat: { name: string } }[]
    abilities: { ability: { name: string }; is_hidden: boolean }[]
    moves: PokemonMoveEntry[]
    height: number
    weight: number
}

export interface PokemonSpecies {
    id: number
    name: string
    names: { language: { name: string }; name: string }[]
    genera: { genus: string; language: { name: string } }[]
    flavor_text_entries: { flavor_text: string; language: { name: string }; version: { name: string } }[]
    evolution_chain: { url: string }
    egg_groups: { name: string; url: string }[]
    varieties: { is_default: boolean; pokemon: { name: string; url: string } }[]
}

export interface AbilityDetail {
    id: number
    name: string
    names: { language: { name: string }; name: string }[]
    flavor_text_entries: { flavor_text: string; language: { name: string }; version_group: { name: string } }[]
}

export interface MoveDetail {
    id: number
    name: string
    names: { language: { name: string }; name: string }[]
    type: { name: string }
    power: number | null
    accuracy: number | null
    pp: number | null
    damage_class: { name: string }
}

export interface EvolutionDetail {
    trigger: { name: string; url: string }
    item: { name: string } | null
    gender: number | null
    held_item: { name: string } | null
    known_move: { name: string } | null
    known_move_type: { name: string } | null
    location: { name: string } | null
    min_level: number | null
    min_happiness: number | null
    min_beauty: number | null
    min_affection: number | null
    needs_overworld_rain: boolean
    party_species: { name: string } | null
    party_type: { name: string } | null
    relative_physical_stats: number | null
    time_of_day: string
    trade_species: { name: string } | null
    turn_upside_down: boolean
}

export interface EvolutionChainLink {
    species: { name: string; url: string }
    evolution_details: EvolutionDetail[]
    evolves_to: EvolutionChainLink[]
}

export interface EvolutionChain {
    chain: EvolutionChainLink
}

// ── Hooks ──

export const useAllPokemonList = () =>
    useQuery({
        queryKey: ['pokemon-list-all'],
        queryFn: () => api.get<PokemonListResult>('pokemon?limit=1025'),
        staleTime: Infinity,
    })

export function usePokemonDetail(name: string, enabled = true) {
    return useQuery({
        queryKey: ["pokemon-detail", name],
        queryFn: async () => {
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`)
            if (!res.ok) throw new Error("Failed to fetch pokemon detail")
            return res.json()
        },
        enabled,              // ✅ inView일 때만 실행
        staleTime: 1000 * 60 * 10,
    })
}
export const usePokemonByType = (type: string | null) =>
    useQuery({
        queryKey: ['pokemon-by-type', type],
        queryFn: async () => {
            const res = await api.get<TypeResponse>(`type/${type}`)
            return new Set(res.pokemon.map((p) => p.pokemon.name))
        },
        enabled: !!type,
        staleTime: Infinity,
    })

export const usePokemonByEggGroup = (group: string | null) =>
    useQuery({
        queryKey: ['pokemon-by-egg-group', group],
        queryFn: async () => {
            const res = await api.get<EggGroupResponse>(`egg-group/${group}`)
            return new Set(res.pokemon_species.map((p) => p.name))
        },
        enabled: !!group,
        staleTime: Infinity,
    })

export const usePokemonByMove = (move: string) =>
    useQuery({
        queryKey: ['pokemon-by-move', move],
        queryFn: () => api.get<MoveResponse>(`move/${move}`),
        enabled: move.length > 2,
        staleTime: Infinity,
    })
export const usePokemonSpecies = (speciesId: number | undefined) =>
    useQuery({
        queryKey: ['pokemon-species', speciesId],
        queryFn: () => api.get<PokemonSpecies>(`pokemon-species/${speciesId}`),
        enabled: !!speciesId,
        staleTime: Infinity,
    })

/** 특성 상세 (한글 이름 포함) */
export const useAbilityDetail = (name: string) =>
    useQuery({
        queryKey: ['ability', name],
        queryFn: () => api.get<AbilityDetail>(`ability/${name}`),
        enabled: !!name,
        staleTime: Infinity,
    })

/** 기술 상세 (한글 이름, 타입, 위력 등) */
export const useMoveDetail = (name: string) =>
    useQuery({
        queryKey: ['move-detail', name],
        queryFn: () => api.get<MoveDetail>(`move/${name}`),
        enabled: !!name,
        staleTime: Infinity,
    })

export const useEvolutionChain = (url: string | undefined) =>
    useQuery({
        queryKey: ['evolution-chain', url],
        queryFn: async () => {
            const res = await fetch(url!)
            if (!res.ok) throw new Error(`API Error: ${res.status}`)
            return res.json() as Promise<EvolutionChain>
        },
        enabled: !!url,
        staleTime: Infinity,
    })