// 의존성 없는 PokeAPI 스프라이트 URL 빌더 (단일 출처).
const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'

export const artworkUrl = (id: number, shiny = false): string =>
    `${SPRITE_BASE}/other/official-artwork/${shiny ? 'shiny/' : ''}${id}.png`
export const spriteUrl = (id: number): string => `${SPRITE_BASE}/${id}.png`
export const backSpriteUrl = (id: number): string => `${SPRITE_BASE}/back/${id}.png`

/**
 * PC 박스 아이콘(미니 포켓몬) 후보: [SV 아이콘, 7세대 아이콘].
 * SV 는 1–1025 및 일부 폼, 7세대는 10034 같은 폼 id 도 가진다. 도트처럼 픽셀 렌더링한다.
 */
export const boxIconUrls = (id: number): string[] => [
    `${SPRITE_BASE}/versions/generation-ix/scarlet-violet/icons/${id}.png`,
    `${SPRITE_BASE}/versions/generation-vii/icons/${id}.png`,
]

export const itemIconUrl = (slug: string): string =>
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`
