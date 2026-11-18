// ─── 배틀 HUD 표시용 순수 헬퍼 ─────────────────────────────────
// React 없이 언어만 받아 라벨을 만든다 (테스트·리플레이 화면에서도 같은 값을 쓴다).
import type { BattleEvent, PlayerID } from '@kyasi/pokebattle-engine'
import { translate, type Lang, type Vars } from '../i18n'
import { battleMessages } from '../i18n/messages/battle'
import type { Frame } from '../pages/battle/useBattleSession'

type Key = keyof typeof battleMessages.ko
const tr = (key: Key, lang: Lang, vars?: Vars) => translate(battleMessages, key, vars, lang)

/** 1 → OHKO, 2 → 2HKO … (영어 계산기 표기) */
const hko = (n: number) => (n === 1 ? 'OHKO' : `${n}HKO`)

/**
 * 확정/난수 n타 라벨. koChance 는 0~1, koHits 는 타수.
 * 타수가 없거나(0) 확률이 0이면 null.
 */
export function koLabel(r: { koChance?: number | null; koHits?: number | null } | null | undefined, lang: Lang): string | null {
    const n = r?.koHits ?? 0
    const chance = r?.koChance ?? 0
    if (!n || n < 1 || chance <= 0) return null
    if (chance >= 1) return tr('koGuaranteed', lang, { n, hko: hko(n) })
    // 반올림으로 0%·100% 가 되지 않게
    const pct = Math.min(99, Math.max(1, Math.round(chance * 100)))
    return tr('koChance', lang, { n, hko: hko(n), pct })
}

/** 배수 표기: 2 → "2", 0.25 → "0.25" */
const effNum = (x: number) => String(Number(x.toFixed(2)))

/** 상성 라벨. 보통(×1)이면 null */
export function effectivenessLabel(eff: number, lang: Lang): string | null {
    if (eff === 0) return tr('effNone', lang)
    if (eff >= 2) return tr('effLabel', lang, { label: tr('effSuper', lang), x: effNum(eff) })
    if (eff < 1) return tr('effLabel', lang, { label: tr('effWeak', lang), x: effNum(eff) })
    return null
}

/** 상성 강도 (색 고르기용) */
export function effectivenessTone(eff: number): 'super' | 'weak' | 'none' | 'neutral' {
    if (eff === 0) return 'none'
    if (eff >= 2) return 'super'
    if (eff < 1) return 'weak'
    return 'neutral'
}

/** 랭크 배수 (숫자). 명중·회피는 3 기준, 나머지는 2 기준 */
export function stageFactor(stat: string, stage: number): number {
    const s = Math.max(-6, Math.min(6, Math.trunc(stage)))
    const base = stat === 'accuracy' || stat === 'evasion' ? 3 : 2
    return s >= 0 ? (base + s) / base : base / (base - s)
}

/** 랭크 배수 문자열: "×1.5", "×2.0", "×0.67" */
export function stageMultiplier(stat: string, stage: number): string {
    const x = stageFactor(stat, stage)
    const r = Number(x.toFixed(2))
    return `×${Number.isInteger(r) ? r.toFixed(1) : String(r)}`
}

export type FieldItemKind = 'weather' | 'terrain' | 'field' | 'side'

export interface FieldItem {
    key:    string
    kind:   FieldItemKind
    /** kind 가 side 일 때 어느 진영인지 */
    side?:  PlayerID
    id:     string
    /** 남은 턴 (무기한이면 null) */
    turns:  number | null
    layers: number
}

/** 화면에 보여주지 않는 진영 효과 (소원은 다음 턴 회복 예약일 뿐) */
const HIDDEN_SIDE = new Set(['wish'])

/** 필드 줄 항목 (표시 순서: 날씨 → 필드 → 전체 효과 → 상대 진영 → 우리 진영) */
export function fieldItems(f: Pick<Frame, 'weather' | 'weatherTurns' | 'terrain' | 'terrainTurns' | 'field' | 'p1' | 'p2'>): FieldItem[] {
    const out: FieldItem[] = []
    if (f.weather) out.push({ key: `w:${f.weather}`, kind: 'weather', id: f.weather, turns: f.weatherTurns, layers: 1 })
    if (f.terrain) out.push({ key: `t:${f.terrain}`, kind: 'terrain', id: f.terrain, turns: f.terrainTurns, layers: 1 })
    for (const c of f.field) out.push({ key: `f:${c.id}`, kind: 'field', id: c.id, turns: c.turns, layers: 1 })
    for (const s of [f.p2, f.p1]) {
        for (const c of s.conditions) {
            if (HIDDEN_SIDE.has(c.id)) continue
            out.push({ key: `s:${s.id}:${c.id}`, kind: 'side', side: s.id, id: c.id, turns: c.turns, layers: c.layers })
        }
    }
    return out
}

// ─── 로그: 턴 묶음·강조 ─────────────────────────────────────────

export type LogTone = 'key' | 'accent' | 'move' | 'dim' | 'normal'

/** 로그 한 줄의 강조 단계: 기절·급소·효과 굉장 > 테라스탈·배틀 종료 > 기술 사용 > 보통 > 효과 별로/없음 */
export function logTone(e: BattleEvent): LogTone {
    if (e.type === 'faint') return 'key'
    if (e.type === 'damage') {
        if (e.crit || (e.effectiveness ?? 1) > 1) return 'key'
        if ((e.effectiveness ?? 1) < 1) return 'dim'
        return 'normal'
    }
    if (e.type === 'terastallize' || e.type === 'battle_end') return 'accent'
    if (e.type === 'move_use') return 'move'
    return 'normal'
}

export interface LogSummary { faints: number; crits: number; supers: number }

export interface LogGroup<F> {
    key:     string
    /** 턴 번호 (첫 턴 전 등장 장면은 0) */
    turn:    number
    /** turn_start 를 뺀 그 턴의 프레임 */
    items:   F[]
    summary: LogSummary
}

/** 프레임을 턴 단위로 묶는다 (turn_start 가 새 묶음의 머리) */
export function groupLogByTurn<F extends { index: number; turn: number; event: BattleEvent }>(frames: readonly F[]): LogGroup<F>[] {
    const groups: LogGroup<F>[] = []
    let cur: LogGroup<F> | null = null
    const open = (key: string, turn: number) => {
        const g: LogGroup<F> = { key, turn, items: [], summary: { faints: 0, crits: 0, supers: 0 } }
        groups.push(g)
        return g
    }
    for (const f of frames) {
        const e = f.event
        if (e.type === 'turn_start') {
            cur = open(`t${f.index}`, e.turn)
            continue
        }
        cur ??= open('start', 0)
        cur.items.push(f)
        if (e.type === 'faint') cur.summary.faints++
        if (e.type === 'damage') {
            if (e.crit) cur.summary.crits++
            if ((e.effectiveness ?? 1) > 1) cur.summary.supers++
        }
    }
    return groups
}
