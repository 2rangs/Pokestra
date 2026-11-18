import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@astryxdesign/core/Button'
import { ClickableCard } from '@astryxdesign/core/ClickableCard'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { Text } from '@astryxdesign/core/Text'
import { Typeahead, TypeaheadItem, type SearchableItem, type SearchSource } from '@astryxdesign/core/Typeahead'
import { VStack } from '@astryxdesign/core/VStack'
import { TypeTag, StatBar } from '../components/ui/shared'
import { PokeImage } from '../components/ui/PokeImage'
import { typeColor } from '../components/ui/utils'
import { pokemonImageCandidates } from '../lib/images'
import { buildSearchKey, foldSearch, padDexNo } from '../components/dex/text'
import { formatNumber, useDocumentTitle, useLang, useT } from '../i18n'
import { homeMessages } from '../i18n/messages/home'
import {
    ABILITIES,
    ALL_POKEMON,
    baseStatTotal,
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
const DEX_PREVIEW = byId([1, 4, 7, 25, 133, 143, 150, 249, 384, 445])

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
        <div className="flex flex-col gap-12 sm:gap-16">
            {/* 검색 + 오늘의 포켓몬 */}
            <section className="grid items-center gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-10">
                <VStack gap={5}>
                    <VStack gap={2}>
                        <Heading level={1} type="display-3" textWrap="balance">
                            {t('heroTitle')}
                        </Heading>
                        <span className="max-w-[56ch]">
                            <Text as="p" type="large" color="secondary">
                                {t('heroLead')}
                            </Text>
                        </span>
                    </VStack>
                    <HeroSearch />
                    <PopularPokemon />
                </VStack>
                <PokemonOfTheDay />
            </section>

            <ToolsSection />
            <ReferenceSection />
            <GenerationsSection />
        </div>
    )
}

function SectionHeading({ id, children }: { id: string; children: string }) {
    return (
        <span className="mb-4 block">
            <Heading level={2} id={id}>
                {children}
            </Heading>
        </span>
    )
}

const SPRITE_BOX: Record<number, string> = { 32: 'h-8 w-8', 48: 'h-12 w-12', 56: 'h-14 w-14' }
const SPRITE_FLUID_MAX: Record<number, string> = { 60: 'max-w-15' }

/** 도트 스프라이트. fluid 면 부모 너비에 맞춰 줄어든다 */
function Sprite({ p, size = 48, className = '', fluid = false }: { p: DexPokemon; size?: number; className?: string; fluid?: boolean }) {
    const box = fluid ? `aspect-square w-full ${SPRITE_FLUID_MAX[size] ?? ''}` : (SPRITE_BOX[size] ?? '')
    return <PokeImage sources={pokemonImageCandidates(p.id, size, { sprite: p.sprite })} alt="" size={size} className={`${box} ${className}`} />
}

// ── 자주 찾는 포켓몬 ──

