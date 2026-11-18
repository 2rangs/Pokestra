import { useDeferredValue, useMemo, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router'
import { Badge } from '@astryxdesign/core/Badge'
import { Button } from '@astryxdesign/core/Button'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { IconButton } from '@astryxdesign/core/IconButton'
import { Link } from '@astryxdesign/core/Link'
import { Switch } from '@astryxdesign/core/Switch'
import { pixel, proportional, Table, type TableColumn, type TableSortState, useTableSortable } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import {
    BackLink,
    ClassBadge,
    EmptyState,
    FilterRow,
    LoadMore,
    PageHeader,
    PokemonChip,
    SearchField,
    Segmented,
    SelectField,
} from '../components/dex/DexUi'
import { FactList, Panel, type Fact } from '../components/pokedex/DetailPanel'
import { TypeChip } from '../components/ui/TypeChip'
import { buildSearchKey, cleanDesc, foldSearch } from '../components/dex/text'
import { useProgressive } from '../components/dex/useProgressive'
import { useUrlParams } from '../components/dex/useUrlParams'
import { useSlashFocus } from '../hooks/useSlashFocus'
import { collator, LANGS, useDocumentTitle, useLang, useT } from '../i18n'
import { commonMessages } from '../i18n/messages/common'
import { movesMessages } from '../i18n/messages/moves'
import {
    damageClassName,
    type DexMove,
    generationName,
    getSpeciesId,
    isAlternateForm,
    localText,
    MOVE_BY_NAME,
    MOVES,
    moveName,
    pokemonWithMove,
    TYPES,
    typeName,
} from '../lib/dex'

// ── 데이터 (모듈 로드 시 1회) ──

const LIST_MOVES: readonly DexMove[] = MOVES.filter((m) => m.type !== 'shadow')
const SEARCH_INDEX = new Map(
    LIST_MOVES.map((m) => [m.name, buildSearchKey(m.name, m.hasKoreanName ? m.nameKo : null, m.nameEn, m.nameJa)]),
)
const MOVE_TYPES = TYPES.map((t) => t.name).filter((t) => LIST_MOVES.some((m) => m.type === t))
const MOVE_GENS = [...new Set(LIST_MOVES.map((m) => m.generation).filter((g): g is number => g != null))].sort((a, b) => a - b)
const CLASSES = ['physical', 'special', 'status'] as const

type SortKey = 'name' | 'power' | 'accuracy' | 'pp' | 'id'
const SORT_KEYS: readonly SortKey[] = ['name', 'power', 'accuracy', 'pp', 'id']
const DEFAULT_DIR: Record<SortKey, 'asc' | 'desc'> = { name: 'asc', id: 'asc', power: 'desc', accuracy: 'desc', pp: 'desc' }

function numericValue(m: DexMove, key: Exclude<SortKey, 'name'>): number | null {
    if (key === 'id') return m.id
    return m[key]
}

const DASH = '-'
const fmt = (v: number | null, suffix = '') => (v == null ? DASH : `${v}${suffix}`)

export default function MovesPage() {
    const { slug } = useParams()
    return slug ? <MoveDetail slug={slug} /> : <MoveList />
}

// ── 목록 ──

interface MoveRow extends Record<string, unknown> {
    key: string
    m: DexMove
}

function MoveList() {
    const lang = useLang()
    const t = useT(movesMessages)
    const tc = useT(commonMessages)
    const location = useLocation()
    const [params, update] = useUrlParams()
    useDocumentTitle(t('title'))

    const q = params.get('q') ?? ''
    const type = params.get('type') ?? ''
    const cls = params.get('cls') ?? ''
    const gen = params.get('gen') ?? ''
    const sortParam = params.get('sort') as SortKey | null
    const sort: SortKey = sortParam && SORT_KEYS.includes(sortParam) ? sortParam : 'name'
    const dir = params.get('dir') === 'desc' || params.get('dir') === 'asc' ? (params.get('dir') as 'asc' | 'desc') : DEFAULT_DIR[sort]

    const setSort = (key: SortKey, d: 'asc' | 'desc') =>
        update({ sort: key === 'name' ? null : key, dir: d === DEFAULT_DIR[key] ? null : d })

    const deferredQ = useDeferredValue(q)
    const searchRef = useRef<HTMLDivElement>(null)
    useSlashFocus(searchRef)

    const filtered = useMemo(() => {
        const needle = foldSearch(deferredQ)
        const genNum = gen ? Number(gen) : null
        const list = LIST_MOVES.filter(
            (m) =>
                (!type || m.type === type) &&
                (!cls || m.damageClass === cls) &&
                (genNum == null || m.generation === genNum) &&
                (!needle || SEARCH_INDEX.get(m.name)!.includes(needle)),
        )
        const sign = dir === 'asc' ? 1 : -1
        if (sort === 'name') {
            const c = collator(lang)
            const names = new Map(list.map((m) => [m.name, moveName(m.name, lang)]))
            list.sort((a, b) => sign * c.compare(names.get(a.name)!, names.get(b.name)!))
        } else {
            list.sort((a, b) => {
                const va = numericValue(a, sort)
                const vb = numericValue(b, sort)
                // 값 없음(-)은 방향과 상관없이 맨 뒤
                if (va == null && vb == null) return a.id - b.id
                if (va == null) return 1
                if (vb == null) return -1
                return sign * (va - vb) || a.id - b.id
            })
        }
        return list
    }, [deferredQ, type, cls, gen, sort, dir, lang])

    const resetKey = [deferredQ, type, cls, gen, sort, dir, lang].join('|')
    const { shown, hasMore, more, sentinelRef } = useProgressive(filtered.length, resetKey, 60)
    const hasFilters = !!(q || type || cls || gen)

    // 표 머리 정렬 (id 는 열이 없어 표 머리에서는 정렬 표시가 없다)
    const tableSort: TableSortState = sort === 'id' ? [] : [{ sortKey: sort, direction: dir === 'asc' ? 'ascending' : 'descending' }]
    const sortable = useTableSortable<MoveRow>({
        sort: tableSort,
        onSortChange: (next) => {
            const e = next[0]
            if (!e || !SORT_KEYS.includes(e.sortKey as SortKey)) return
            const key = e.sortKey as SortKey
            // 다른 열로 바꿀 때는 그 열의 기본 방향부터
            const d = key !== sort ? DEFAULT_DIR[key] : e.direction === 'ascending' ? 'asc' : 'desc'
            setSort(key, d)
        },
    })

    const rows = useMemo<MoveRow[]>(() => filtered.slice(0, shown).map((m) => ({ key: m.name, m })), [filtered, shown])
    const search = location.search

    const columns: TableColumn<MoveRow>[] = [
        {
            key: 'name',
            header: t('colMove'),
            width: proportional(2, { minWidth: 132 }),
            sortable: true,
            renderCell: ({ m }) => (
                <Link href={`/moves/${m.name}${search}`} weight="semibold">
                    {moveName(m.name, lang)}
                </Link>
            ),
        },
        { key: 'type', header: t('type'), width: pixel(108), renderCell: ({ m }) => <TypeChip type={m.type} size="sm" /> },
        {
            key: 'cls',
            header: t('category'),
            width: pixel(84),
            renderCell: ({ m }) => <ClassBadge damageClass={m.damageClass} label={damageClassName(m.damageClass, lang)} />,
        },
        { key: 'power', header: t('power'), width: pixel(76), align: 'end', sortable: true, renderCell: ({ m }) => <Num v={m.power} /> },
        { key: 'accuracy', header: t('accuracy'), width: pixel(84), align: 'end', sortable: true, renderCell: ({ m }) => <Num v={m.accuracy} /> },
        { key: 'pp', header: t('pp'), width: pixel(60), align: 'end', sortable: true, renderCell: ({ m }) => <Num v={m.pp} /> },
    ]

    return (
        <VStack gap={4}>
            <PageHeader title={t('title')} subtitle={t('subtitle', { n: LIST_MOVES.length })} />

            <FilterRow
                label={tc('filters')}
                search={
                    <HStack ref={searchRef} width="100%">
                        <SearchField
                            value={q}
                            onChange={(v) => update({ q: v })}
                            label={t('searchLabel')}
                            placeholder={t('searchPlaceholder')}
                        />
                    </HStack>
                }
                end={
                    <span aria-live="polite">
                        <Text type="supporting">{tc('results', { n: filtered.length })}</Text>
                    </span>
                }
            >
                <SelectField
                    isLabelHidden
                    label={t('filterType')}
                    value={type}
                    onChange={(v) => update({ type: v || null })}
                    width={140}
                    options={[
                        { value: '', label: tc('all') },
                        ...MOVE_TYPES.map((ty) => ({ value: ty, label: typeName(ty, lang) })),
                    ]}
                />
                <Segmented
                    isLabelHidden
                    label={t('filterClass')}
                    value={cls || 'all'}
                    onChange={(v) => update({ cls: v === 'all' ? null : v })}
                    options={[
                        { value: 'all', label: tc('all') },
                        ...CLASSES.map((c) => ({ value: c, label: damageClassName(c, lang) })),
                    ]}
                />
                <SelectField
                    isLabelHidden
                    label={t('filterGen')}
                    value={gen}
                    onChange={(v) => update({ gen: v || null })}
                    width={140}
                    options={[
                        { value: '', label: tc('all') },
                        ...MOVE_GENS.map((g) => ({ value: String(g), label: generationName(g, lang) })),
                    ]}
                />
                <HStack gap={1} vAlign="end">
                    <SelectField
                        isLabelHidden
                        label={t('sortBy')}
                        value={sort}
                        onChange={(v) => setSort(v as SortKey, DEFAULT_DIR[v as SortKey])}
                        width={140}
                        options={[
                            { value: 'name', label: t('sortName') },
                            { value: 'power', label: t('sortPower') },
                            { value: 'accuracy', label: t('sortAccuracy') },
                            { value: 'pp', label: t('sortPp') },
                            { value: 'id', label: t('sortId') },
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
                {hasFilters && (
                    <Button
                        size="sm"
                        variant="ghost"
                        label={t('resetFilters')}
                        onClick={() => update({ q: null, type: null, cls: null, gen: null })}
                    />
                )}
            </FilterRow>

            <VStack gap={2}>
                {filtered.length === 0 ? (
                    <EmptyState />
                ) : (
                    <Table<MoveRow>
                        aria-label={t('list')}
                        data={rows}
                        columns={columns}
                        idKey="key"
                        density="compact"
                        hasHover
                        rowCount={filtered.length}
                        plugins={{ sortable }}
                    />
                )}
                <LoadMore hasMore={hasMore} onMore={more} sentinelRef={sentinelRef} />
            </VStack>
        </VStack>
    )
}

function Num({ v }: { v: number | null }) {
    return (
        <Text size="sm" hasTabularNumbers color={v == null ? 'secondary' : 'primary'}>
            {fmt(v)}
        </Text>
    )
}

// ── 상세 ──

function MoveDetail({ slug }: { slug: string }) {
    const lang = useLang()
    const t = useT(movesMessages)
    const location = useLocation()
    const move = MOVE_BY_NAME.get(slug)
    const valid = move && move.type !== 'shadow' ? move : null
    const name = valid ? moveName(valid.name, lang) : null
    useDocumentTitle(name ? `${name} · ${t('title')}` : t('notFound'))
    const backTo = `/moves${location.search}`

    if (!valid) {
        return (
            <VStack gap={2}>
                <BackLink to={backTo}>{t('back')}</BackLink>
                <EmptyState title={t('notFound')} description={t('notFoundBody')} />
            </VStack>
        )
    }

    const m = valid
    const desc = cleanDesc(localText(m.desc, lang), lang)
    const others = LANGS.filter((l) => l !== lang)
        .map((l) => ({ l, n: moveName(m.name, l) }))
        .filter((o, i, arr) => o.n !== name && arr.findIndex((x) => x.n === o.n) === i)

    const hint = (label: string, content: string) => ({ label: t('infoAbout', { label }), content })
    const facts: Fact[] = [
        { label: t('power'), value: fmt(m.power), hint: hint(t('power'), t('powerHint')) },
        { label: t('accuracy'), value: fmt(m.accuracy, '%'), hint: hint(t('accuracy'), t('accuracyHint')) },
        { label: t('pp'), value: fmt(m.pp), hint: hint(t('pp'), t('ppHint')) },
        { label: t('priority'), value: m.priority > 0 ? `+${m.priority}` : String(m.priority), hint: hint(t('priority'), t('priorityHint')) },
        { label: t('category'), value: damageClassName(m.damageClass, lang), hint: hint(t('category'), t('categoryHint')) },
        { label: t('introduced'), value: m.generation ? generationName(m.generation, lang) : DASH },
    ]

    return (
        <VStack gap={4}>
            <BackLink to={backTo}>{t('back')}</BackLink>
            <VStack gap={4} className="lg:flex-row lg:items-start">
                <VStack gap={3} className="lg:sticky lg:top-16 lg:w-80 lg:shrink-0">
                    <VStack gap={2}>
                        <Heading level={1}>{name}</Heading>
                        {others.length > 0 && (
                            <HStack gap={3} wrap="wrap" aria-label={t('otherNames')}>
                                {others.map((o) => (
                                    <span key={o.l} lang={o.l}>
                                        <Text color="secondary">{o.n}</Text>
                                    </span>
                                ))}
                            </HStack>
                        )}
                        <HStack gap={2} align="center" wrap="wrap">
                            <TypeChip type={m.type} size="md" />
                        </HStack>
                    </VStack>
                    <Panel>
                        <FactList facts={facts} />
                        <VStack gap={1.5}>
                            <Heading level={2}>{t('description')}</Heading>
                            <VStack className="max-w-prose">
                                <Text as="p" color={desc ? 'primary' : 'secondary'}>
                                    {desc ?? t('noDescription')}
                                </Text>
                            </VStack>
                        </VStack>
                    </Panel>
                </VStack>
                <VStack className="min-w-0 flex-1">
                    <Learners key={m.name} slug={m.name} />
                </VStack>
            </VStack>
        </VStack>
    )
}

function Learners({ slug }: { slug: string }) {
    const t = useT(movesMessages)
    const [withForms, setWithForms] = useState(false)

    const all = useMemo(
        () => [...pokemonWithMove(slug)].sort((a, b) => getSpeciesId(a) - getSpeciesId(b) || a.id - b.id),
        [slug],
    )
    const base = useMemo(() => all.filter((p) => !isAlternateForm(p)), [all])
    const hasForms = base.length !== all.length
    const list = withForms || base.length === 0 ? all : base
    const { shown, hasMore, more, sentinelRef } = useProgressive(list.length, `${slug}|${withForms}`, 96)

    return (
        <section aria-labelledby="learners-heading">
            <VStack gap={3}>
                <HStack gap={3} align="center" justify="between" wrap="wrap">
                    <HStack gap={2} align="center">
                        <Heading level={2} id="learners-heading">
                            {t('learners')}
                        </Heading>
                        <Badge variant="neutral" label={list.length} aria-label={t('learnersCount', { n: list.length })} />
                    </HStack>
                    {hasForms && base.length > 0 && (
                        <Switch size="sm" label={t('includeForms')} value={withForms} onChange={setWithForms} />
                    )}
                </HStack>
                {list.length === 0 ? (
                    <EmptyState title={t('noLearners')} />
                ) : (
                    <Grid columns={{ minWidth: 176, max: 4 }} gap={2}>
                        {list.slice(0, shown).map((p) => (
                            <PokemonChip key={p.id} pokemon={p} />
                        ))}
                    </Grid>
                )}
                <LoadMore hasMore={hasMore} onMore={more} sentinelRef={sentinelRef} />
            </VStack>
        </section>
    )
}
