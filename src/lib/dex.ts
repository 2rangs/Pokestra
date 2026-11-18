/**
 * 로컬 번들 데이터(src/data/*.json)에 대한 타입 있는 접근자 모음.
 *
 * - 네트워크 요청 없이 도감 목록/검색/필터에 필요한 데이터를 제공한다.
 * - 모든 파생 테이블은 `/*#__PURE__*\/` 호출로 생성되므로 사용하지 않는 export는
 *   번들러가 제거할 수 있다.
 */
import pokemonJson from '../data/pokemon.json'
import typesJson from '../data/types.json'
import generationsJson from '../data/generations.json'
import movesJson from '../data/moves.json'
import eggGroupsJson from '../data/eggGroups.json'
import abilitiesJson from '../data/abilities.json'
import type { Lang } from '../i18n'
import { artworkUrl } from './spriteUrls'

// ── Types ──

export type StatKey = 'hp' | 'attack' | 'defense' | 'spAtk' | 'spDef' | 'speed'

export type DexStats = Record<StatKey, number>

export interface DexPokemon {
    /** PokeAPI pokemon id. 10000 초과는 대체 폼(메가, 리전 폼 등) */
    id: number
    /** PokeAPI slug (예: "bulbasaur", "charizard-mega-x") */
    name: string
    /** 한국어 이름. 폼의 경우 원종 이름과 같다 (폼 라벨은 `formLabel` 참고) */
    nameKo: string
    /** 영어/일본어 종 이름 */
    nameEn: string | null
    nameJa: string | null
    types: string[]
    /** 기본 스프라이트 URL. 일부 폼(토템 등)은 null */
    sprite: string | null
    spriteShiny: string | null
    stats: DexStats
    /** 특성 slug (hidden = 숨겨진 특성) */
    abilities: { name: string; hidden: boolean }[]
    /** 배울 수 있는 기술 slug 목록 */
    moves: string[]
    eggGroups: string[]
}

/** 언어별 텍스트 (데이터에 없으면 null) */
export type LocalizedText = { ko: string | null; en: string | null; ja: string | null }

export interface DexType {
    id: number
    name: string
    nameKo: string
    nameEn: string
    nameJa: string
}

export interface DexGeneration {
    id: number
    name: string
    nameKo: string
    nameEn: string
    nameJa: string
    pokemonSpecies: string[]
}

export type DamageClass = 'physical' | 'special' | 'status'

export interface DexMove {
    id: number
    name: string
    /** 한국어 이름. 원본 데이터에 없는 기술(일부 9세대 등)은 영문 이름으로 대체됨 (`hasKoreanName` 참고) */
    nameKo: string
    hasKoreanName: boolean
    nameEn: string | null
    nameJa: string | null
    type: string
    damageClass: DamageClass | string
    /** 위력/명중/PP (변화기 등은 null) */
    power: number | null
    accuracy: number | null
    pp: number | null
    priority: number
    /** 처음 등장한 세대 */
    generation: number | null
    desc: LocalizedText | null
}

export interface DexEggGroup {
    name: string
    nameKo: string
    nameEn: string
    nameJa: string
}

export interface DexAbility {
    id: number
    name: string
    nameKo: string | null
    nameEn: string | null
    nameJa: string | null
    generation: number | null
    desc: LocalizedText | null
}

// ── Raw data ──

export const ALL_POKEMON: readonly DexPokemon[] = pokemonJson as DexPokemon[]
export const TYPES: readonly DexType[] = typesJson as DexType[]
export const GENERATIONS: readonly DexGeneration[] = generationsJson as DexGeneration[]
type RawMove = Omit<DexMove, 'nameKo' | 'hasKoreanName'> & { nameKo: string | null }

export function titleCaseSlug(slug: string): string {
    return slug
        .split('-')
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
        .join(' ')
}

function buildMoves(): readonly DexMove[] {
    return (movesJson as RawMove[]).map((m) => ({
        ...m,
        nameKo: m.nameKo ?? m.nameEn ?? titleCaseSlug(m.name),
        hasKoreanName: m.nameKo != null,
    }))
}

