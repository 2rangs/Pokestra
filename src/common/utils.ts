import type { PokemonDetail } from '../hooks/usePokemon'

/** PokeAPI URL에서 ID 추출 (못 찾으면 undefined) */
export const getIdFromUrl = (url: string | null | undefined): number | undefined => {
    if (!url) return undefined
    const n = Number(url.split('/').filter(Boolean).pop())
    return Number.isFinite(n) ? n : undefined
}

/** 공식 아트워크 우선, 없으면 기본 스프라이트 fallback (둘 다 없으면 빈 문자열) */
export const getArtwork = (pokemon: PokemonDetail): string =>
    pokemon.sprites.other?.['official-artwork']?.front_default
    || pokemon.sprites.front_default
    || ''
