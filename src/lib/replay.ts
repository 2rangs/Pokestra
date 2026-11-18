// ─── 리플레이 직렬화 ─────────────────────────────────────────
// 시드 + 두 팀(Showdown 텍스트) + 기록한 모든 행동(사람·AI) → JSON → deflate-raw → base64url.
// 같은 시드·팀에 같은 행동을 순서대로 넣으면 엔진이 같은 로그를 만든다 (AI 를 다시 돌리지 않는다).
import type { Action, PlayerID } from '@kyasi/pokebattle-engine'

export const REPLAY_VERSION = 1

export type ReplayController = 'human' | 'easy' | 'normal' | 'hard'

export interface ReplaySide {
    /** Showdown 팀 텍스트 */
    team: string
    ctrl: ReplayController
}

export interface ReplayData {
    v:       1
    seed:    number
    format:  'singles' | 'doubles'
    p1:      ReplaySide
    p2:      ReplaySide
    actions: Action[]
}

export type ReplayErrorCode = 'corrupt' | 'version'

export class ReplayError extends Error {
    readonly code: ReplayErrorCode
    constructor(code: ReplayErrorCode, message?: string) {
        super(message ?? `replay ${code}`)
        this.name = 'ReplayError'
        this.code = code
    }
}

// ─── 행동 ↔ 짧은 튜플 ────────────────────────────────────────
// move   [0, p, slot, moveIndex, flags, target?, rotate?]   flags: 1=tera 2=mega 4=ultra 8=z 16=dynamax
// switch [1, p, slot, switchToTeamIndex]
// raw    [2, p, choice, pokemonId?]
// team   [3, p, order(팀 인덱스)[]]
// 그 밖 [9, 원래 객체] — 짧은 꼴로 정확히 되돌릴 수 없는 행동 (예: terastallize: false 처럼 값이 명시된 경우)
export type ActionTuple =
    | [0, 1 | 2, number, number, number]
    | [0, 1 | 2, number, number, number, string | null]
    | [0, 1 | 2, number, number, number, string | null, string]
    | [1, 1 | 2, number, number]
    | [2, 1 | 2, string]
    | [2, 1 | 2, string, string]
    | [3, 1 | 2, number[]]
    | [9, Action]

const MOVE_FLAGS = ['terastallize', 'mega', 'ultra_burst', 'zmove', 'dynamax'] as const

const pNum = (p: PlayerID): 1 | 2 => (p === 'p1' ? 1 : 2)
const pId = (n: unknown): PlayerID => {
    if (n === 1) return 'p1'
    if (n === 2) return 'p2'
    throw new ReplayError('corrupt', 'bad player')
}

/** 'p1_3' → 3 (그 플레이어의 ID 가 아니면 null) */
function idIndex(player: PlayerID, id: string): number | null {
    const m = /^(p[12])_(\d+)$/.exec(id)
    return m && m[1] === player ? Number(m[2]) : null
}
const idOf = (player: PlayerID, i: unknown): string => {
    if (typeof i !== 'number' || !Number.isInteger(i) || i < 0) throw new ReplayError('corrupt', 'bad index')
    return `${player}_${i}`
}

/** 키 순서와 무관한 비교용 문자열 */
function canonical(v: unknown): string {
    if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`
    if (v && typeof v === 'object') {
        return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(',')}}`
    }
    return JSON.stringify(v) ?? 'undefined'
}

function compact(a: Action): ActionTuple | null {
    switch (a.type) {
        case 'move': {
            const slot = idIndex(a.player, a.pokemon_id)
            if (slot === null) return null
            let flags = 0
            MOVE_FLAGS.forEach((k, bit) => { if (a[k]) flags |= 1 << bit })
            const t: ActionTuple = [0, pNum(a.player), slot, a.move_index, flags]
            if (a.rotate !== undefined) return [...t, a.target_id ?? null, a.rotate]
            if (a.target_id !== undefined) return [...t, a.target_id]
            return t
        }
        case 'switch': {
            const slot = idIndex(a.player, a.pokemon_id)
            const to = idIndex(a.player, a.switch_to_id)
            return slot === null || to === null ? null : [1, pNum(a.player), slot, to]
        }
        case 'raw':
            return a.pokemon_id === undefined ? [2, pNum(a.player), a.choice] : [2, pNum(a.player), a.choice, a.pokemon_id]
        case 'team': {
            const order = a.order.map(id => idIndex(a.player, id))
            return order.some(i => i === null) ? null : [3, pNum(a.player), order as number[]]
        }
        default:
            return null
    }
}

export function encodeAction(a: Action): ActionTuple {
    const t = compact(a)
    // 짧은 꼴이 원래 객체로 정확히 돌아올 때만 쓴다
    if (t && canonical(decodeAction(t)) === canonical(a)) return t
    return [9, a]
}

const isStr = (v: unknown): v is string => typeof v === 'string'