export const MOVES: readonly DexMove[] = /*#__PURE__*/ buildMoves()
export const EGG_GROUPS: readonly DexEggGroup[] = eggGroupsJson as DexEggGroup[]
export const ABILITIES: readonly DexAbility[] = abilitiesJson as DexAbility[]

/** PokeAPI 스탯 이름 → 로컬 StatKey */
export const API_STAT_KEY: Record<string, StatKey> = {
    hp: "hp",
    attack: "attack",
    defense: "defense",
    "special-attack": "spAtk",
    "special-defense": "spDef",
    speed: "speed",
}

export const STAT_KEYS: readonly StatKey[] = ['hp', 'attack', 'defense', 'spAtk', 'spDef', 'speed']

export const STAT_LABEL_KO: Readonly<Record<StatKey, string>> = {
    hp: 'HP',
    attack: '공격',
    defense: '방어',
    spAtk: '특공',
    spDef: '특방',
    speed: '스피드',
}

/** 대체 폼 id 하한 (이 값 초과면 폼) */
export const FORM_ID_THRESHOLD = 10000

// ── Lookup tables ──

function buildById(): ReadonlyMap<number, DexPokemon> {
    return new Map(ALL_POKEMON.map((p) => [p.id, p]))
}
function buildByName(): ReadonlyMap<string, DexPokemon> {
    return new Map(ALL_POKEMON.map((p) => [p.name, p]))
}
function buildTypeNameKo(): Readonly<Record<string, string>> {
    return Object.fromEntries(TYPES.map((t) => [t.name, t.nameKo]))
}
function buildMoveByName(): ReadonlyMap<string, DexMove> {
    return new Map(MOVES.map((m) => [m.name, m]))
}
function buildEggGroupNameKo(): Readonly<Record<string, string>> {
    return Object.fromEntries(EGG_GROUPS.map((e) => [e.name, e.nameKo]))
}
function buildSpeciesGeneration(): ReadonlyMap<string, number> {
    const m = new Map<string, number>()
    for (const g of GENERATIONS) for (const s of g.pokemonSpecies) m.set(s, g.id)
    return m
}

const POKEMON_BY_ID = /*#__PURE__*/ buildById()
const POKEMON_BY_NAME = /*#__PURE__*/ buildByName()

/** 타입 slug → 한국어 이름 (예: fire → 불꽃) */
export const TYPE_NAME_KO = /*#__PURE__*/ buildTypeNameKo()

/** 기술 slug → 기술 정보 (nameKo 포함) */
export const MOVE_BY_NAME = /*#__PURE__*/ buildMoveByName()

/** 알 그룹 slug → 한국어 이름 */
export const EGG_GROUP_NAME_KO = /*#__PURE__*/ buildEggGroupNameKo()

/** 종 slug → 세대 id */
const SPECIES_GENERATION = /*#__PURE__*/ buildSpeciesGeneration()

// ── Accessors ──

export function getDexPokemon(id: number): DexPokemon | undefined {
    return POKEMON_BY_ID.get(id)
}

export function findDexPokemonByName(slug: string): DexPokemon | undefined {
    return POKEMON_BY_NAME.get(slug.trim().toLowerCase())
}

export function isAlternateForm(p: Pick<DexPokemon, 'id'>): boolean {
    return p.id > FORM_ID_THRESHOLD
}

/**
 * 포켓몬(폼 포함)의 종 slug를 구한다.
 * 이름을 '-'로 나눈 뒤 가장 긴 접두어가 알려진 종이면 그것을 쓴다.
 * (예: "mr-mime-galar" → "mr-mime", "charizard-mega-x" → "charizard",
 *  "deoxys-normal" → "deoxys"). 못 찾으면 첫 '-' 앞부분.
 */
export function getSpeciesSlug(p: Pick<DexPokemon, 'name'>): string {
    const parts = p.name.split('-')
    for (let i = parts.length; i > 0; i--) {
        const candidate = parts.slice(0, i).join('-')
        if (SPECIES_GENERATION.has(candidate)) return candidate
    }
    return parts[0]
}

