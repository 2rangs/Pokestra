/** PokeAPI URL에서 ID 추출 — "https://pokeapi.co/api/v2/pokemon-species/386/" → 386 */
export const getIdFromUrl = (url: string): number =>
    parseInt(url.split('/').filter(Boolean).pop()!)