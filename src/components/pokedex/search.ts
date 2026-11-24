import { MOVES, type DexMove } from "../../lib/dex"
import { withChosung } from "../dex/text"

export const MAX_MOVE_SUGGESTIONS = 8

/** 히라가나 → 가타카나 (ぴかちゅう ≒ ピカチュウ) */
function toKatakana(s: string): string {
    return s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
}

/** 소문자 + 공백/구분자 제거 + 가타카나 통일 (모든 언어 공통) */
export function norm(s: string): string {
    return toKatakana(s.normalize("NFKC").toLowerCase()).replace(/[\s\-_.'’:・]+/g, "")
}

/** 기술 검색 키: slug / 영어 / 한국어 / 일본어 */
const MOVE_INDEX: { m: DexMove; names: string[]; keys: string[] }[] = MOVES.map((m) => {
    const raw = [m.name, m.nameEn, m.hasKoreanName ? m.nameKo : null, m.nameJa]
    return {
        m,
        /** 실제 이름들 (정확히 일치 판정용) */
        names: raw.filter((x): x is string => !!x).map(norm),
        /** 후보 찾기용: 이름 + 한글 초성 ("ㅈㅈ" → 지진) */
        keys: withChosung(raw).map(norm),
    }
})

export function findMoveSuggestions(query: string): DexMove[] {
    const q = norm(query)
    if (!q) return []
    const starts: DexMove[] = []
    const contains: DexMove[] = []
    for (const { m, keys } of MOVE_INDEX) {
        if (keys.some((k) => k.startsWith(q))) starts.push(m)
        else if (contains.length < MAX_MOVE_SUGGESTIONS && keys.some((k) => k.includes(q))) contains.push(m)
        if (starts.length >= MAX_MOVE_SUGGESTIONS) break
    }
    return [...starts, ...contains].slice(0, MAX_MOVE_SUGGESTIONS)
}

/** 입력이 (어느 언어로든) 기술 이름과 정확히 일치하면 그 기술 slug */
export function exactMove(query: string): string | null {
    const q = norm(query)
    if (!q) return null
    // 초성은 여러 기술과 겹치므로 자동 선택에는 쓰지 않는다
    return MOVE_INDEX.find(({ names }) => names.includes(q))?.m.name ?? null
}
