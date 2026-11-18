// ─── 배틀 현황 요약 (순수 함수) ─────────────────────────────────
// 프레임 하나 → 구조화된 현황(summarizeBattle) → 현재 언어의 여러 줄 글(formatBattleSummary).
// 화면의 "현황" 창, 복사 버튼, 콘솔의 window.pokestraBattle 이 같은 값을 쓴다.
// hideFoeExact: 대전 중 상대처럼 정확한 HP·도구·특성·공개 전 테라 타입을 숨긴다 (HUD 와 같은 규칙).
import type { PlayerID } from '@kyasi/pokebattle-engine'
import { translate, type Lang, type Vars } from '../i18n'
import { battleMessages } from '../i18n/messages/battle'
import { abilityNameL, battleStatLabel, itemName, typeNameL } from './battle'
import type { Frame, PokeView, SideView } from './battleFrame'
import {
    fieldConditionName, pokemonLabel, sideConditionName, statusLongName, terrainName, volatileName, weatherName,
} from './battleLog'
import { toxicNext } from './battleStatus'

export interface SummaryPokemon {
    id:          string
    /** 종 slug (폼 체인지 후 현재 종) */
    species:     string
    setSpecies:  string
    nickname:    string
    level:       number
    /** 정확한 HP (숨기면 null) */
    hp:          number | null
    maxHp:       number | null
    /** HP % (HUD 와 같은 반올림: 살아 있으면 최소 1, 가득 찼을 때만 100) */
    pct:         number
    status:      string | null
    /** toxic: 받은 맹독 데미지 횟수, sleep: 잠든 턴 수 */
    statusTurns: number | null
    fainted:     boolean
}

export interface SummaryActive extends SummaryPokemon {
    types:     string[]
    /** 0 이 아닌 랭크 */
    stages:    Record<string, number>
    /** 화면에 보이는 휘발성 상태 (남은 턴을 알면 turns) */
    volatiles: { id: string; turns: number | null }[]
    /** type: 테라 타입 (숨기면 null), active: 지금 테라스탈 중 */
    tera:      { type: string | null; active: boolean }
    /** 숨기면 없음 */
    item?:     string | null
    ability?:  string
}

export interface SummarySide {
    id:         PlayerID
    name:       string
    /** 요약을 보는 쪽 기준: 우리 편 / 상대 편 */
    role:       'ours' | 'foe'
    active:     SummaryActive
    /** 필드에 없는 나머지 (기절 포함, 팀 순서) */
    bench:      SummaryPokemon[]
    /** 기절하지 않은 포켓몬 수 (필드 포함) */
    remaining:  number
    total:      number
    usedTera:   boolean
    conditions: { id: string; layers: number; turns: number | null }[]
}

export interface BattleSummary {
    turn:        number
    perspective: PlayerID
    weather:     { id: string; turns: number | null } | null
    terrain:     { id: string; turns: number | null } | null
    field:       { id: string; turns: number | null }[]
    /** 보는 쪽이 먼저 */
    sides:       [SummarySide, SummarySide]
}

export interface SummarizeOptions {
    /** 기준 진영 (기본 p1) */
    perspective?:  PlayerID
    /** 상대의 정확한 HP·도구·특성·공개 전 테라 타입을 숨긴다 */
    hideFoeExact?: boolean
}

/** HP % — HUD(pctOf)와 같은 규칙 */
const pctOf = (p: { hp: number; max_hp: number }) => {
    if (p.hp <= 0 || !p.max_hp) return 0
    if (p.hp >= p.max_hp) return 100
    return Math.min(99, Math.max(1, Math.ceil((p.hp / p.max_hp) * 100)))
}

function summaryPokemon(p: PokeView, hide: boolean): SummaryPokemon {
    return {
        id: p.id, species: p.species, setSpecies: p.setSpecies, nickname: p.nickname, level: p.level,
        hp: hide ? null : p.hp, maxHp: hide ? null : p.max_hp, pct: pctOf(p),
        status: p.status, statusTurns: p.statusTurns ?? null, fainted: p.fainted,
    }
}