function buildSpeciesId(): ReadonlyMap<string, number> {
    const m = new Map<string, number>()
    for (const p of ALL_POKEMON) {
        if (p.id <= FORM_ID_THRESHOLD) m.set(getSpeciesSlug(p), p.id)
    }
    return m
}
const SPECIES_ID = /*#__PURE__*/ buildSpeciesId()

/** 전국도감 번호. 폼이면 원종의 번호, 못 찾으면 자기 id */
export function getSpeciesId(p: Pick<DexPokemon, 'id' | 'name'>): number {
    if (p.id <= FORM_ID_THRESHOLD) return p.id
    return SPECIES_ID.get(getSpeciesSlug(p)) ?? p.id
}

/** 세대 id (1~9). 종 목록에서 찾지 못하면 전국도감 번호 구간으로 추정 */
export function getGeneration(p: Pick<DexPokemon, 'id' | 'name'>): number {
    const fromSpecies = SPECIES_GENERATION.get(getSpeciesSlug(p))
    if (fromSpecies != null) return fromSpecies
    return generationFromNationalId(getSpeciesId(p))
}

const GEN_UPPER_BOUNDS = [151, 251, 386, 493, 649, 721, 809, 905, 1025]

function generationFromNationalId(n: number): number {
    const i = GEN_UPPER_BOUNDS.findIndex((max) => n <= max)
    return i === -1 ? GEN_UPPER_BOUNDS.length : i + 1
}

export function baseStatTotal(p: Pick<DexPokemon, 'stats'>): number {
    const s = p.stats
    return s.hp + s.attack + s.defense + s.spAtk + s.spDef + s.speed
}

// ── Form labels ──

const FORM_TOKEN_KO: Readonly<Record<string, string>> = {
    mega: '메가',
    gmax: '거다이맥스',
    alola: '알로라',
    galar: '가라르',
    hisui: '히스이',
    paldea: '팔데아',
    primal: '원시',
    origin: '오리진',
    therian: '영물',
    totem: '토템',
    eternamax: '무한다이맥스',
    female: '암컷',
    male: '수컷',
    crowned: '킹덤',
    terastal: '테라스탈',
    stellar: '스텔라',
}

/**
 * 대체 폼의 한국어 라벨 (예: "charizard-mega-x" → "메가 X", "vulpix-alola" → "알로라").
 * 사전에 없는 토큰은 영문 그대로 둔다. 기본 폼이면 null.
 */
export function formLabelKo(p: Pick<DexPokemon, 'id' | 'name'>): string | null {
    if (!isAlternateForm(p)) return null
    const species = getSpeciesSlug(p)
    const suffix = p.name.startsWith(species + '-') ? p.name.slice(species.length + 1) : p.name
    if (!suffix) return null
    return suffix
        .split('-')
        .map((t) => FORM_TOKEN_KO[t] ?? (t.length === 1 ? t.toUpperCase() : t[0].toUpperCase() + t.slice(1)))
        .join(' ')
}

/** 표시용 한국어 이름 (폼이면 "리자몽 (메가 X)") */
export function displayNameKo(p: DexPokemon): string {
    const label = formLabelKo(p)
    return label ? `${p.nameKo} (${label})` : p.nameKo
}

export function officialArtworkUrl(id: number): string {
    return artworkUrl(id)
}

// ── 다국어 이름 ──

type NamedRecord = { name: string; nameKo?: string | null; nameEn?: string | null; nameJa?: string | null }

/** 레코드의 언어별 이름. 없으면 영어 → 한국어 → slug 순으로 대체 */
export function localName(r: NamedRecord, lang: Lang): string {
    const v = lang === 'ko' ? r.nameKo : lang === 'ja' ? r.nameJa : r.nameEn
    return v || r.nameEn || r.nameKo || titleCaseSlug(r.name)
}

/** 언어별 설명 텍스트. 없으면 영어 → 한국어 → 일본어 */
export function localText(t: LocalizedText | null | undefined, lang: Lang): string | null {
    if (!t) return null
    return t[lang] ?? t.en ?? t.ko ?? t.ja ?? null
}

