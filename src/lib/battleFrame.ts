// ─── 배틀 화면 프레임 타입 ─────────────────────────────────────
// 엔진 이벤트 하나마다 기록하는 화면용 스냅숏. HUD·로그·리플레이와 lib 헬퍼가 같이 쓴다.
import type { BattleEvent, PlayerID } from '@kyasi/pokebattle-engine'

export interface PokeView {
    id:            string
    species:       string
    /** 세트의 원래 종 (폼 체인지 전) */
    setSpecies:    string
    nickname:      string
    level:         number
    hp:            number
    max_hp:        number
    status:        string | null
    types:         string[]
    tera_type:     string | null
    terastallized: boolean
    stages:        Record<string, number>
    item:          string | null
    ability:       string
    fainted:       boolean
    volatiles:     string[]
}

export interface SideView {
    id:         PlayerID
    name:       string
    active:     PokeView
    team:       PokeView[]
    /** turns: 남은 턴 (장판처럼 무기한이면 null) */
    conditions: { id: string; layers: number; turns: number | null }[]
    usedTera:   boolean
}

export interface Frame {
    index:   number
    event:   BattleEvent
    /** 로그에 보이지 않는 이벤트 (재생 시 대기 없이 넘김) */
    silent:  boolean
    turn:    number
    p1:      SideView
    p2:      SideView
    weather: string | null
    /** 남은 턴 (모르거나 무기한이면 null) */
    weatherTurns: number | null
    terrain: string | null
    terrainTurns: number | null
    /** 트릭룸·중력 등 필드 전체 효과 */
    field:   { id: string; turns: number | null }[]
}

/** 엔진의 남은 턴 → 화면 값. 0 이하·없음·무한(장판)은 null (무기한/끝나는 중) */
export const turnsOf = (d: { turns_remaining?: number | null } | null | undefined): number | null =>
    d && typeof d.turns_remaining === 'number' && Number.isFinite(d.turns_remaining) && d.turns_remaining > 0 ? d.turns_remaining : null
