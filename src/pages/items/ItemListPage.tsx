import { useCallback, useDeferredValue, useMemo, useRef } from 'react'
import { useLocation } from 'react-router'
import { useMediaQuery } from '@astryxdesign/core/hooks'
import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { IconButton } from '@astryxdesign/core/IconButton'
import { Link } from '@astryxdesign/core/Link'
import { pixel, proportional, Table, type TableColumn, type TableSortState, useTableSortable } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden'
import { EmptyState, FilterChip, LoadMore, PageHeader, SearchField, Segmented, SelectField } from '../../components/dex/DexUi'
import { cleanDesc } from '../../components/dex/text'
import { useProgressive } from '../../components/dex/useProgressive'
import { useRowLink } from '../../components/dex/useRowLink'
import { useSlashFocus } from '../../hooks/useSlashFocus'
import { useUrlParams } from '../../components/dex/useUrlParams'
import { LANG_LABEL, useDocumentTitle, useLang, useT, type Lang } from '../../i18n'
import { commonMessages } from '../../i18n/messages/common'
import { itemsMessages } from '../../i18n/messages/items'
import {
    categoriesFor,
    DEX_ITEMS,
    ITEM_SORT_DEFAULT_DIR,
    ITEM_VIEWS,
    itemDesc,
    itemName,
    parseItemQuery,
    queryItems,
    type DexItem,
    type ItemSortKey,
} from '../../lib/items'
import { categoryLabel, FlavorSummary, ItemIcon } from './ItemUi'

const SORT_KEYS: readonly ItemSortKey[] = ['name', 'category']
const DASH = '-'

interface ItemRow extends Record<string, unknown> {
    key: string
    item: DexItem
}

/** 이름 옆에 작게 보여 줄 다른 언어 이름 (사용자 언어와 다른 첫 이름) */
function otherName(item: DexItem, lang: Lang): { text: string; lang: Lang } | null {
    const main = itemName(item, lang)
    const order: Lang[] = lang === 'en' ? ['ko', 'ja'] : ['en', lang === 'ko' ? 'ja' : 'ko']
    for (const l of order) {
        const text = itemName(item, l)
        if (text && text !== main) return { text, lang: l }
    }
    return null
}