function PopularPokemon() {
    const lang = useLang()
    const t = useT(homeMessages)
    return (
        <VStack gap={2}>
            <Text type="supporting" color="secondary">
                {t('popularLabel')}
            </Text>
            <ul className="flex flex-wrap gap-2">
                {POPULAR.map((p) => (
                    <li key={p.id}>
                        <Link
                            to={`/pokemon/${p.id}`}
                            className="flex items-center gap-1 rounded-full border border-border bg-surface py-0.5 pr-3 pl-1 text-sm text-primary transition-colors hover:border-border-emphasized hover:bg-muted"
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
    const color = typeColor(p.types[0])
    const maxStat = Math.max(...STAT_KEYS.map((k) => p.stats[k]))

    return (
        <section
            aria-labelledby="potd-heading"
            className="overflow-hidden rounded-xl border border-border"
            style={{ background: `color-mix(in srgb, ${color} 14%, var(--color-background-surface))` }}
        >
            <div className="flex items-center justify-between gap-2 px-5 pt-4">
                <Text type="supporting" weight="semibold" id="potd-heading">
                    {t('potdTitle')}
                </Text>
                <Text type="supporting" color="secondary" hasTabularNumbers>
                    {padDexNo(getSpeciesId(p))}
                </Text>
            </div>
            <div className="flex flex-col gap-4 px-5 pb-5">
                <div className="flex items-center gap-4">
                    <Link to={`/pokemon/${p.id}`} className="block shrink-0" aria-label={name}>
                        <PokeImage
                            sources={pokemonImageCandidates(p.id, 176, { sprite: p.sprite })}
                            alt=""
                            size={176}
                            priority
                            className="h-28 w-28 min-[420px]:h-36 min-[420px]:w-36 sm:h-44 sm:w-44"
                        />
                    </Link>
                    <VStack gap={2}>
                        <Heading level={2} maxLines={2}>
                            {name}
                        </Heading>
                        <HStack gap={1.5} wrap="wrap">
                            {p.types.map((ty) => (
                                <TypeTag key={ty} type={ty} size="md" />
                            ))}
                        </HStack>
                        <Text color="secondary" hasTabularNumbers>
                            {t('potdTotal')} <Text weight="semibold" color="primary">{baseStatTotal(p)}</Text>
                        </Text>
                    </VStack>
                </div>
                <dl className="grid grid-cols-[4.5rem_2.25rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 text-sm sm:grid-cols-[5rem_2.5rem_minmax(0,1fr)]">
                    {STAT_KEYS.map((k) => (
                        <div key={k} className="contents">
                            <dt className="truncate text-secondary">{statLabel(k, lang, true)}</dt>
                            <dd className="text-right font-semibold tabular-nums">{p.stats[k]}</dd>
                            <dd>
                                <StatBar value={p.stats[k]} highlight={p.stats[k] === maxStat} label={statLabel(k, lang)} />
                            </dd>
                        </div>
                    ))}
                </dl>
                <span>
                    <Button variant="primary" href={`/pokemon/${p.id}`} label={t('potdCta')} />
                </span>
            </div>
        </section>
    )
}

// ── 도구 ──

function ToolCard({ href, title, desc, children }: { href: string; title: string; desc: string; children: ReactNode }) {
    return (
        <ClickableCard href={href} label={title} padding={0} height="100%">
            <span className="flex h-36 items-center justify-center overflow-hidden border-b border-border bg-muted sm:h-40">
                {children}
            </span>
            <span className="block p-4">
                <VStack gap={1}>
                    <Heading level={3}>{title}</Heading>
                    <Text color="secondary">{desc}</Text>
                </VStack>
            </span>
        </ClickableCard>
    )
}

function ToolsSection() {
    const t = useT(homeMessages)
    return (
        <section aria-labelledby="tools-heading">
            <SectionHeading id="tools-heading">{t('toolsHeading')}</SectionHeading>
            <div className="grid gap-4 md:grid-cols-3">
                <ToolCard href="/pokedex" title={t('featPokedexTitle')} desc={t('featPokedexDesc')}>
                    <span className="grid w-full max-w-80 grid-cols-5 justify-items-center px-3" aria-hidden>
                        {DEX_PREVIEW.map((p) => (
                            <Sprite key={p.id} p={p} size={60} fluid />
                        ))}
                    </span>
                </ToolCard>

                <ToolCard href="/calc" title={t('featCalcTitle')} desc={t('featCalcDesc')}>
                    <span className="flex w-full max-w-64 flex-col gap-2 px-6" aria-hidden>
                        <span className="flex items-center justify-between text-xs text-secondary">
                            <span>{t('calcExample')}</span>
                            <span className="font-semibold text-primary">{t('calcExampleKo')}</span>
                        </span>
                        <span className="relative block h-3 overflow-hidden rounded-full bg-surface">
                            <span className="absolute inset-y-0 left-0 w-[63%] rounded-l-full bg-success" />
                            <span className="absolute inset-y-0 left-[63%] w-[6%] bg-error" />
                            <span className="absolute inset-y-0 left-[69%] w-[31%] bg-error/30" />
                        </span>
                        <span className="text-right text-sm font-semibold tabular-nums text-primary">31.1% – 37.1%</span>
                    </span>
                </ToolCard>
            </div>
        </section>
    )
}

// ── 자료 ──

function ReferenceSection() {
    const lang = useLang()
    const t = useT(homeMessages)
    const items: { to: string; title: HomeKey; count: HomeKey; n: number }[] = [
        { to: '/moves', title: 'featMovesTitle', count: 'countMoves', n: COUNTS.moves },
        { to: '/abilities', title: 'featAbilitiesTitle', count: 'countAbilities', n: COUNTS.abilities },
        { to: '/sprites', title: 'featSpritesTitle', count: 'countSprites', n: COUNTS.all },
    ]
    return (
        <section aria-labelledby="reference-heading">
            <SectionHeading id="reference-heading">{t('referenceHeading')}</SectionHeading>
            <div className="grid gap-3 sm:grid-cols-3">
                {items.map((it) => (
                    <ClickableCard key={it.to} href={it.to} label={t(it.title)}>
                        <HStack gap={3} align="center" justify="between">
                            <VStack gap={0.5}>
                                <Heading level={3}>{t(it.title)}</Heading>
                                <Text type="supporting" color="secondary" hasTabularNumbers>
                                    {t(it.count, { n: formatNumber(it.n, lang) })}
                                </Text>
                            </VStack>
                            <Icon icon="chevronRight" />
                        </HStack>
                    </ClickableCard>
                ))}
            </div>
        </section>
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
        <section aria-labelledby="gens-heading">
            <SectionHeading id="gens-heading">{t('gensHeading')}</SectionHeading>
            <div className="grid gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3">
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
                                <span className="flex shrink-0" aria-hidden>
                                    {byId(STARTERS[g.id]).map((p) => (
                                        <Sprite key={p.id} p={p} size={56} className="-mx-1.5" />
                                    ))}
                                </span>
                            </HStack>
                        </ClickableCard>
                    )
                })}
            </div>
        </section>
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
                <span className="min-w-0 flex-1">
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

