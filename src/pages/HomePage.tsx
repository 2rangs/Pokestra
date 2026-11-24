import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { ClickableCard } from '@astryxdesign/core/ClickableCard'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { Text } from '@astryxdesign/core/Text'
import { Typeahead, TypeaheadItem, type SearchableItem, type SearchSource } from '@astryxdesign/core/Typeahead'
import { VStack } from '@astryxdesign/core/VStack'
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden'
import { StatBar } from '../components/ui/shared'
import { TypeChip } from '../components/ui/TypeChip'
import { PokeImage } from '../components/ui/PokeImage'
import { TYPE_COLOR_CLASSES } from '../lib/typeColorClasses'
import { DEX_ITEMS } from '../lib/items'
import { pokemonImageCandidates } from '../lib/images'
import { buildSearchKey, foldSearch, padDexNo } from '../components/dex/text'
import { formatNumber, useDocumentTitle, useLang, useT } from '../i18n'
import { homeMessages } from '../i18n/messages/home'
import {
    ABILITIES,
    ALL_POKEMON,
    type DexPokemon,
    displayName,
    GENERATIONS,
    getDexPokemon,
    getSpeciesId,
    isAlternateForm,
    MOVES,
    STAT_KEYS,
    statLabel,
} from '../lib/dex'
import { useSlashFocus } from '../hooks/useSlashFocus'
import { usePokedexStore } from '../stores/pokedexStore'

type HomeKey = keyof typeof homeMessages.ko

// ── 데이터 ──

interface Indexed {
    p: DexPokemon
    speciesId: number
    form: boolean
    key: string
}

const INDEX: readonly Indexed[] = ALL_POKEMON.map((p) => ({
    p,
    speciesId: getSpeciesId(p),
    form: isAlternateForm(p),
    key: buildSearchKey(p.name, p.nameKo, p.nameEn, p.nameJa),
}))

const SPECIES = ALL_POKEMON.filter((p) => !isAlternateForm(p))
const POTD_POOL = SPECIES.filter((p) => p.sprite)

const COUNTS = {
    species: SPECIES.length,
    all: ALL_POKEMON.length,
    moves: MOVES.filter((m) => m.type !== 'shadow').length,
    abilities: ABILITIES.length,
    items: DEX_ITEMS.length,
}

const byId = (ids: number[]) => ids.map((id) => getDexPokemon(id)).filter((p): p is DexPokemon => !!p)

/** 검색창 아래 바로가기 */
const POPULAR = byId([25, 6, 445, 149, 94, 448, 700, 1000])

/** 세대별 스타팅 포켓몬 (풀, 불꽃, 물) */
const STARTERS: Record<number, number[]> = {
    1: [1, 4, 7],
    2: [152, 155, 158],
    3: [252, 255, 258],
    4: [387, 390, 393],
    5: [495, 498, 501],
    6: [650, 653, 656],
    7: [722, 725, 728],
    8: [810, 813, 816],
    9: [906, 909, 912],
}

/** 도구 카드 그림에 쓰는 포켓몬 */

const MAX_SUGGESTIONS = 6

function findPokemon(query: string): DexPokemon[] {
    const raw = query.trim().replace(/^#/, '')
    if (!raw) return []
    if (/^\d+$/.test(raw)) {
        const n = Number(raw)
        return INDEX.filter((e) => e.speciesId === n)
            .sort((a, b) => Number(a.form) - Number(b.form))
            .slice(0, MAX_SUGGESTIONS)
            .map((e) => e.p)
    }
    const needle = foldSearch(raw)
    if (!needle) return []
    const scored: { e: Indexed; score: number }[] = []
    for (const e of INDEX) {
        const names = e.key.split('\u0000')
        let score = -1
        if (names.some((n) => n === needle)) score = 0
        else if (names.some((n) => n.startsWith(needle))) score = 1
        else if (e.key.includes(needle)) score = 2
        if (score >= 0) scored.push({ e, score: score * 2 + Number(e.form) })
    }
    return scored
        .sort((a, b) => a.score - b.score || a.e.speciesId - b.e.speciesId || a.e.p.id - b.e.p.id)
        .slice(0, MAX_SUGGESTIONS)
        .map((x) => x.e.p)
}

/** 오늘 날짜(로컬) → 결정적인 포켓몬 */
function todayKey(): string {
    const d = new Date()
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function pokemonOfDay(key: string): DexPokemon {
    // FNV-1a
    let h = 0x811c9dc5
    for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i)
        h = Math.imul(h, 0x01000193)
    }
    return POTD_POOL[(h >>> 0) % POTD_POOL.length]
}