export default function ItemListPage() {
    const lang = useLang()
    const t = useT(itemsMessages)
    const tc = useT(commonMessages)
    const location = useLocation()
    const [params, update] = useUrlParams()
    useDocumentTitle(t('title'))
    const searchRef = useRef<HTMLDivElement>(null)
    useSlashFocus(searchRef)

    const isWide = useMediaQuery('(min-width: 640px)', true)
    const query = useMemo(() => parseItemQuery(params), [params])
    const { q, view, cats, sort, dir } = query
    const deferredQ = useDeferredValue(q)

    const setSort = (key: ItemSortKey, d: 'asc' | 'desc') =>
        update({ sort: key === 'name' ? null : key, dir: d === ITEM_SORT_DEFAULT_DIR[key] ? null : d })
    const setCats = (next: string[]) => update({ cat: next.join(',') || null })

    const filtered = useMemo(
        // 검색어만 지연된 값으로 바꿔 쓴다
        () => queryItems({ q: deferredQ, view, cats, sort, dir }, lang),
        [deferredQ, view, cats, sort, dir, lang],
    )

    const resetKey = [deferredQ, view, cats.join(','), sort, dir, lang].join('|')
    const { shown, hasMore, more, sentinelRef } = useProgressive(filtered.length, resetKey, 60)
    const hasFilters = !!(q || view !== 'all' || cats.length)
    const resetFilters = () => update({ q: null, view: null, cat: null })

    const tableSort: TableSortState = [{ sortKey: sort, direction: dir === 'asc' ? 'ascending' : 'descending' }]
    const sortable = useTableSortable<ItemRow>({
        sort: tableSort,
        onSortChange: (next) => {
            const e = next[0]
            if (!e || !SORT_KEYS.includes(e.sortKey as ItemSortKey)) return
            const key = e.sortKey as ItemSortKey
            // 다른 열로 바꿀 때는 그 열의 기본 방향부터
            setSort(key, key !== sort ? ITEM_SORT_DEFAULT_DIR[key] : e.direction === 'ascending' ? 'asc' : 'desc')
        },
    })

    const search = location.search
    const getHref = useCallback((row: ItemRow) => `/items/${row.item.name}${search}`, [search])
    const rowLink = useRowLink<ItemRow>(getHref)

    const rows = useMemo<ItemRow[]>(() => filtered.slice(0, shown).map((item) => ({ key: item.name, item })), [filtered, shown])

    const columns: TableColumn<ItemRow>[] = [
        {
            key: 'icon',
            header: <VisuallyHidden>{t('colIcon')}</VisuallyHidden>,
            width: pixel(40),
            renderCell: ({ item }) => <ItemIcon slug={item.name} size={24} />,
        },
        {
            key: 'name',
            header: t('colItem'),
            width: proportional(2, { minWidth: 160 }),
            sortable: true,
            renderCell: ({ item }) => {
                const other = otherName(item, lang)
                return (
                    <VStack gap={0}>
                        <HStack gap={2} vAlign="center">
                            <Link href={`/items/${item.name}${search}`} weight="semibold">
                                {itemName(item, lang)}
                            </Link>
                            {other && (
                                <span lang={other.lang} className="truncate">
                                    <Text type="supporting">{other.text}</Text>
                                </span>
                            )}
                        </HStack>
                        {!isWide && (
                            <HStack gap={1.5} vAlign="center" wrap="wrap">
                                <Text size="sm" color="secondary">
                                    {categoryLabel(item.category, t)}
                                </Text>
                                {view === 'berry' && <FlavorSummary flavors={item.berry?.flavors ?? null} t={t} />}
                            </HStack>
                        )}
                    </VStack>
                )
            },
        },
        ...(isWide
            ? ([
                  {
                      key: 'category',
                      header: t('colCategory'),
                      width: pixel(128),
                      sortable: true,
                      renderCell: ({ item }) => (
                          <Text size="sm" color="secondary">
                              {categoryLabel(item.category, t)}
                          </Text>
                      ),
                  },
                  {
                      key: 'desc',
                      header: t('colDesc'),
                      width: proportional(3, { minWidth: 200 }),
                      renderCell: ({ item }) => {
                          const d = itemDesc(item, lang)
                          const clean = d ? cleanDesc(d.text, d.lang) : null
                          return (
                              <HStack gap={1} wrap="nowrap" vAlign="center">
                                  <span lang={d?.lang} className="min-w-0 truncate">
                                      <Text size="sm" color="secondary">
                                          {clean ?? DASH}
                                      </Text>
                                  </span>
                                  {clean && d && d.lang !== lang && (
                                      <span className="shrink-0 whitespace-nowrap">
                                          <Text size="sm" color="secondary">
                                              {t('descFallback', { lang: LANG_LABEL[d.lang] })}
                                          </Text>
                                      </span>
                                  )}
                              </HStack>
                          )
                      },
                  },
              ] satisfies TableColumn<ItemRow>[])
            : []),
        ...(view === 'berry' && isWide
            ? ([
                  {
                      key: 'flavor',
                      header: t('colFlavor'),
                      width: pixel(240),
                      renderCell: ({ item }) => <FlavorSummary flavors={item.berry?.flavors ?? null} t={t} />,
                  },
              ] satisfies TableColumn<ItemRow>[])
            : []),
    ]

    const viewOptions = [
        { value: 'all', label: t('viewAll') },
        { value: 'battle', label: t('viewBattle') },
        { value: 'berry', label: t('viewBerry') },
    ] as const

    // 넓은 화면에서는 필터 바에 고정하고, 좁은 화면에서는 고정 영역을 줄이려고 바 아래에 둔다
    const chipRow = (
        <HStack
            gap={1.5}
            wrap="nowrap"
            vAlign="center"
            role="group"
            aria-label={t('filterCategory')}
            className="overflow-x-auto [scrollbar-width:thin]"
        >
            <FilterChip active={cats.length === 0} onClick={() => setCats([])} label={tc('all')} className="shrink-0" />
            {categoriesFor(view).map((c) => (
                <FilterChip
                    key={c}
                    active={cats.includes(c)}
                    label={categoryLabel(c, t)}
                    className="shrink-0"
                    onClick={() => setCats(cats.includes(c) ? cats.filter((x) => x !== c) : [...cats, c])}
                />
            ))}
        </HStack>
    )

    return (
        <VStack gap={2}>
            <PageHeader title={t('title')} subtitle={t('subtitle', { n: DEX_ITEMS.length })} />

            <VStack gap={2} className="sticky top-22 z-40 bg-surface py-2 lg:top-12">
                <HStack gap={3} wrap="wrap" vAlign="center">
                    <VStack ref={searchRef} className="min-w-56 flex-1">
                        <SearchField
                            value={q}
                            onChange={(v) => update({ q: v })}
                            label={t('searchLabel')}
                            placeholder={t('searchPlaceholder')}
                        />
                    </VStack>
                    <Segmented
                        label={t('view')}
                        isLabelHidden
                        value={view}
                        // 보기를 바꾸면 그 보기에 없는 분류가 남지 않게 분류를 비운다
                        onChange={(v) => update({ view: v === 'all' ? null : v, cat: null })}
                        options={ITEM_VIEWS.map((v) => viewOptions.find((o) => o.value === v)!).map((o) => ({ value: o.value, label: o.label }))}
                    />
                    <HStack gap={1} vAlign="center">
                        <SelectField
                            label={t('sortBy')}
                            isLabelHidden
                            value={sort}
                            onChange={(v) => setSort(v as ItemSortKey, ITEM_SORT_DEFAULT_DIR[v as ItemSortKey])}
                            width={isWide ? 128 : 96}
                            options={[
                                { value: 'name', label: t('sortName') },
                                { value: 'category', label: t('sortCategory') },
                            ]}
                        />
                        <IconButton
                            size="sm"
                            variant="secondary"
                            label={`${t('toggleDirection')} (${dir === 'asc' ? t('ascending') : t('descending')})`}
                            tooltip={dir === 'asc' ? t('ascending') : t('descending')}
                            icon={<Icon icon={dir === 'asc' ? 'arrowUp' : 'arrowDown'} />}
                            onClick={() => setSort(sort, dir === 'asc' ? 'desc' : 'asc')}
                        />
                    </HStack>
                    {hasFilters && isWide && <Button size="sm" variant="ghost" label={t('resetFilters')} onClick={resetFilters} />}
                </HStack>

                {isWide && chipRow}
            </VStack>

            {!isWide && chipRow}

            <HStack gap={2} vAlign="center">
                <span aria-live="polite">
                    <Text type="supporting">{tc('results', { n: filtered.length })}</Text>
                </span>
                {hasFilters && !isWide && <Button size="sm" variant="ghost" label={t('resetFilters')} onClick={resetFilters} />}
            </HStack>

            {filtered.length === 0 ? (
                <VStack gap={2} hAlign="center">
                    <EmptyState />
                    {hasFilters && <Button size="sm" variant="secondary" label={t('resetFilters')} onClick={resetFilters} />}
                </VStack>
            ) : (
                <Table<ItemRow>
                    aria-label={t('list')}
                    data={rows}
                    columns={columns}
                    idKey="key"
                    density="compact"
                    hasHover
                    textOverflow="truncate"
                    rowCount={filtered.length}
                    plugins={{ sortable, rowLink }}
                />
            )}
            <LoadMore hasMore={hasMore} onMore={more} sentinelRef={sentinelRef} />
        </VStack>
    )
}
