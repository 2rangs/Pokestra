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
    /**
     * 상태이상 카운터 (없으면 null).
     * toxic: 지금까지 맹독 데미지를 받은 횟수 (다음 데미지 = (n+1)/16, 교체하면 0으로).
     * sleep: 잠든 뒤 움직이지 못한 턴 수 (남은 턴은 게임처럼 숨긴다).
     */
    statusTurns:   number | null
    types:         string[]
    tera_type:     string | null
    terastallized: boolean
    stages:        Record<string, number>
    item:          string | null
    ability:       string
    fainted:       boolean
    volatiles:     string[]
    /** 휘발성 상태의 남은 턴 (엔진이 알려 주는 것만) */
    volatileTurns: Record<string, number>
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
