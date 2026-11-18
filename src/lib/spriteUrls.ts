// 의존성 없는 PokeAPI 스프라이트 URL 빌더 (단일 출처).
const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'

export const artworkUrl = (id: number, shiny = false): string =>
    `${SPRITE_BASE}/other/official-artwork/${shiny ? 'shiny/' : ''}${id}.png`
export const spriteUrl = (id: number): string => `${SPRITE_BASE}/${id}.png`
export const backSpriteUrl = (id: number): string => `${SPRITE_BASE}/back/${id}.png`

export const itemIconUrl = (slug: string): string =>
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`
