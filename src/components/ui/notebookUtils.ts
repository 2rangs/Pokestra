import { TYPE_COLOR } from '../../lib/dex'

/** className 이어 붙이기 (falsy 무시) */
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/** 타입 slug → 색 (모르는 타입은 연한 잉크) */
export function typeColor(type: string): string {
    return TYPE_COLOR[type] ?? '#8a93b3'
}