// ── 페이지 ──

export default function HomePage() {
    const t = useT(homeMessages)
    useDocumentTitle(null)

    return (
        <VStack gap={4}>
            {/* 검색 + 오늘의 포켓몬 */}
            <section className="grid items-start gap-4 lg:grid-cols-3">
                <VStack gap={4} className="min-w-0 lg:col-span-2">
                    <VStack gap={3}>
                        <Heading level={1} type="display-3" textWrap="balance">
                            {t('heroTitle')}
                        </Heading>
                        <VisuallyHidden>
                            <p>{t('heroLead')}</p>
                        </VisuallyHidden>
                        <HeroSearch />
                        <PopularPokemon />
                    </VStack>
                    <ShortcutsSection />
                </VStack>
                <PokemonOfTheDay />
            </section>

            <GenerationsSection />
        </VStack>
    )
}

function SectionHeading({ id, children }: { id: string; children: string }) {
    return (
        <Heading level={2} id={id}>
            {children}
        </Heading>
    )
}

const SPRITE_BOX: Record<number, string> = { 32: 'h-8 w-8', 40: 'h-10 w-10', 48: 'h-12 w-12' }

/** 도트 스프라이트 */
function Sprite({ p, size = 48, className = '' }: { p: DexPokemon; size?: number; className?: string }) {
    const box = SPRITE_BOX[size] ?? ''
    return <PokeImage sources={pokemonImageCandidates(p.id, size, { sprite: p.sprite })} alt="" size={size} className={`${box} ${className}`} />
}

// ── 자주 찾는 포켓몬 ──

function PopularPokemon() {
    const lang = useLang()
    const t = useT(homeMessages)
    return (
        <VStack gap={1}>
            <Text type="supporting" color="secondary">
                {t('popularLabel')}
            </Text>
            <ul className="flex gap-2 overflow-x-auto pb-0.5">
                {POPULAR.map((p) => (
                    <li key={p.id} className="shrink-0">
                        <Link
                            to={`/pokemon/${p.id}`}
                            className="flex min-h-11 items-center gap-1 rounded-full border border-border bg-surface py-0.5 pr-3 pl-1 text-sm text-primary transition-colors sm:min-h-0 hover:border-border-emphasized hover:bg-muted"
                        >
                            <Sprite p={p} size={32} />
                            {displayName(p, lang)}
                        </Link>
                    </li>
                ))}
            </ul>
        </VStack>
    )
}

// ── 오늘의 포켓몬 ──

