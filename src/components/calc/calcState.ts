// ─── 데미지 계산기 상태/계산 헬퍼 ──────────────────────────────
import {
    PRNG, applyStage, calcDamage, calcDamageSummary, createBattlePokemon, getMove, getSpecies, getTypeChart,
    type BattlePokemon, type DamageCalcResult, type DamageSummary, type MoveData, type Nature, type PokemonSet,
    type PrimaryStatus, type Stats, type Terrain, type Weather,
} from '@kyasi/pokebattle-engine'
import { buildSet } from '../../lib/battle'
import { findDexPokemonByName, type DexPokemon } from '../../lib/dex'

export const STAT_ORDER = ['hp', 'attack', 'defense', 'special_attack', 'special_defense', 'speed'] as const
export type CalcStatKey = typeof STAT_ORDER[number]
export type StageKey = Exclude<CalcStatKey, 'hp'>

export const EV_MAX = 252
export const EV_TOTAL_MAX = 510

export interface SideState {
    slug: string
    level: number
    nature: Nature
    ability: string
    item: string // '' = 없음
    teraType: string
    tera: boolean
    evs: Stats
    ivs: Stats
    stages: Record<StageKey, number>
    status: PrimaryStatus
    hpPct: number
    moves: string[]
}

export interface FieldState {
    weather: Weather
    terrain: Terrain
    reflect: boolean
    lightScreen: boolean
    auroraVeil: boolean
    crit: boolean
    gravity: boolean
}

export const DEFAULT_FIELD: FieldState = {
    weather: null, terrain: null, reflect: false, lightScreen: false, auroraVeil: false, crit: false, gravity: false,
}

export const WEATHER_OPTIONS: { id: Weather; ko: string }[] = [
    { id: null, ko: '없음' }, { id: 'sun', ko: '쾌청' }, { id: 'rain', ko: '비' },
    { id: 'sandstorm', ko: '모래바람' }, { id: 'snow', ko: '설경' },
]
export const TERRAIN_OPTIONS: { id: Terrain; ko: string }[] = [
    { id: null, ko: '없음' }, { id: 'electric', ko: '일렉트릭' }, { id: 'grassy', ko: '그래스' },
    { id: 'misty', ko: '미스트' }, { id: 'psychic', ko: '사이코' },
]
export const STATUS_OPTIONS: { id: PrimaryStatus; ko: string }[] = [
    { id: null, ko: '없음' }, { id: 'burn', ko: '화상' }, { id: 'poison', ko: '독' }, { id: 'toxic', ko: '맹독' },
    { id: 'paralysis', ko: '마비' }, { id: 'sleep', ko: '잠듦' }, { id: 'freeze', ko: '얼음' },
]

export const TERA_TYPES = [
    'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying',
    'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy', 'stellar',
]

const ZERO_STATS: Stats = { hp: 0, attack: 0, defense: 0, special_attack: 0, special_defense: 0, speed: 0 }
const MAX_IVS: Stats = { hp: 31, attack: 31, defense: 31, special_attack: 31, special_defense: 31, speed: 31 }
const ZERO_STAGES: Record<StageKey, number> = { attack: 0, defense: 0, special_attack: 0, special_defense: 0, speed: 0 }

const RECHARGE_MOVES = new Set(['hyper-beam', 'giga-impact', 'blast-burn', 'hydro-cannon', 'frenzy-plant', 'rock-wrecker', 'roar-of-time', 'prismatic-laser', 'eternabeam', 'meteor-assault'])

/** 기술이 공격기인지 (엔진 데이터 기준) */
export function isDamagingMove(slug: string): boolean {
    const m = getMove(slug)
    return !!m && m.category !== 'status'
}

/** 포켓몬이 배울 수 있는 공격기 목록 (위력 내림차순) */
export function damagingLearnset(p: DexPokemon): MoveData[] {
    const out: MoveData[] = []
    for (const slug of p.moves) {
        const m = getMove(slug)
        if (m && m.category !== 'status') out.push(m)
    }
    return out.sort((a, b) => (b.power ?? 0) - (a.power ?? 0))
}