function buildTypeByName(): ReadonlyMap<string, DexType> {
    return new Map(TYPES.map((t) => [t.name, t]))
}
function buildEggGroupByName(): ReadonlyMap<string, DexEggGroup> {
    return new Map(EGG_GROUPS.map((e) => [e.name, e]))
}
function buildAbilityByName(): ReadonlyMap<string, DexAbility> {
    return new Map(ABILITIES.map((a) => [a.name, a]))
}
const TYPE_BY_NAME = /*#__PURE__*/ buildTypeByName()
const EGG_GROUP_BY_NAME = /*#__PURE__*/ buildEggGroupByName()
export const ABILITY_BY_NAME = /*#__PURE__*/ buildAbilityByName()

const EXTRA_TYPE_NAMES: Record<string, Record<Lang, string>> = {
    stellar: { ko: '스텔라', en: 'Stellar', ja: 'ステラ' },
    typeless: { ko: '???', en: '???', ja: '???' },
    shadow: { ko: '다크', en: 'Shadow', ja: 'ダーク' },
    unknown: { ko: '???', en: '???', ja: '???' },
}

export function typeName(slug: string, lang: Lang): string {
    const t = TYPE_BY_NAME.get(slug)
    if (t) return localName(t, lang)
    return EXTRA_TYPE_NAMES[slug]?.[lang] ?? titleCaseSlug(slug)
}

export function moveName(slug: string, lang: Lang): string {
    const m = MOVE_BY_NAME.get(slug)
    if (!m) return titleCaseSlug(slug)
    return localName({ ...m, nameKo: m.hasKoreanName ? m.nameKo : null }, lang)
}

export function abilityName(slug: string, lang: Lang): string {
    const a = ABILITY_BY_NAME.get(slug)
    return a ? localName(a, lang) : titleCaseSlug(slug)
}

export function eggGroupName(slug: string, lang: Lang): string {
    const e = EGG_GROUP_BY_NAME.get(slug)
    return e ? localName(e, lang) : titleCaseSlug(slug)
}

export function generationName(id: number, lang: Lang): string {
    if (lang === 'ko') return `${id}세대`
    if (lang === 'ja') return `第${id}世代`
    return `Gen ${id}`
}

export const STAT_LABELS: Readonly<Record<Lang, Record<StatKey, string>>> = {
    ko: STAT_LABEL_KO,
    en: { hp: 'HP', attack: 'Attack', defense: 'Defense', spAtk: 'Sp. Atk', spDef: 'Sp. Def', speed: 'Speed' },
    ja: { hp: 'HP', attack: 'こうげき', defense: 'ぼうぎょ', spAtk: 'とくこう', spDef: 'とくぼう', speed: 'すばやさ' },
}

/** 짧은 스탯 라벨 (표/차트용) */
export const STAT_SHORT_LABELS: Readonly<Record<Lang, Record<StatKey, string>>> = {
    ko: STAT_LABEL_KO,
    en: { hp: 'HP', attack: 'Atk', defense: 'Def', spAtk: 'SpA', spDef: 'SpD', speed: 'Spe' },
    ja: { hp: 'HP', attack: 'こうげき', defense: 'ぼうぎょ', spAtk: 'とくこう', spDef: 'とくぼう', speed: 'すばやさ' },
}

export function statLabel(key: StatKey, lang: Lang, short = false): string {
    return (short ? STAT_SHORT_LABELS : STAT_LABELS)[lang][key]
}

export const DAMAGE_CLASS_LABELS: Readonly<Record<Lang, Record<string, string>>> = {
    ko: { physical: '물리', special: '특수', status: '변화' },
    en: { physical: 'Physical', special: 'Special', status: 'Status' },
    ja: { physical: 'ぶつり', special: 'とくしゅ', status: 'へんか' },
}

export function damageClassName(c: string, lang: Lang): string {
    return DAMAGE_CLASS_LABELS[lang][c] ?? c
}

const FORM_TOKEN_EN: Readonly<Record<string, string>> = {
    gmax: 'Gigantamax',
    alola: 'Alolan',
    galar: 'Galarian',
    hisui: 'Hisuian',
    paldea: 'Paldean',
}