function PokemonOfTheDay() {
    const lang = useLang()
    const t = useT(homeMessages)
    const [key] = useState(todayKey)
    const p = useMemo(() => pokemonOfDay(key), [key])
    const name = displayName(p, lang)
    const colors = TYPE_COLOR_CLASSES[p.types[0]] ?? TYPE_COLOR_CLASSES.normal
    const maxStat = Math.max(...STAT_KEYS.map((k) => p.stats[k]))

    return (
        <Card role="region" aria-labelledby="potd-heading" padding={4}>
            <VStack gap={3}>
                <HStack gap={2} justify="between" vAlign="center">
                    <Text type="supporting" weight="semibold" id="potd-heading">
                        {t('potdTitle')}
                    </Text>
                    <Text type="supporting" color="secondary" hasTabularNumbers>
                        {padDexNo(getSpeciesId(p))}
                    </Text>
                </HStack>
                <HStack gap={3} vAlign="center">
                    <Link to={`/pokemon/${p.id}`} className="block shrink-0 rounded-lg bg-muted" aria-label={name}>
                        <PokeImage
                            sources={pokemonImageCandidates(p.id, 96, { sprite: p.sprite })}
                            alt=""
                            size={96}
                            priority
                            className="h-24 w-24"
                        />
                    </Link>
                    <VStack gap={1.5}>
                        <Heading level={2} maxLines={2}>
                            {name}
                        </Heading>
                        <HStack gap={1.5} wrap="wrap">
                            {p.types.map((ty) => (
                                <TypeChip key={ty} type={ty} />
                            ))}
                        </HStack>
                    </VStack>
                </HStack>
                <VStack as="ul" gap={1} aria-label={t('potdTitle')}>
                    {STAT_KEYS.map((k) => {
                        const top = p.stats[k] === maxStat
                        return (
                            <HStack as="li" key={k} gap={3} vAlign="center">
                                <HStack className="w-18 shrink-0 sm:w-20">
                                    <Text color={top ? 'primary' : 'secondary'} weight={top ? 'semibold' : 'normal'} maxLines={1}>
                                        {statLabel(k, lang, true)}
                                    </Text>
                                </HStack>
                                <HStack justify="end" className="w-9 shrink-0 sm:w-10">
                                    <Text weight="semibold" hasTabularNumbers>
                                        {p.stats[k]}
                                    </Text>
                                </HStack>
                                <HStack className="min-w-0 flex-1">
                                    <StatBar value={p.stats[k]} max={200} fillClass={colors.fill} label={statLabel(k, lang)} />
                                </HStack>
                            </HStack>
                        )
                    })}
                </VStack>
                <Button variant="primary" href={`/pokemon/${p.id}`} label={t('potdCta')} />
            </VStack>
        </Card>
    )
}

// ── 바로 가기 ──

function ShortcutsSection() {
    const lang = useLang()
    const t = useT(homeMessages)
    const items: { to: string; title: HomeKey; count: HomeKey; n: number }[] = [
        { to: '/pokedex', title: 'featPokedexTitle', count: 'countSpecies', n: COUNTS.species },
        { to: '/moves', title: 'featMovesTitle', count: 'countMoves', n: COUNTS.moves },
        { to: '/abilities', title: 'featAbilitiesTitle', count: 'countAbilities', n: COUNTS.abilities },
        { to: '/items', title: 'featItemsTitle', count: 'countItems', n: COUNTS.items },
        { to: '/sprites', title: 'featSpritesTitle', count: 'countSprites', n: COUNTS.all },
    ]
    return (
        // 좁은 화면에서는 아래 탭 줄이 같은 일을 하므로 숨긴다 (오늘의 포켓몬이 첫 화면에 오게)
        <VStack as="section" gap={2} aria-labelledby="shortcuts-heading" className="max-lg:hidden">
            <SectionHeading id="shortcuts-heading">{t('toolsHeading')}</SectionHeading>
            <Grid columns={{ minWidth: 148, repeat: 'fit' }} gap={2}>
                {items.map((it) => (
                    <ClickableCard key={it.to} href={it.to} label={t(it.title)} padding={3}>
                        <HStack gap={2} vAlign="center" justify="between">
                            <VStack gap={0}>
                                <Text weight="semibold">{t(it.title)}</Text>
                                <Text type="supporting" color="secondary" hasTabularNumbers maxLines={1}>
                                    {t(it.count, { n: formatNumber(it.n, lang) })}
                                </Text>
                            </VStack>
                            <Icon icon="chevronRight" color="secondary" />
                        </HStack>
                    </ClickableCard>
                ))}
            </Grid>
        </VStack>
    )
}

// ── 세대별 ──

function GenerationsSection() {
    const lang = useLang()
    const t = useT(homeMessages)
    const navigate = useNavigate()
    const resetFilters = usePokedexStore((s) => s.resetFilters)
    const toggleGeneration = usePokedexStore((s) => s.toggleGeneration)

    const open = (id: number) => {
        resetFilters()
        toggleGeneration(id)
        navigate('/pokedex')
    }

    return (
        <VStack as="section" gap={2} aria-labelledby="gens-heading">
            <SectionHeading id="gens-heading">{t('gensHeading')}</SectionHeading>
            <Grid columns={{ minWidth: 300, max: 3 }} gap={3}>
                {GENERATIONS.filter((g) => STARTERS[g.id]).map((g) => {
                    const title = `${generationTitle(g.id, lang)} ${t(`region${g.id}` as HomeKey)}`
                    return (
                        <ClickableCard key={g.id} label={title} onClick={() => open(g.id)}>
                            <HStack gap={3} align="center" justify="between">
                                <VStack gap={0.5}>
                                    <Heading level={3}>{title}</Heading>
                                    <Text type="supporting" color="secondary" hasTabularNumbers>
                                        {t('genSpecies', { n: formatNumber(g.pokemonSpecies.length, lang) })}
                                    </Text>
                                </VStack>
                                <HStack gap={1} className="shrink-0" aria-hidden>
                                    {byId(STARTERS[g.id]).map((p) => (
                                        <Sprite key={p.id} p={p} size={40} />
                                    ))}
                                </HStack>
                            </HStack>
                        </ClickableCard>
                    )
                })}
            </Grid>
        </VStack>
    )
}

