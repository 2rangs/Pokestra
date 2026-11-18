// ─── 데미지 계산기 상태/계산 헬퍼 ──────────────────────────────
import {
    PRNG, applyStage, calculateDamage, toCalcPokemon, getMove, getSpecies,
    type BattlePokemon, type CalcPokemonInput, type DamageResult, type MoveData, type Nature, type PokemonSet,
    type PrimaryStatus, type Stats, type Terrain, type Weather,
} from '@kyasi/pokebattle-engine'
import { buildSet } from '../../lib/battle'
import { findDexPokemonByName, type DexPokemon } from '../../lib/dex'
import { formatNumber, translate, type Lang } from '../../i18n'
import { calcMessages } from '../../i18n/messages/calc'

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

/** 선택지 (라벨은 calcMessages 의 `weather_*` / `terrain_*` / `status_*` 키) */
export const WEATHER_IDS = ['sun', 'rain', 'sandstorm', 'snow'] as const satisfies readonly NonNullable<Weather>[]
export const TERRAIN_IDS = ['electric', 'grassy', 'misty', 'psychic'] as const satisfies readonly NonNullable<Terrain>[]
export const STATUS_IDS = ['burn', 'poison', 'toxic', 'paralysis', 'sleep', 'freeze'] as const satisfies readonly NonNullable<PrimaryStatus>[]

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

export function initSideBySlug(slug: string | null, fallback: string, item?: string | null): SideState | null {
    const p = (slug && findDexPokemonByName(slug)) || findDexPokemonByName(fallback)
    if (!p || !getSpecies(p.name)) return null
    const side = initSide(p)
    return item ? { ...side, item } : side
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

/** 계산기 입력 (@smogon/calc) */
export function toCalcInput(s: SideState): CalcPokemonInput {
    return {
        species: s.slug,
        level: s.level,
        nature: s.nature,
        ability: s.ability,
        item: s.item || null,
        evs: s.evs,
        ivs: s.ivs,
        boosts: s.stages,
        status: s.status,
        hpPercent: s.hpPct,
        teraType: s.teraType,
        terastallized: s.tera,
    }
}

/** 화면 표시용 포켓몬 정보 (실능치는 Showdown 계산기와 동일) */
export function toBattlePokemon(s: SideState, id: string): BattlePokemon {
    const cp = toCalcPokemon({ ...toCalcInput(s), boosts: {} })
    const maxHp = cp.maxHP()
    const types = s.tera && s.teraType && s.teraType !== 'stellar'
        ? [s.teraType]
        : cp.types.map(t => t.toLowerCase())
    return {
        id,
        species: s.slug,
        level: s.level,
        types: types as BattlePokemon['types'],
        stats: {
            hp: maxHp, attack: cp.rawStats.atk, defense: cp.rawStats.def,
            special_attack: cp.rawStats.spa, special_defense: cp.rawStats.spd, speed: cp.rawStats.spe,
        },
        max_hp: maxHp,
        hp: Math.max(1, Math.floor(maxHp * s.hpPct / 100)),
        stages: { ...s.stages, accuracy: 0, evasion: 0 },
        status: s.status,
        ability: s.ability,
        item: s.item || null,
    } as unknown as BattlePokemon
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

export interface MoveSummary {
    min: number
    max: number
    range: number[]
    /** 현재 HP 대비 비율 */
    minRatio: number
    maxRatio: number
    /** 데미지가 0 */
    noDamage: boolean
    /** KO 까지 타수 (0 = 계산 범위 밖) */
    koHits: number
    /** koHits 타 안에 KO 될 확률 (0~1) */
    koProb: number
    /** 'guaranteed' = 확정, 'rng' = 난수, 'impossible' = 범위 밖/데미지 없음 */
    koChance: 'guaranteed' | 'rng' | 'impossible'
}

export interface MoveCalc {
    slug: string
    move: MoveData
    summary: MoveSummary
    detail: DamageResult
}

export function calcMove(attacker: SideState, defender: SideState, slug: string, field: FieldState): MoveCalc | null {
    const move = getMove(slug)
    if (!move) return null
    let r: DamageResult
    try {
        r = calculateDamage(toCalcInput(attacker), toCalcInput(defender), slug, {
            weather: field.weather,
            terrain: field.terrain,
            isCrit: field.crit,
            reflect: field.reflect,
            lightScreen: field.lightScreen,
            auroraVeil: field.auroraVeil,
            gravity: field.gravity,
        })
    } catch {
        return null
    }
    const hp = Math.max(1, r.defenderHP)
    const noDamage = r.max <= 0
    const koChance: MoveSummary['koChance'] = noDamage || !r.koHits || r.koChance <= 0
        ? 'impossible'
        : r.koChance >= 1 ? 'guaranteed' : 'rng'
    return {
        slug,
        move,
        summary: {
            min: r.min, max: r.max, range: r.range, minRatio: r.min / hp, maxRatio: r.max / hp,
            noDamage, koHits: noDamage ? 0 : r.koHits, koProb: r.koChance, koChance,
        },
        detail: r,
    }
}

// ─── 표시용 문구 ─────────────────────────────────────────────

/** 비율(0~1+) → "43.8%" (언어별 숫자 형식) */
export function pctText(ratio: number, lang: Lang): string {
    return formatNumber(ratio, lang, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

/** KO 문구: "확정 2타" / "guaranteed 2HKO" / "乱数1発 (43.8%)" */
export function koLabel(s: MoveSummary, lang: Lang): string {
    if (s.noDamage) return translate(calcMessages, 'noDamage', undefined, lang)
    if (s.koChance === 'impossible') return translate(calcMessages, 'koNone', undefined, lang)
    const vars = { n: s.koHits, hko: s.koHits === 1 ? 'OHKO' : `${s.koHits}HKO`, pct: pctText(s.koProb, lang) }
    return translate(calcMessages, s.koChance === 'guaranteed' ? 'koGuaranteed' : 'koRandom', vars, lang)
}
