/**
 * 도감 설명 목록: 한 언어의 설명을 최신 작품부터, 같은 글은 한 줄로 묶어(작품 이름 여러 개) 돌려준다.
 * PokeAPI 는 오래된 작품부터 나열하므로 뒤집는다.
 */
export interface FlavorSource {
    flavor_text: string
    language: { name: string }
    version: { name: string }
}

export interface FlavorGroup {
    text: string
    versions: string[]
}

export function groupFlavors(
    entries: readonly FlavorSource[] | undefined,
    languageCode: string,
    clean: (text: string, code: string) => string,
): FlavorGroup[] {
    if (!entries) return []
    const groups = new Map<string, FlavorGroup>()
    for (let i = entries.length - 1; i >= 0; i--) {
        const e = entries[i]
        if (e.language.name !== languageCode) continue
        const text = clean(e.flavor_text, e.language.name)
        if (!text) continue
        const g = groups.get(text)
        if (g) {
            if (!g.versions.includes(e.version.name)) g.versions.push(e.version.name)
        } else groups.set(text, { text, versions: [e.version.name] })
    }
    return [...groups.values()]
}