function generationTitle(id: number, lang: string): string {
    if (lang === 'ko') return `${id}세대`
    if (lang === 'ja') return `第${id}世代`
    return `Gen ${id}`
}

// ── 검색 (Astryx Typeahead) ──

type Suggestion = SearchableItem<{ kind: 'pokemon'; p: DexPokemon } | { kind: 'all'; q: string }>

function HeroSearch() {
    const lang = useLang()
    const t = useT(homeMessages)
    const navigate = useNavigate()
    const setNameSearch = usePokedexStore((s) => s.setNameSearch)
    const queryRef = useRef('')
    const searchRef = useRef<HTMLSpanElement>(null)
    useSlashFocus(searchRef)

    const goPokedex = (q: string) => {
        setNameSearch(q)
        navigate('/pokedex')
    }

    // 후보: 맞는 포켓몬 몇 개 + 마지막에 "도감에서 검색"
    const source = useMemo<SearchSource<Suggestion>>(
        () => ({
            search(query) {
                const q = query.trim()
                if (!q) return []
                const items: Suggestion[] = findPokemon(q).map((p) => ({
                    id: `p-${p.id}`,
                    label: displayName(p, lang),
                    auxiliaryData: { kind: 'pokemon', p },
                }))
                items.push({ id: 'all', label: t('searchAll', { q }), auxiliaryData: { kind: 'all', q } })
                return items
            },
            bootstrap: () => [],
        }),
        [lang, t],
    )

    const choose = (item: Suggestion | null) => {
        const d = item?.auxiliaryData
        if (!d) return
        if (d.kind === 'pokemon') navigate(`/pokemon/${d.p.id}`)
        else goPokedex(d.q)
    }

    const submit = () => {
        const q = queryRef.current.trim()
        if (!q) return
        const first = findPokemon(q)[0]
        if (first) navigate(`/pokemon/${first.id}`)
        else goPokedex(q)
    }

    return (
        <form
            role="search"
            onSubmit={(e) => {
                e.preventDefault()
                submit()
            }}
        >
            <HStack gap={2} vAlign="end">
                <span ref={searchRef} className="min-w-0 flex-1">
                    <Typeahead<Suggestion>
                        label={t('searchLabel')}
                        isLabelHidden
                        placeholder={t('searchPlaceholder')}
                        size="lg"
                        width="100%"
                        startIcon={<Icon icon="search" />}
                        searchSource={source}
                        debounceMs={0}
                        maxMenuItems={MAX_SUGGESTIONS + 1}
                        value={null}
                        onChange={choose}
                        onChangeQuery={(q) => {
                            queryRef.current = q
                        }}
                        emptySearchText={t('searchEmpty')}
                        renderItem={(item) => {
                            const d = item.auxiliaryData
                            if (d?.kind !== 'pokemon') return <TypeaheadItem item={item} icon={<Icon icon="search" />} />
                            return (
                                <TypeaheadItem
                                    item={item}
                                    description={padDexNo(getSpeciesId(d.p))}
                                    icon={
                                        d.p.sprite ? (
                                            <PokeImage sources={pokemonImageCandidates(d.p.id, 32, { sprite: d.p.sprite })} alt="" size={32} className="h-8 w-8" />
                                        ) : undefined
                                    }
                                />
                            )
                        }}
                    />
                </span>
                <Button type="submit" variant="primary" size="lg" label={t('searchSubmit')} />
            </HStack>
        </form>
    )
}