export function decodeAction(t: unknown): Action {
    if (!Array.isArray(t)) throw new ReplayError('corrupt', 'bad action')
    switch (t[0]) {
        case 0: {
            const player = pId(t[1])
            const mi = t[3]
            if (![0, 1, 2, 3, -1].includes(mi) || typeof t[4] !== 'number') throw new ReplayError('corrupt', 'bad move')
            const a: Extract<Action, { type: 'move' }> = { type: 'move', player, pokemon_id: idOf(player, t[2]), move_index: mi }
            if (t.length > 5) {
                if (isStr(t[5])) a.target_id = t[5]
                else if (t[5] !== null) throw new ReplayError('corrupt', 'bad target')
            }
            MOVE_FLAGS.forEach((k, bit) => { if (t[4] & (1 << bit)) a[k] = true })
            if (t.length > 6) {
                if (t[6] !== 'left' && t[6] !== 'right') throw new ReplayError('corrupt', 'bad rotate')
                a.rotate = t[6]
            }
            return a
        }
        case 1: {
            const player = pId(t[1])
            return { type: 'switch', player, pokemon_id: idOf(player, t[2]), switch_to_id: idOf(player, t[3]) }
        }
        case 2: {
            const player = pId(t[1])
            if (!isStr(t[2])) throw new ReplayError('corrupt', 'bad choice')
            if (t.length > 3) {
                if (!isStr(t[3])) throw new ReplayError('corrupt', 'bad choice')
                return { type: 'raw', player, choice: t[2], pokemon_id: t[3] }
            }
            return { type: 'raw', player, choice: t[2] }
        }
        case 3: {
            const player = pId(t[1])
            if (!Array.isArray(t[2])) throw new ReplayError('corrupt', 'bad order')
            return { type: 'team', player, order: t[2].map((i: unknown) => idOf(player, i)) }
        }
        case 9: {
            const a = t[1] as Action | undefined
            if (!a || typeof a !== 'object' || !isStr(a.type)) throw new ReplayError('corrupt', 'bad action')
            return a
        }
        default:
            throw new ReplayError('corrupt', 'bad action')
    }
}

// ─── 압축 + base64url ───────────────────────────────────────
async function pump(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
    const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream))
    return new Uint8Array(await out.arrayBuffer())
}

function toBase64Url(bytes: Uint8Array): string {
    let bin = ''
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): Uint8Array {
    if (!/^[A-Za-z0-9_-]+$/.test(s)) throw new ReplayError('corrupt', 'bad characters')
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)
    let bin: string
    try {
        bin = atob(b64)
    } catch {
        throw new ReplayError('corrupt', 'bad base64')
    }
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes
}

/** 링크에 싣는 꼴 (행동은 튜플) */
interface Wire {
    v:  number
    s:  number
    f:  'singles' | 'doubles'
    p1: ReplaySide
    p2: ReplaySide
    a:  ActionTuple[]
}

export async function encodeReplay(data: ReplayData): Promise<string> {
    const wire: Wire = { v: data.v, s: data.seed, f: data.format, p1: data.p1, p2: data.p2, a: data.actions.map(encodeAction) }
    const bytes = new TextEncoder().encode(JSON.stringify(wire))
    return toBase64Url(await pump(bytes, new CompressionStream('deflate-raw')))
}

const CTRLS: readonly ReplayController[] = ['human', 'easy', 'normal', 'hard']

function side(v: unknown): ReplaySide {
    const s = v as Partial<ReplaySide> | null
    if (!s || typeof s !== 'object' || !isStr(s.team) || !CTRLS.includes(s.ctrl as ReplayController)) {
        throw new ReplayError('corrupt', 'bad side')
    }
    return { team: s.team, ctrl: s.ctrl as ReplayController }
}

export async function decodeReplay(s: string): Promise<ReplayData> {
    const bytes = fromBase64Url(s.trim())
    let wire: Partial<Wire>
    try {
        const json = new TextDecoder('utf-8', { fatal: true }).decode(await pump(bytes, new DecompressionStream('deflate-raw')))
        wire = JSON.parse(json) as Partial<Wire>
    } catch {
        throw new ReplayError('corrupt', 'cannot inflate')
    }
    if (!wire || typeof wire !== 'object') throw new ReplayError('corrupt', 'not an object')
    if (wire.v !== REPLAY_VERSION) throw new ReplayError('version', `unsupported version ${String(wire.v)}`)
    if (typeof wire.s !== 'number' || !Number.isFinite(wire.s)) throw new ReplayError('corrupt', 'bad seed')
    if (wire.f !== 'singles' && wire.f !== 'doubles') throw new ReplayError('corrupt', 'bad format')
    if (!Array.isArray(wire.a)) throw new ReplayError('corrupt', 'bad actions')
    return {
        v: REPLAY_VERSION,
        seed: wire.s,
        format: wire.f,
        p1: side(wire.p1),
        p2: side(wire.p2),
        actions: wire.a.map(decodeAction),
    }
}
