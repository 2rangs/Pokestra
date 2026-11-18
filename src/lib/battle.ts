// ─── 배틀 엔진 연동 공용 모듈 ────────────────────────────────
// 도감 데이터(src/lib/dex.ts) 와 @kyasi/pokebattle-engine 을 잇는다.
import { useQuery } from '@tanstack/react-query'
import {
    preloadData, generateRandomSet, generateRandomTeam, getSpecies, koName, PRNG,
    type NameResolver, type Nature, type PokemonSet,
} from '@kyasi/pokebattle-engine'
import {
    ALL_POKEMON, MOVE_BY_NAME, TYPE_NAME_KO, findDexPokemonByName, displayNameKo, isAlternateForm,
    type DexPokemon,
    displayName as dexDisplayName, moveName as dexMoveName, abilityName as dexAbilityName,
    typeName as dexTypeName, ABILITY_BY_NAME,
} from './dex'
import natureNamesJson from '../data/natureNames.json'
import itemNamesJson from '../data/itemNames.json'
import type { Lang } from '../i18n'
import { CALC_ITEMS as ITEMS } from './calcItems'

// ─── 데이터 로드 훅 ───────────────────────────────────────────
/** 엔진 데이터(종족값/기술/상성) 로드. 첫 호출 시 지연 청크를 받아온다 */
export function useEngineReady() {
    const q = useQuery({
        queryKey: ['battle-engine-data'],
        queryFn: async () => {
            await preloadData()
            return true
        },
        staleTime: Infinity,
        gcTime: Infinity,
    })
    return { ready: q.data === true, error: q.error as Error | null }
}

// ─── 이름 (한국어) ───────────────────────────────────────────
export const prettify = (slug: string) =>
    slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

export function pokemonNameKo(species: string): string {
    const p = findDexPokemonByName(species)
    return p ? displayNameKo(p) : koName.species(species) ?? prettify(species)
}

export function moveNameKo(name: string): string {
    const m = MOVE_BY_NAME.get(name)
    return (m?.hasKoreanName ? m.nameKo : null) ?? koName.move(name) ?? m?.nameKo ?? prettify(name)
}

/** 특성 한국어 이름 (PokeAPI) */
export function abilityNameKo(slug: string): string {
    return koName.ability(slug) ?? prettify(slug)
}

export function typeNameKo(type: string): string {
    if (type === 'stellar') return '스텔라'
    if (type === 'typeless') return '???'
    return TYPE_NAME_KO[type] ?? type
}

export const NATURES: { id: Nature; ko: string; up?: string; down?: string }[] = [
    { id: 'hardy', ko: '노력' }, { id: 'lonely', ko: '외로움', up: 'attack', down: 'defense' },
    { id: 'brave', ko: '용감', up: 'attack', down: 'speed' }, { id: 'adamant', ko: '고집', up: 'attack', down: 'special_attack' },
    { id: 'naughty', ko: '개구쟁이', up: 'attack', down: 'special_defense' }, { id: 'bold', ko: '대담', up: 'defense', down: 'attack' },
    { id: 'docile', ko: '온순' }, { id: 'relaxed', ko: '무사태평', up: 'defense', down: 'speed' },
    { id: 'impish', ko: '장난꾸러기', up: 'defense', down: 'special_attack' }, { id: 'lax', ko: '촐랑', up: 'defense', down: 'special_defense' },
    { id: 'timid', ko: '겁쟁이', up: 'speed', down: 'attack' }, { id: 'hasty', ko: '성급', up: 'speed', down: 'defense' },
    { id: 'serious', ko: '성실' }, { id: 'jolly', ko: '명랑', up: 'speed', down: 'special_attack' },
    { id: 'naive', ko: '천진난만', up: 'speed', down: 'special_defense' }, { id: 'modest', ko: '조심', up: 'special_attack', down: 'attack' },
    { id: 'mild', ko: '의젓', up: 'special_attack', down: 'defense' }, { id: 'quiet', ko: '냉정', up: 'special_attack', down: 'speed' },
    { id: 'bashful', ko: '수줍음' }, { id: 'rash', ko: '덜렁', up: 'special_attack', down: 'special_defense' },
    { id: 'calm', ko: '차분', up: 'special_defense', down: 'attack' }, { id: 'gentle', ko: '얌전', up: 'special_defense', down: 'defense' },
    { id: 'sassy', ko: '건방', up: 'special_defense', down: 'speed' }, { id: 'careful', ko: '신중', up: 'special_defense', down: 'special_attack' },
    { id: 'quirky', ko: '변덕' },
]

export const BATTLE_STAT_LABEL_KO: Record<string, string> = {
    hp: 'HP', attack: '공격', defense: '방어', special_attack: '특공', special_defense: '특방', speed: '스피드',
    accuracy: '명중', evasion: '회피',
}

export { ITEMS }
export const ITEM_NAME_KO: Record<string, string> = Object.fromEntries(ITEMS.map(i => [i.id, i.ko]))

export const itemNameKo = (id: string) => ITEM_NAME_KO[id] ?? koName.item(id) ?? prettify(id)

/** formatEvent 에 넘기는 한국어 이름 변환기 */
export const KO_NAMES: NameResolver = {
    pokemon: pokemonNameKo,
    move:    moveNameKo,
    type:    typeNameKo,
    // 도구가 아니면 기술 이름일 수 있다 (예: 데미지 출처가 '잠자기')
    item:    id => ITEM_NAME_KO[id] ?? koName.item(id) ?? koName.move(id) ?? prettify(id),
    ability: abilityNameKo,
}

