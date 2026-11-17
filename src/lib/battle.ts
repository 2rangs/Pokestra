// ─── 배틀 엔진 연동 공용 모듈 ────────────────────────────────
// 도감 데이터(src/lib/dex.ts) 와 @kyasi/pokebattle-engine 을 잇는다.
import { useQuery } from '@tanstack/react-query'
import {
    preloadData, generateRandomSet, generateRandomTeam, getSpecies, PRNG,
    type NameResolver, type Nature, type PokemonSet,
} from '@kyasi/pokebattle-engine'
import {
    ALL_POKEMON, MOVE_BY_NAME, TYPE_NAME_KO, findDexPokemonByName, displayNameKo, isAlternateForm,
    type DexPokemon,
} from './dex'

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
    return p ? displayNameKo(p) : prettify(species)
}

export function moveNameKo(name: string): string {
    return MOVE_BY_NAME.get(name)?.nameKo ?? prettify(name)
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

/** 엔진에 구현된 효과가 있는 도구 */
export const ITEMS: { id: string; ko: string }[] = [
    { id: 'leftovers', ko: '먹다남은음식' }, { id: 'life-orb', ko: '생명의구슬' }, { id: 'choice-band', ko: '구애머리띠' },
    { id: 'choice-specs', ko: '구애안경' }, { id: 'choice-scarf', ko: '구애스카프' }, { id: 'focus-sash', ko: '기합의띠' },
    { id: 'assault-vest', ko: '돌격조끼' }, { id: 'heavy-duty-boots', ko: '통굽부츠' }, { id: 'rocky-helmet', ko: '울퉁불퉁멧' },
    { id: 'sitrus-berry', ko: '자뭉열매' }, { id: 'lum-berry', ko: '리샘열매' }, { id: 'expert-belt', ko: '달인의띠' },
    { id: 'weakness-policy', ko: '약점보험' }, { id: 'booster-energy', ko: '부스트에너지' }, { id: 'air-balloon', ko: '풍선' },
    { id: 'light-clay', ko: '빛의점토' }, { id: 'black-sludge', ko: '검은진흙' }, { id: 'covert-cloak', ko: '은밀망토' },
    { id: 'clear-amulet', ko: '클리어참' }, { id: 'loaded-dice', ko: '속임수주사위' }, { id: 'power-herb', ko: '파워풀허브' },
    { id: 'flame-orb', ko: '화염구슬' }, { id: 'toxic-orb', ko: '맹독구슬' }, { id: 'safety-goggles', ko: '방진고글' },
    { id: 'shell-bell', ko: '조개껍질방울' }, { id: 'scope-lens', ko: '초점렌즈' }, { id: 'wide-lens', ko: '광각렌즈' },
    { id: 'quick-claw', ko: '선제공격손톱' }, { id: 'protective-pads', ko: '방호패드' }, { id: 'terrain-extender', ko: '그라운드코트' },
    { id: 'heat-rock', ko: '뜨거운바위' }, { id: 'damp-rock', ko: '축축한바위' }, { id: 'smooth-rock', ko: '보송보송바위' },
    { id: 'icy-rock', ko: '차가운바위' }, { id: 'big-root', ko: '큰뿌리' }, { id: 'binding-band', ko: '조임밴드' },
    { id: 'charcoal', ko: '목탄' }, { id: 'mystic-water', ko: '신비의물방울' }, { id: 'miracle-seed', ko: '기적의씨' },
    { id: 'magnet', ko: '자석' }, { id: 'never-melt-ice', ko: '녹지않는얼음' }, { id: 'black-belt', ko: '검은띠' },
    { id: 'poison-barb', ko: '독바늘' }, { id: 'soft-sand', ko: '부드러운모래' }, { id: 'sharp-beak', ko: '예리한부리' },
    { id: 'twisted-spoon', ko: '휘어진스푼' }, { id: 'silver-powder', ko: '은빛가루' }, { id: 'hard-stone', ko: '딱딱한돌' },
    { id: 'spell-tag', ko: '저주의부적' }, { id: 'dragon-fang', ko: '용의이빨' }, { id: 'black-glasses', ko: '검은안경' },
    { id: 'metal-coat', ko: '금속코트' }, { id: 'silk-scarf', ko: '실크스카프' }, { id: 'fairy-feather', ko: '요정의깃털' },
]
export const ITEM_NAME_KO: Record<string, string> = Object.fromEntries(ITEMS.map(i => [i.id, i.ko]))

export const itemNameKo = (id: string) => ITEM_NAME_KO[id] ?? prettify(id)

/** formatEvent 에 넘기는 한국어 이름 변환기 */
export const KO_NAMES: NameResolver = {
    pokemon: pokemonNameKo,
    move:    moveNameKo,
    type:    typeNameKo,
    // 도구가 아니면 기술 이름일 수 있다 (예: 데미지 출처가 '잠자기')
    item:    id => ITEM_NAME_KO[id] ?? MOVE_BY_NAME.get(id)?.nameKo ?? prettify(id),
    ability: prettify,
}

// ─── 세트 생성 ────────────────────────────────────────────────
/** 엔진 데이터에 있는(=배틀 가능한) 도감 포켓몬 */
export function battleReadyPokemon(includeForms = false): DexPokemon[] {
    return ALL_POKEMON.filter(p => (includeForms || !isAlternateForm(p)) && !!getSpecies(p.name) && p.moves.length > 0)
}

/** 도감 포켓몬 → 배울 수 있는 기술 안에서 추천 세트 */
export function buildSet(p: DexPokemon, rng: PRNG = new PRNG(), level = 50): PokemonSet {
    const set = generateRandomSet(p.name, { rng, level, learnset: p.moves })
    return { ...set, nickname: displayNameKo(p) }
}

/** 랜덤 팀 (도감 기술표 반영) */
export function buildRandomTeam(seed: number, size = 6, level = 50): PokemonSet[] {
    const rng = new PRNG(seed)
    const learnsets: Record<string, string[]> = {}
    for (const p of ALL_POKEMON) learnsets[p.name] = p.moves
    return generateRandomTeam({ rng, size, level, learnsets }).map(s => ({
        ...s,
        nickname: pokemonNameKo(s.species),
    }))
}

// ─── 타입 색 ─────────────────────────────────────────────────
export const TYPE_COLOR: Record<string, string> = {
    normal: '#A0A29F', fire: '#FBA54C', water: '#4D90D5', electric: '#F4D23B', grass: '#5FBD58', ice: '#74CEC0',
    fighting: '#D3425F', poison: '#B763CF', ground: '#DA7C4D', flying: '#A1BBEC', psychic: '#FA8581', bug: '#92BC2C',
    rock: '#C9BB8A', ghost: '#5F6DBC', dragon: '#0C69C8', dark: '#595761', steel: '#5695A3', fairy: '#EE90E6',
    stellar: '#7c6cf0', typeless: '#94a3b8',
}

export const artworkUrl = (id: number) =>
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
export const spriteUrl = (id: number) =>
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
export const backSpriteUrl = (id: number) =>
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${id}.png`

/** 종 slug → 도감 id (스프라이트용) */
export function dexIdOf(species: string): number | undefined {
    return findDexPokemonByName(species)?.id ?? getSpecies(species)?.id
}
