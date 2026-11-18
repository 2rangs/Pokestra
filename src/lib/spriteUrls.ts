// 의존성 없는 PokeAPI 스프라이트 URL 빌더 (단일 출처).
const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'

export const artworkUrl = (id: number, shiny = false): string =>
    `${SPRITE_BASE}/other/official-artwork/${shiny ? 'shiny/' : ''}${id}.png`
export const spriteUrl = (id: number): string => `${SPRITE_BASE}/${id}.png`
export const backSpriteUrl = (id: number): string => `${SPRITE_BASE}/back/${id}.png`

// Showdown 애니메이션 배틀 스프라이트 (PokeAPI 미러)
export const animatedSpriteUrl = (id: number): string => `${SPRITE_BASE}/other/showdown/${id}.gif`
export const animatedBackSpriteUrl = (id: number): string => `${SPRITE_BASE}/other/showdown/back/${id}.gif`

/** 울음소리 (PokeAPI cries, ogg) */
export const cryUrl = (id: number): string =>
    `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`