/** 도감 포켓몬 → 계산기 초기 상태 (추천 세트 기반, dex id 시드로 결정적) */
export function initSide(p: DexPokemon, level = 50, hpPct = 100): SideState {
    const set = buildSet(p, new PRNG(p.id), level)
    const species = getSpecies(p.name)
    const stab = new Set(species?.types ?? p.types)
    // 부족한 칸은 자속/명중 가중 위력 순으로 채운다
    const score = (m: MoveData) => (m.power ?? 0) * (stab.has(m.type) ? 1.5 : 1) * (m.accuracy ?? 100) / 100
        * (RECHARGE_MOVES.has(m.name) ? 0.5 : 1)
    const pool = damagingLearnset(p).sort((a, b) => score(b) - score(a))
    const moves = set.moves.filter((m): m is string => !!m && isDamagingMove(m))
    for (const m of pool) {
        if (moves.length >= 4) break
        if (!moves.includes(m.name)) moves.push(m.name)
    }
    return {
        slug: p.name,
        level,
        nature: set.nature,
        ability: set.ability || species?.abilities[0]?.name || '',
        item: set.item ?? '',
        teraType: set.teraType ?? p.types[0] ?? 'normal',
        tera: false,
        evs: { ...ZERO_STATS, ...set.evs },
        ivs: { ...MAX_IVS, ...set.ivs },
        stages: { ...ZERO_STAGES },
        status: null,
        hpPct,
        moves,
    }
}

export function initSideBySlug(slug: string | null, fallback: string): SideState | null {
    const p = (slug && findDexPokemonByName(slug)) || findDexPokemonByName(fallback)
    if (!p || !getSpecies(p.name)) return null
    return initSide(p)
}

export function evTotal(evs: Stats): number {
    return STAT_ORDER.reduce((s, k) => s + evs[k], 0)
}

/** EV 입력값을 0..252, 4 단위, 총합 510 이하로 보정 */
export function clampEv(evs: Stats, key: CalcStatKey, value: number): number {
    const others = evTotal(evs) - evs[key]
    const cap = Math.min(EV_MAX, EV_TOTAL_MAX - others)
    const v = Math.max(0, Math.min(cap, Number.isFinite(value) ? value : 0))
    return Math.floor(v / 4) * 4
}

export function toSet(s: SideState): PokemonSet {
    const moves = s.moves.filter(Boolean)
    return {
        species: s.slug,
        level: s.level,
        gender: null,
        ability: s.ability,
        nature: s.nature,
        item: s.item || undefined,
        moves: (moves.length ? moves.slice(0, 4) : ['tackle']) as PokemonSet['moves'],
        evs: s.evs,
        ivs: s.ivs,
        teraType: s.teraType,
    }
}

/** 상태 → 엔진 BattlePokemon (랭크/상태이상/테라/현재 HP 반영) */
export function toBattlePokemon(s: SideState, id: string): BattlePokemon {
    const bp = createBattlePokemon(toSet(s), id)
    bp.stages = { ...bp.stages, ...s.stages }
    bp.status = s.status
    if (s.tera && s.teraType) {
        bp.tera_type = s.teraType
        bp.terastallized = true
        if (s.teraType !== 'stellar') bp.types = [s.teraType]
    }
    bp.hp = Math.max(1, Math.round(bp.max_hp * s.hpPct / 100))
    return bp
}

/** 랭크 적용 실능 */
export function stagedStats(bp: BattlePokemon): Stats {
    return {
        hp: bp.max_hp,
        attack: applyStage(bp.stats.attack, bp.stages.attack),
        defense: applyStage(bp.stats.defense, bp.stages.defense),
        special_attack: applyStage(bp.stats.special_attack, bp.stages.special_attack),
        special_defense: applyStage(bp.stats.special_defense, bp.stages.special_defense),
        speed: applyStage(bp.stats.speed, bp.stages.speed),
    }
}

export interface MoveCalc {
    slug: string
    move: MoveData
    summary: DamageSummary
    detail: DamageCalcResult
}

export function calcMove(attacker: BattlePokemon, defender: BattlePokemon, slug: string, field: FieldState): MoveCalc | null {
    const move = getMove(slug)
    if (!move) return null
    const input = {
        attacker, defender, move,
        weather: field.weather,
        terrain: field.terrain,
        typeChart: getTypeChart(),
        isCrit: field.crit,
        reflect: field.reflect,
        lightScreen: field.lightScreen,
        auroraVeil: field.auroraVeil,
        gravity: field.gravity,
    }
    return { slug, move, summary: calcDamageSummary(input), detail: calcDamage(input) }
}
