import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
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
import { TypeBadge } from '../components/dex/DexUi'
import { artworkUrl, buildSearchKey, foldSearch, padDexNo } from '../components/dex/text'
import { formatNumber, useDocumentTitle, useLang, useT } from '../i18n'
import { homeMessages } from '../i18n/messages/home'
import {
    ABILITIES,
    ALL_POKEMON,
    baseStatTotal,
    type DexPokemon,
    displayName,
    getSpeciesId,
    isAlternateForm,
    MOVES,
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

/** 홈의 메뉴: 제목, 한 줄 설명, (있으면) 개수 */
const SECTIONS: { to: string; title: HomeKey; desc: HomeKey; count?: { key: HomeKey; n: number } }[] = [
    { to: '/pokedex', title: 'featPokedexTitle', desc: 'featPokedexDesc', count: { key: 'countSpecies', n: COUNTS.species } },
    { to: '/moves', title: 'featMovesTitle', desc: 'featMovesDesc', count: { key: 'countMoves', n: COUNTS.moves } },
    { to: '/abilities', title: 'featAbilitiesTitle', desc: 'featAbilitiesDesc', count: { key: 'countAbilities', n: COUNTS.abilities } },
    { to: '/sprites', title: 'featSpritesTitle', desc: 'featSpritesDesc', count: { key: 'countSprites', n: COUNTS.all } },
    { to: '/battle', title: 'featBattleTitle', desc: 'featBattleDesc' },
    { to: '/calc', title: 'featCalcTitle', desc: 'featCalcDesc' },
]

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
    const lang = useLang()
    const t = useT(homeMessages)
    useDocumentTitle(null)

    return (
        <VStack gap={10}>
            <Grid columns={{ minWidth: 300 }} gap={6} align="center">
                <VStack gap={4}>
                    <VStack gap={2}>
                        <Heading level={1}>{t('heroTitle')}</Heading>
                        <span className="max-w-[60ch]">
                            <Text as="p" type="large" color="secondary">
                                {t('heroLead')}
                            </Text>
                        </span>
                    </VStack>
                    <HeroSearch />
                </VStack>
                <PokemonOfTheDay />
            </Grid>

            <section aria-labelledby="sections-heading">
                <VStack gap={3}>
                    <Heading level={2} id="sections-heading">
                        {t('sectionsHeading')}
                    </Heading>
                    <Grid columns={{ minWidth: 260 }} gap={3}>
                        {SECTIONS.map((s) => (
                            <ClickableCard key={s.to} href={s.to} label={t(s.title)} height="100%">
                                <VStack gap={1.5}>
                                    <HStack gap={2} align="center" justify="between" wrap="wrap">
                                        <Heading level={3}>{t(s.title)}</Heading>
                                        {s.count && (
                                            <Text type="supporting" hasTabularNumbers>
                                                {t(s.count.key, { n: formatNumber(s.count.n, lang) })}
                                            </Text>
                                        )}
                                    </HStack>
                                    <Text color="secondary">{t(s.desc)}</Text>
                                </VStack>
                            </ClickableCard>
                        ))}
                    </Grid>
                </VStack>
            </section>
        </VStack>
    )
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
                                            <img
                                                src={d.p.sprite}
                                                alt=""
                                                width={32}
                                                height={32}
                                                className="h-8 w-8 object-contain [image-rendering:pixelated]"
                                            />
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

// ── 오늘의 포켓몬 ──

function PokemonOfTheDay() {
    const lang = useLang()
    const t = useT(homeMessages)
    const [key] = useState(todayKey)
    const p = useMemo(() => pokemonOfDay(key), [key])
    const [failed, setFailed] = useState(false)
    const name = displayName(p, lang)

    return (
        <section aria-labelledby="potd-heading">
            <Card>
                <HStack gap={4} align="center" wrap="wrap">
                    <span className="flex h-32 w-32 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <img
                            src={failed ? (p.sprite ?? '') : artworkUrl(p.id)}
                            alt={name}
                            width={128}
                            height={128}
                            loading="lazy"
                            onError={() => setFailed(true)}
                            className="h-28 w-28 object-contain"
                        />
                    </span>
                    <VStack gap={1.5} className="min-w-0 flex-1">
                        <Text type="supporting" id="potd-heading">
                            {t('potdTitle')}
                        </Text>
                        <VStack gap={0.5}>
                            <Text type="supporting" hasTabularNumbers>
                                {padDexNo(getSpeciesId(p))}
                            </Text>
                            <Heading level={2} maxLines={1}>
                                {name}
                            </Heading>
                        </VStack>
                        <HStack gap={1} wrap="wrap">
                            {p.types.map((ty) => (
                                <TypeBadge key={ty} type={ty} />
                            ))}
                        </HStack>
                        <Text size="sm" color="secondary">
                            {t('potdTotal')}{' '}
                            <Text size="sm" weight="semibold" hasTabularNumbers>
                                {baseStatTotal(p)}
                            </Text>
                        </Text>
                        <span className="pt-1">
                            <Button size="sm" variant="secondary" href={`/pokemon/${p.id}`} label={t('potdCta')} />
                        </span>
                    </VStack>
                </HStack>
            </Card>
        </section>
    )
}
