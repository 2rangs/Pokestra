/**
 * 배틀 도구·열매 데이터(src/data/items.json) 접근자와 목록 질의.
 */
import itemsJson from '../data/items.json'
import { buildSearchKey, foldSearch } from '../components/dex/text'
import { collator, type Lang } from '../i18n'
import { getDexPokemon, getSpeciesId, localName, type DexPokemon, type LocalizedText } from './dex'

export const BATTLE_CATEGORIES = ['held-items', 'choice', 'bad-held-items', 'type-enhancement', 'plates', 'species-specific', 'jewels', 'mega-stones', 'memories', 'scarves'] as const
export const BERRY_CATEGORIES = ['medicine', 'in-a-pinch', 'picky-healing', 'type-protection', 'effort-drop', 'other', 'baking-only', 'catching-bonus'] as const
export type ItemCategory = (typeof BATTLE_CATEGORIES)[number] | (typeof BERRY_CATEGORIES)[number]

export const FLAVORS = ['spicy', 'dry', 'sweet', 'bitter', 'sour'] as const
export type Flavor = (typeof FLAVORS)[number]
export type Firmness = 'very-soft' | 'soft' | 'hard' | 'very-hard' | 'super-hard'
export type FlingEffect = 'badly-poison' | 'burn' | 'berry-effect' | 'herb-effect' | 'paralyze' | 'poison' | 'flinch'

export interface DexBerry {
    naturalGiftType: string | null
    naturalGiftPower: number | null
    firmness: Firmness | null
    /** mm */
    size: number | null
    /** 단계당 시간 */
    growthTime: number | null
    flavors: Record<Flavor, number> | null
}

export interface DexItem {
    id: number
    name: string
    nameKo: string | null
    nameEn: string | null
    nameJa: string | null
    kind: 'battle' | 'berry'
    category: ItemCategory
    flingPower: number | null
    flingEffect: FlingEffect | null
    desc: LocalizedText | null
    berry: DexBerry | null
    heldBy: { id: number; rarity: number }[]
}

/** id 오름차순 */
export const DEX_ITEMS: readonly DexItem[] = itemsJson as unknown as DexItem[]
export const ITEM_BY_SLUG: ReadonlyMap<string, DexItem> = new Map(DEX_ITEMS.map((i) => [i.name, i]))

const SEARCH_INDEX = new Map(DEX_ITEMS.map((i) => [i.name, buildSearchKey(i.name, i.nameKo, i.nameEn, i.nameJa)]))

export const ITEM_VIEWS = ['all', 'battle', 'berry'] as const
export type ItemView = (typeof ITEM_VIEWS)[number]
export type ItemSortKey = 'name' | 'category'
const SORT_KEYS: readonly ItemSortKey[] = ['name', 'category']
export const ITEM_SORT_DEFAULT_DIR: Record<ItemSortKey, 'asc' | 'desc'> = { name: 'asc', category: 'asc' }

export interface ItemQuery {
    q: string
    view: ItemView
    cats: ItemCategory[]
    sort: ItemSortKey
    dir: 'asc' | 'desc'
}

const ALL_CATEGORIES: readonly ItemCategory[] = [...BATTLE_CATEGORIES, ...BERRY_CATEGORIES]

export function categoriesFor(view: ItemView): readonly ItemCategory[] {
    return view === 'battle' ? BATTLE_CATEGORIES : view === 'berry' ? BERRY_CATEGORIES : ALL_CATEGORIES
}

export function parseItemQuery(params: URLSearchParams): ItemQuery {
    const viewParam = params.get('view')
    const view = ITEM_VIEWS.find((v) => v === viewParam) ?? 'all'
    const allowed = categoriesFor(view)
    const cats = (params.get('cat') ?? '')
        .split(',')
        .filter((c): c is ItemCategory => (allowed as readonly string[]).includes(c))
    const sortParam = params.get('sort')
    const sort = SORT_KEYS.find((s) => s === sortParam) ?? 'name'
    const dirParam = params.get('dir')
    const dir = dirParam === 'asc' || dirParam === 'desc' ? dirParam : ITEM_SORT_DEFAULT_DIR[sort]
    return { q: params.get('q') ?? '', view, cats, sort, dir }
}

/** 열매는 자연의 선물 위력, 그 외는 던지기 위력. 없으면 null */
export function itemValue(item: DexItem): number | null {
    return item.kind === 'berry' ? (item.berry?.naturalGiftPower ?? null) : item.flingPower
}

export function itemName(item: DexItem, lang: Lang): string {
    return localName(item, lang)
}

/** 사용자 언어 → en → ko → ja 순으로 첫 설명. 없으면 null */
export function itemDesc(item: DexItem, lang: Lang): { text: string; lang: Lang } | null {
    if (!item.desc) return null
    for (const l of [lang, 'en', 'ko', 'ja'] as const) {
        const text = item.desc[l]
        if (text) return { text, lang: l }
    }
    return null
}

export function queryItems(query: ItemQuery, lang: Lang): DexItem[] {
    const needle = foldSearch(query.q)
    const cats = query.cats.length ? new Set<string>(query.cats) : null
    const list = DEX_ITEMS.filter(
        (i) =>
            (query.view === 'all' || i.kind === query.view) &&
            (!cats || cats.has(i.category)) &&
            (!needle || SEARCH_INDEX.get(i.name)!.includes(needle)),
    )
    const sign = query.dir === 'asc' ? 1 : -1
    const c = collator(lang)
    const names = new Map(list.map((i) => [i.name, itemName(i, lang)]))
    const byName = (a: DexItem, b: DexItem) => c.compare(names.get(a.name)!, names.get(b.name)!) || a.id - b.id
    if (query.sort === 'name') {
        list.sort((a, b) => sign * byName(a, b))
    } else {
        list.sort((a, b) => sign * (ALL_CATEGORIES.indexOf(a.category) - ALL_CATEGORIES.indexOf(b.category)) || byName(a, b))
    }
    return list
}

/** 같은 정렬의 목록에서 이웃. 현재 필터에 없으면 필터 없는 전체 목록 기준 */
export function itemNeighbors(slug: string, query: ItemQuery, lang: Lang): { prev: DexItem | null; next: DexItem | null } {
    let list = queryItems(query, lang)
    let i = list.findIndex((x) => x.name === slug)
    if (i < 0) {
        list = queryItems({ ...query, q: '', view: 'all', cats: [] }, lang)
        i = list.findIndex((x) => x.name === slug)
    }
    if (i < 0) return { prev: null, next: null }
    return { prev: list[i - 1] ?? null, next: list[i + 1] ?? null }
}

/** 이 도구를 지니는 포켓몬. rarity 내림차순, 그다음 도감 번호, id */
export function heldByPokemon(item: DexItem): { pokemon: DexPokemon; rarity: number }[] {
    const out: { pokemon: DexPokemon; rarity: number }[] = []
    for (const h of item.heldBy) {
        const pokemon = getDexPokemon(h.id)
        if (pokemon) out.push({ pokemon, rarity: h.rarity })
    }
    return out.sort((a, b) => b.rarity - a.rarity || getSpeciesId(a.pokemon) - getSpeciesId(b.pokemon) || a.pokemon.id - b.pokemon.id)
}
