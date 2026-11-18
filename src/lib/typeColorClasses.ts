// 생성 파일: node scripts/type-colors.mjs (직접 수정 금지).
// 타입 slug → 타입 색 유틸리티 클래스 (src/type-colors.css 브리지, 값은 pokestra 테마 토큰).
export type TypeColorClasses = {
    /** 배지 배경 */ bg: string
    /** 배지 배경 위 글자 */ on: string
    /** 옅은 타입 면 */ subtle: string
    /** 타입 색 테두리 */ border: string
    /** 면 위 타입 글자색 */ text: string
}

export const TYPE_COLOR_CLASSES: Record<string, TypeColorClasses> = {
    normal: { bg: 'bg-type-normal', on: 'text-type-normal-on', subtle: 'bg-type-normal-subtle', border: 'border-type-normal-border', text: 'text-type-normal-text' },
    fire: { bg: 'bg-type-fire', on: 'text-type-fire-on', subtle: 'bg-type-fire-subtle', border: 'border-type-fire-border', text: 'text-type-fire-text' },
    water: { bg: 'bg-type-water', on: 'text-type-water-on', subtle: 'bg-type-water-subtle', border: 'border-type-water-border', text: 'text-type-water-text' },
    electric: { bg: 'bg-type-electric', on: 'text-type-electric-on', subtle: 'bg-type-electric-subtle', border: 'border-type-electric-border', text: 'text-type-electric-text' },
    grass: { bg: 'bg-type-grass', on: 'text-type-grass-on', subtle: 'bg-type-grass-subtle', border: 'border-type-grass-border', text: 'text-type-grass-text' },
    ice: { bg: 'bg-type-ice', on: 'text-type-ice-on', subtle: 'bg-type-ice-subtle', border: 'border-type-ice-border', text: 'text-type-ice-text' },
    fighting: { bg: 'bg-type-fighting', on: 'text-type-fighting-on', subtle: 'bg-type-fighting-subtle', border: 'border-type-fighting-border', text: 'text-type-fighting-text' },
    poison: { bg: 'bg-type-poison', on: 'text-type-poison-on', subtle: 'bg-type-poison-subtle', border: 'border-type-poison-border', text: 'text-type-poison-text' },
    ground: { bg: 'bg-type-ground', on: 'text-type-ground-on', subtle: 'bg-type-ground-subtle', border: 'border-type-ground-border', text: 'text-type-ground-text' },
    flying: { bg: 'bg-type-flying', on: 'text-type-flying-on', subtle: 'bg-type-flying-subtle', border: 'border-type-flying-border', text: 'text-type-flying-text' },
    psychic: { bg: 'bg-type-psychic', on: 'text-type-psychic-on', subtle: 'bg-type-psychic-subtle', border: 'border-type-psychic-border', text: 'text-type-psychic-text' },
    bug: { bg: 'bg-type-bug', on: 'text-type-bug-on', subtle: 'bg-type-bug-subtle', border: 'border-type-bug-border', text: 'text-type-bug-text' },
    rock: { bg: 'bg-type-rock', on: 'text-type-rock-on', subtle: 'bg-type-rock-subtle', border: 'border-type-rock-border', text: 'text-type-rock-text' },
    ghost: { bg: 'bg-type-ghost', on: 'text-type-ghost-on', subtle: 'bg-type-ghost-subtle', border: 'border-type-ghost-border', text: 'text-type-ghost-text' },
    dragon: { bg: 'bg-type-dragon', on: 'text-type-dragon-on', subtle: 'bg-type-dragon-subtle', border: 'border-type-dragon-border', text: 'text-type-dragon-text' },
    dark: { bg: 'bg-type-dark', on: 'text-type-dark-on', subtle: 'bg-type-dark-subtle', border: 'border-type-dark-border', text: 'text-type-dark-text' },
    steel: { bg: 'bg-type-steel', on: 'text-type-steel-on', subtle: 'bg-type-steel-subtle', border: 'border-type-steel-border', text: 'text-type-steel-text' },
    fairy: { bg: 'bg-type-fairy', on: 'text-type-fairy-on', subtle: 'bg-type-fairy-subtle', border: 'border-type-fairy-border', text: 'text-type-fairy-text' },
    stellar: { bg: 'bg-type-stellar', on: 'text-type-stellar-on', subtle: 'bg-type-stellar-subtle', border: 'border-type-stellar-border', text: 'text-type-stellar-text' },
}
