/**
 * 도감 설명: 작품마다 다르다. 언어별로 모아 최신 작품부터, 같은 글은 한 항목(작품 여러 개)으로 묶는다.
 * - 사용자 언어 설명이 없는 작품(예: 한국어가 없는 옛 작품)은 대체 언어(영어) 설명으로 채운다.
 * - 세대를 고르면 그 세대 작품의 설명을 기본으로 고른다.
 * PokeAPI 는 오래된 작품부터 나열하므로 뒤집는다.
 */
import { versionGeneration } from './gameNames'

export interface FlavorSource {
    flavor_text: string
    language: { name: string }
    version: { name: string }
}

export interface FlavorOption {
    /** 선택 값: 첫 작품 slug */
    id: string
    text: string
    /** 최신 작품부터 */
    versions: string[]
    /** 이 설명의 언어 코드 (대체 언어면 사용자 언어와 다르다) */
    lang: string
}

type Clean = (text: string, code: string) => string

/** 한 언어의 설명 묶음 (최신 작품부터, 같은 글은 묶음) */
export function groupFlavors(entries: readonly FlavorSource[] | undefined, languageCode: string, clean: Clean): FlavorOption[] {
    if (!entries) return []
    const groups = new Map<string, FlavorOption>()
    for (let i = entries.length - 1; i >= 0; i--) {
        const e = entries[i]
        if (e.language.name !== languageCode) continue
        const text = clean(e.flavor_text, e.language.name)
        if (!text) continue
        const g = groups.get(text)
        if (g) {
            if (!g.versions.includes(e.version.name)) g.versions.push(e.version.name)
        } else groups.set(text, { id: e.version.name, text, versions: [e.version.name], lang: languageCode })
    }
    return [...groups.values()]
}

/** 사용자 언어 설명 + (그 언어 설명이 없는 작품만) 대체 언어 설명. 최신 작품부터 */
export function buildFlavorOptions(
    entries: readonly FlavorSource[] | undefined,
    primary: string,
    fallback: string | null,
    clean: Clean,
): FlavorOption[] {
    const main = groupFlavors(entries, primary, clean)
    if (!fallback || fallback === primary) return main
    const covered = new Set(main.flatMap((o) => o.versions))
    const extra = groupFlavors(entries, fallback, clean)
        .map((o) => ({ ...o, versions: o.versions.filter((v) => !covered.has(v)) }))
        .filter((o) => o.versions.length > 0)
        .map((o) => ({ ...o, id: `${fallback}:${o.versions[0]}` }))
    // 세대(최신 작품 기준) 순서로 합친다: 같은 세대면 사용자 언어 먼저
    const rank = (o: FlavorOption) => versionGeneration(o.versions[0]) ?? 0
    return [...main, ...extra].sort((a, b) => rank(b) - rank(a) || Number(a.lang !== primary) - Number(b.lang !== primary))
}

/** 기본 선택: 세대를 골랐으면 그 세대 작품의 첫(최신) 설명, 없으면 가장 최신 설명 */
export function defaultFlavor(options: readonly FlavorOption[], gen: number | null): FlavorOption | undefined {
    if (gen !== null) {
        const inGen = options.find((o) => o.versions.some((v) => versionGeneration(v) === gen))
        if (inGen) return inGen
    }
    return options[0]
}
