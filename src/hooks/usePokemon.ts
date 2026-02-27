import { useQuery } from '@tanstack/react-query'
import { api } from '../common/api'

// ── 타입 정의 ──

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

export interface PokemonDetail {
    id: number
    name: string
    species: { name: string; url: string }
    types: { type: { name: string } }[]
    sprites: {
        front_default: string
        other: {
            'official-artwork': { front_default: string }
        }
    }
    stats: { base_stat: number; stat: { name: string } }[]
    abilities: { ability: { name: string }; is_hidden: boolean }[]
    height: number
    weight: number
}

export interface PokemonSpecies {
    id: number
    name: string
    names: { language: { name: string }; name: string }[]
    genera: { genus: string; language: { name: string } }[]
    flavor_text_entries: {
        flavor_text: string
        language: { name: string }
        version: { name: string }
    }[]
    evolution_chain: { url: string }
    varieties: {
        is_default: boolean
        pokemon: { name: string; url: string }
    }[]
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
        queryFn: () => api.get<PokemonListResult>('pokemon?limit=1302'),
        staleTime: Infinity,
    })

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

export const usePokemonDetail = (name: string) =>
    useQuery({
        queryKey: ['pokemon', name],
        queryFn: () => api.get<PokemonDetail>(`pokemon/${name}`),
        enabled: !!name,
        staleTime: Infinity,
    })

/** 포켓몬 종 정보 — 도감번호(speciesId)로 조회 */
export const usePokemonSpecies = (speciesId: number | undefined) =>
    useQuery({
        queryKey: ['pokemon-species', speciesId],
        queryFn: () => api.get<PokemonSpecies>(`pokemon-species/${speciesId}`),
        enabled: !!speciesId,
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