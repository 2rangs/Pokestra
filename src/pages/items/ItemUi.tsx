/* eslint-disable react-refresh/only-export-components -- 목록·상세가 함께 쓰는 표시 조각과 그 도우미를 한 파일에 둔다 */
import { Text } from '@astryxdesign/core/Text'
import { PokeImage } from '../../components/ui/PokeImage'
import type { TFunction } from '../../i18n'
import { FLAVORS, ITEM_SORT_DEFAULT_DIR, type Flavor, type ItemCategory, type ItemQuery } from '../../lib/items'
import { itemIconUrl } from '../../lib/spriteUrls'
import type { itemsMessages } from '../../i18n/messages/items'

type ItemsKey = keyof (typeof itemsMessages)['ko']

export function ItemIcon({ slug, size }: { slug: string; size: 24 | 48 }) {
    return <PokeImage sources={[itemIconUrl(slug)]} alt="" size={size} pixelated />
}

export function categoryLabel(c: ItemCategory, t: TFunction<ItemsKey>): string {
    return t(`cat_${c}` as ItemsKey)
}

const DASH = '-'

/** 값이 0보다 큰 맛만 "매운 2 · 쓴 10" 처럼 이어 쓴다 */
export function FlavorSummary({ flavors, t }: { flavors: Record<Flavor, number> | null; t: TFunction<ItemsKey> }) {
    const parts = flavors ? FLAVORS.filter((f) => flavors[f] > 0).map((f) => `${t(`flavorShort_${f}` as ItemsKey)} ${flavors[f]}`) : []
    return (
        <Text size="sm" color={parts.length ? 'primary' : 'secondary'} hasTabularNumbers>
            {parts.length ? parts.join(' · ') : DASH}
        </Text>
    )
}

/** 목록의 필터를 주소 쿼리로. 기본값은 생략한다. 상세에서 목록으로 돌아올 때 쓴다 */
export function itemQueryToSearch(q: ItemQuery): string {
    const p = new URLSearchParams()
    if (q.q) p.set('q', q.q)
    if (q.view !== 'all') p.set('view', q.view)
    if (q.cats.length) p.set('cat', q.cats.join(','))
    if (q.sort !== 'name') p.set('sort', q.sort)
    if (q.dir !== ITEM_SORT_DEFAULT_DIR[q.sort]) p.set('dir', q.dir)
    const s = p.toString()
    return s ? `?${s}` : ''
}