const FORM_TOKEN_JA: Readonly<Record<string, string>> = {
    mega: 'メガ',
    gmax: 'キョダイマックス',
    alola: 'アローラ',
    galar: 'ガラル',
    hisui: 'ヒスイ',
    paldea: 'パルデア',
    primal: 'ゲンシ',
    origin: 'オリジン',
    therian: 'れいじゅう',
    incarnate: 'けしん',
    totem: 'ぬし',
    eternamax: 'ムゲンダイマックス',
    female: 'メス',
    male: 'オス',
    crowned: 'おう',
    terastal: 'テラスタル',
    stellar: 'ステラ',
}

/** 대체 폼 라벨 (언어별). 기본 폼이면 null */
export function formLabel(p: Pick<DexPokemon, 'id' | 'name'>, lang: Lang): string | null {
    if (lang === 'ko') return formLabelKo(p)
    if (!isAlternateForm(p)) return null
    const species = getSpeciesSlug(p)
    const suffix = p.name.startsWith(species + '-') ? p.name.slice(species.length + 1) : p.name
    if (!suffix) return null
    const dict = lang === 'ja' ? FORM_TOKEN_JA : FORM_TOKEN_EN
    return suffix
        .split('-')
        .map((t) => dict[t] ?? (t.length === 1 ? t.toUpperCase() : t[0].toUpperCase() + t.slice(1)))
        .join(' ')
}

/** 종 이름 (폼 라벨 없이) */
export function pokemonName(p: DexPokemon, lang: Lang): string {
    return localName(p, lang)
}

/** 표시용 이름 (폼이면 "Charizard (Mega X)") */
export function displayName(p: DexPokemon, lang: Lang): string {
    const label = formLabel(p, lang)
    const base = pokemonName(p, lang)
    return label ? `${base} (${label})` : base
}

/** 검색용: 모든 언어의 이름 + slug 를 소문자로 이은 문자열 */
export function searchKey(p: DexPokemon): string {
    return [p.name, p.nameKo, p.nameEn, p.nameJa].filter(Boolean).join(' ').toLowerCase()
}

let pokemonByAbility: Map<string, DexPokemon[]> | null = null
/** 해당 특성을 가질 수 있는 포켓몬 (폼 포함) */
export function pokemonWithAbility(slug: string): readonly DexPokemon[] {
    if (!pokemonByAbility) {
        pokemonByAbility = new Map()
        for (const p of ALL_POKEMON) {
            for (const a of p.abilities ?? []) {
                const list = pokemonByAbility.get(a.name) ?? []
                list.push(p)
                pokemonByAbility.set(a.name, list)
            }
        }
    }
    return pokemonByAbility.get(slug) ?? []
}

let pokemonByMove: Map<string, DexPokemon[]> | null = null
/** 해당 기술을 배울 수 있는 포켓몬 (폼 포함) */
export function pokemonWithMove(slug: string): readonly DexPokemon[] {
    if (!pokemonByMove) {
        pokemonByMove = new Map()
        for (const p of ALL_POKEMON) {
            for (const mv of p.moves) {
                const list = pokemonByMove.get(mv) ?? []
                list.push(p)
                pokemonByMove.set(mv, list)
            }
        }
    }
    return pokemonByMove.get(slug) ?? []
}

/** 타입 slug → 대표 색 */
export const TYPE_COLOR: Record<string, string> = {
    normal: '#A0A29F', fire: '#FBA54C', water: '#4D90D5', electric: '#F4D23B', grass: '#5FBD58', ice: '#74CEC0',
    fighting: '#D3425F', poison: '#B763CF', ground: '#DA7C4D', flying: '#A1BBEC', psychic: '#FA8581', bug: '#92BC2C',
    rock: '#C9BB8A', ghost: '#5F6DBC', dragon: '#0C69C8', dark: '#595761', steel: '#5695A3', fairy: '#EE90E6',
    stellar: '#7c6cf0', typeless: '#94a3b8',
}
