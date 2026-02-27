import type { PokemonDetail } from '../hooks/usePokemon'

/** PokeAPI URL에서 ID 추출 */
export const getIdFromUrl = (url: string): number =>
    parseInt(url.split('/').filter(Boolean).pop()!)

/** 공식 아트워크 우선, 없으면 기본 스프라이트 fallback */
export const getArtwork = (pokemon: PokemonDetail): string =>
    pokemon.sprites.other['official-artwork'].front_default
    || pokemon.sprites.front_default