// ─── 세트 생성 ────────────────────────────────────────────────
/** 엔진 데이터에 있는(=배틀 가능한) 도감 포켓몬 */
export function battleReadyPokemon(includeForms = false): DexPokemon[] {
    return ALL_POKEMON.filter(p => (includeForms || !isAlternateForm(p)) && !!getSpecies(p.name) && p.moves.length > 0)
}

/** 도감 포켓몬 → 배울 수 있는 기술 안에서 추천 세트 */
export function buildSet(p: DexPokemon, rng: PRNG = new PRNG(), level = 50): PokemonSet {
    // 닉네임은 붙이지 않는다: 표시 이름은 화면에서 현재 언어로 정한다
    return generateRandomSet(p.name, { rng, level, learnset: p.moves })
}

/** 랜덤 팀 (Showdown 랜덤배틀 세트, 공정하게 레벨 통일) */
export function buildRandomTeam(seed: number, size = 6, level = 50): PokemonSet[] {
    return generateRandomTeam({ seed, size, level })
}

// ─── 타입 색 ─────────────────────────────────────────────────
export { TYPE_COLOR } from './dex'

export { artworkUrl, spriteUrl, backSpriteUrl } from './spriteUrls'

/** 종 slug → 도감 id (스프라이트용) */
export function dexIdOf(species: string): number | undefined {
    return findDexPokemonByName(species)?.id ?? getSpecies(species)?.id
}

// ─── 다국어 이름 (ko / en / ja) ──────────────────────────────

type L10n = { ko: string | null; en: string | null; ja: string | null }
const NATURE_NAMES = natureNamesJson as Record<string, L10n>
const ITEM_NAMES = itemNamesJson as Record<string, L10n>

export function pokemonNameL(species: string, lang: Lang): string {
    const p = findDexPokemonByName(species)
    if (p) return lang === 'ko' ? displayNameKo(p) : dexDisplayName(p, lang)
    if (lang === 'ko' && koName.species(species)) return koName.species(species)!
    // 도감에 없는 폼 (예: arceus-grass): 가장 긴 알려진 접두어 + 폼 라벨
    const parts = species.split('-')
    for (let i = parts.length - 1; i >= 1; i--) {
        const base = findDexPokemonByName(parts.slice(0, i).join('-'))
        if (base) {
            const baseName = lang === 'ko' ? base.nameKo : dexDisplayName(base, lang)
            return `${baseName} (${prettify(parts.slice(i).join('-'))})`
        }
    }
    return getSpecies(species)?.name ?? prettify(species)
}

export function moveNameL(name: string, lang: Lang): string {
    if (lang === 'ko') return moveNameKo(name)
    return MOVE_BY_NAME.has(name) ? dexMoveName(name, lang) : prettify(name)
}

export function abilityNameL(slug: string, lang: Lang): string {
    if (lang === 'ko') return abilityNameKo(slug)
    return ABILITY_BY_NAME.has(slug) ? dexAbilityName(slug, lang) : prettify(slug)
}

export function typeNameL(type: string, lang: Lang): string {
    if (lang === 'ko') return typeNameKo(type)
    return dexTypeName(type, lang)
}

export function itemName(id: string, lang: Lang): string {
    if (lang === 'ko') return ITEM_NAME_KO[id] ?? ITEM_NAMES[id]?.ko ?? itemNameKo(id)
    return ITEM_NAMES[id]?.[lang] ?? ITEM_NAMES[id]?.en ?? prettify(id)
}

export function natureName(id: string, lang: Lang): string {
    const n = NATURE_NAMES[id]
    if (lang === 'ko') return NATURES.find(x => x.id === id)?.ko ?? n?.ko ?? prettify(id)
    return n?.[lang] ?? n?.en ?? prettify(id)
}

export const BATTLE_STAT_LABELS: Record<Lang, Record<string, string>> = {
    ko: BATTLE_STAT_LABEL_KO,
    en: {
        hp: 'HP', attack: 'Attack', defense: 'Defense', special_attack: 'Sp. Atk', special_defense: 'Sp. Def', speed: 'Speed',
        accuracy: 'Accuracy', evasion: 'Evasion',
    },
    ja: {
        hp: 'HP', attack: 'こうげき', defense: 'ぼうぎょ', special_attack: 'とくこう', special_defense: 'とくぼう', speed: 'すばやさ',
        accuracy: 'めいちゅう', evasion: 'かいひ',
    },
}

export function battleStatLabel(key: string, lang: Lang): string {
    return BATTLE_STAT_LABELS[lang][key] ?? key
}

/** 언어별 이름 변환기 (formatEvent 등) */
export function namesFor(lang: Lang): NameResolver {
    if (lang === 'ko') return KO_NAMES
    return {
        pokemon: s => pokemonNameL(s, lang),
        move: m => moveNameL(m, lang),
        type: t => typeNameL(t, lang),
        item: id => (ITEM_NAMES[id] ? itemName(id, lang) : MOVE_BY_NAME.has(id) ? moveNameL(id, lang) : prettify(id)),
        ability: a => abilityNameL(a, lang),
    }
}