function summarySide(s: SideView, role: 'ours' | 'foe', hide: boolean): SummarySide {
    const a = s.active
    const active: SummaryActive = {
        ...summaryPokemon(a, hide),
        types: [...a.types],
        stages: { ...a.stages },
        volatiles: a.volatiles
            .filter(v => volatileName(v, 'en') !== null)
            .map(v => ({ id: v, turns: a.volatileTurns?.[v] ?? null })),
        tera: { type: hide && !a.terastallized ? null : a.tera_type, active: a.terastallized },
    }
    if (!hide) {
        active.item = a.item
        active.ability = a.ability
    }
    return {
        id: s.id,
        name: s.name,
        role,
        active,
        bench: s.team.filter(p => p.id !== a.id).map(p => summaryPokemon(p, hide)),
        remaining: s.team.filter(p => !p.fainted).length,
        total: s.team.length,
        usedTera: s.usedTera,
        conditions: s.conditions.map(c => ({ ...c })),
    }
}

/** 프레임 → 구조화된 현황 */
export function summarizeBattle(frame: Frame, opts: SummarizeOptions = {}): BattleSummary {
    const me = opts.perspective ?? 'p1'
    const foe: PlayerID = me === 'p1' ? 'p2' : 'p1'
    return {
        turn: frame.turn,
        perspective: me,
        weather: frame.weather ? { id: frame.weather, turns: frame.weatherTurns } : null,
        terrain: frame.terrain ? { id: frame.terrain, turns: frame.terrainTurns } : null,
        field: frame.field.map(c => ({ ...c })),
        sides: [summarySide(frame[me], 'ours', false), summarySide(frame[foe], 'foe', !!opts.hideFoeExact)],
    }
}

// ─── 글로 ────────────────────────────────────────────────────

type Key = keyof typeof battleMessages.ko
const tr = (key: Key, lang: Lang, vars?: Vars) => translate(battleMessages, key, vars, lang)

export interface FormatSummaryOptions {
    /** 진영 이름 (관전 모드: CPU 1 / CPU 2). 없으면 우리 편 / 상대 편 */
    sideName?: (p: PlayerID) => string
}

const nameOf = (p: SummaryPokemon, lang: Lang) => pokemonLabel(p.species, p.nickname, lang, p.setSpecies)
const withTurns = (label: string, turns: number | null, lang: Lang) =>
    turns === null ? label : `${label} (${tr('sumTurns', lang, { n: turns })})`

/** 상태이상 + 카운터: "맹독 (다음 3/16)", "잠듦 (2턴째)" */
function statusText(p: SummaryPokemon, lang: Lang): string | null {
    if (!p.status) return null
    const name = statusLongName(p.status, lang)
    if (p.status === 'toxic') return `${name} (${tr('toxicNext', lang, { n: toxicNext(p.statusTurns) })})`
    if (p.status === 'sleep' && p.statusTurns) return `${name} (${tr('sleptN', lang, { n: p.statusTurns })})`
    return name
}

function hpText(p: SummaryPokemon, lang: Lang): string {
    if (p.fainted) return tr('fainted', lang)
    return p.hp !== null && p.maxHp !== null ? `HP ${p.hp}/${p.maxHp} (${p.pct}%)` : `HP ${p.pct}%`
}

const sep = (lang: Lang) => (lang === 'en' ? ', ' : '、')
const colon = (label: string, value: string) => `${label}: ${value}`

