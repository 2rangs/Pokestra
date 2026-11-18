import itemNamesJson from '../data/itemNames.json'
import type { Lang } from '../i18n'

type L10n = { ko: string | null; en: string | null; ja: string | null }
const ITEM_NAMES = itemNamesJson as Record<string, L10n>

const prettify = (slug: string) => slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

/** 도구 slug → 현재 언어 이름 (진화 조건·지니는 도구 표시용) */
export function itemLabel(id: string, lang: Lang): string {
    const n = ITEM_NAMES[id]
    if (lang === 'ko') return n?.ko ?? prettify(id)
    return n?.[lang] ?? n?.en ?? prettify(id)
}
