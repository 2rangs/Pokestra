/**
 * 도감 보조 페이지(기술/특성/스프라이트/홈)에서 함께 쓰는 문자열 유틸.
 */
import type { Lang } from '../../i18n'

/**
 * 다국어 검색용 정규화.
 * - 소문자 + NFKC (전각 영숫자 → 반각)
 * - 가타카나 → 히라가나 (ピカチュウ 와 ぴかちゅう 를 같게)
 * - 공백/하이픈/가운뎃점 제거
 */
export function foldSearch(s: string): string {
    return s
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
        .replace(/[\s\-_・·.'’]+/g, '')
}

/** 여러 이름을 한 검색 키로 묶는다 */
export function buildSearchKey(...names: (string | null | undefined)[]): string {
    return names
        .filter((n): n is string => !!n)
        .map(foldSearch)
        .join('\u0000')
}

/**
 * 게임 원문 설명 정리.
 * 일본어 원문의 전각 공백(어절 구분용)과 줄바꿈을 없애고, 다른 언어는 줄바꿈을 공백으로 바꾼다.
 */
export function cleanDesc(text: string | null | undefined, lang: Lang): string | null {
    if (!text) return null
    if (lang === 'ja') return text.replace(/[\u3000\n]+/g, '').trim()
    return text.replace(/\s*\n\s*/g, ' ').trim()
}

export function padDexNo(n: number): string {
    return `#${String(n).padStart(4, '0')}`
}

export { artworkUrl } from '../../lib/spriteUrls'