/** 현황 → 여러 줄 글 (현재 언어) */
export function formatBattleSummary(s: BattleSummary, lang: Lang, opts: FormatSummaryOptions = {}): string {
    const lines: string[] = []
    const list = (xs: string[]) => xs.join(sep(lang))

    // 첫 줄: 턴 · 날씨 · 필드
    const head = [tr('turn', lang, { n: s.turn })]
    if (s.weather) head.push(colon(tr('sumWeather', lang), withTurns(weatherName(s.weather.id, lang), s.weather.turns, lang)))
    if (s.terrain) head.push(colon(tr('sumTerrain', lang), withTurns(terrainName(s.terrain.id, lang), s.terrain.turns, lang)))
    lines.push(head.join(' · '))
    if (s.field.length > 0) {
        lines.push(colon(tr('sumField', lang), list(s.field.map(c => withTurns(fieldConditionName(c.id, lang), c.turns, lang)))))
    }

    for (const side of s.sides) {
        const a = side.active
        const label = opts.sideName ? opts.sideName(side.id) : tr(side.role === 'ours' ? 'sumSideOurs' : 'sumSideFoe', lang)
        lines.push('')
        lines.push(`[${label}] ${tr('sumRemaining', lang, { n: side.remaining, total: side.total })}`)

        // 필드 위 포켓몬
        lines.push([`▶ ${nameOf(a, lang)} ${tr('level', lang, { n: a.level })}`, hpText(a, lang), statusText(a, lang)].filter(Boolean).join('  '))
        const types = a.tera.active && a.tera.type ? [a.tera.type] : a.types
        const detail = [types.map(t => typeNameL(t, lang)).join('/')]
        if (a.tera.active && a.tera.type) detail.push(tr('teraActive', lang, { type: typeNameL(a.tera.type, lang) }))
        else if (side.usedTera) detail.push(tr('sumTeraUsedOther', lang))
        else if (a.tera.type) detail.push(tr('sumTeraBefore', lang, { type: typeNameL(a.tera.type, lang) }))
        if (a.item !== undefined) detail.push(colon(tr('item', lang), a.item ? itemName(a.item, lang) : tr('noItem', lang)))
        if (a.ability !== undefined) detail.push(colon(tr('ability', lang), abilityNameL(a.ability, lang)))
        lines.push(`   ${detail.join(' · ')}`)

        const stages = Object.entries(a.stages)
        if (stages.length > 0) {
            lines.push(`   ${colon(tr('sumStages', lang), list(stages.map(([k, v]) => `${battleStatLabel(k, lang)} ${v > 0 ? `+${v}` : v}`)))}`)
        }
        if (a.volatiles.length > 0) {
            lines.push(`   ${colon(tr('sumVolatiles', lang), list(a.volatiles.map(v => withTurns(volatileName(v.id, lang) ?? v.id, v.turns, lang))))}`)
        }
        if (side.conditions.length > 0) {
            const conds = side.conditions.map(c => {
                const n = c.layers > 1 ? `${sideConditionName(c.id, lang)} ${tr('sumLayers', lang, { n: c.layers })}` : sideConditionName(c.id, lang)
                return withTurns(n, c.turns, lang)
            })
            lines.push(`   ${colon(tr('sumSideCond', lang), list(conds))}`)
        }

        // 대기
        const bench = side.bench.map(p => [nameOf(p, lang), p.fainted ? tr('fainted', lang) : `${p.pct}%`, statusText(p, lang)].filter(Boolean).join(' '))
        lines.push(`   ${colon(tr('sumBench', lang), bench.length > 0 ? list(bench) : tr('sumNoBench', lang))}`)
    }
    return lines.join('\n')
}

// ─── 콘솔 디버그 훅 ───────────────────────────────────────────

/** 배틀·리플레이 화면이 떠 있는 동안 window.pokestraBattle 로 노출한다 */
export interface PokestraBattleDebug {
    /** 지금 프레임의 구조화된 현황 */
    summary(): BattleSummary
    /** 지금 프레임의 현황 글 (기본: 화면 언어) */
    text(lang?: Lang): string
}

declare global {
    interface Window {
        pokestraBattle?: PokestraBattleDebug
    }
}
