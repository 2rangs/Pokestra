import { useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Grid } from '@astryxdesign/core/Grid'
import { Token } from '@astryxdesign/core/Token'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { Text } from '@astryxdesign/core/Text'
import { Typeahead, TypeaheadItem, type SearchableItem, type SearchSource } from '@astryxdesign/core/Typeahead'
import { VStack } from '@astryxdesign/core/VStack'
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden'
import { SilhouetteQuiz } from '../components/home/SilhouetteQuiz'
import { StatMap } from '../components/home/StatMap'
import { TypeGlyph } from '../components/ui/TypeChip'
import { PokeImage } from '../components/ui/PokeImage'
import { pokemonImageCandidates } from '../lib/images'
import { buildSearchKey, foldSearch, padDexNo } from '../components/dex/text'
import { formatNumber, useDocumentTitle, useLang, useT } from '../i18n'
import { homeMessages } from '../i18n/messages/home'
import { ALL_POKEMON, type DexPokemon, displayName, GENERATIONS, getDexPokemon, getSpeciesId, isAlternateForm, TYPES, typeName } from '../lib/dex'
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

/** 검색창 아래 바로가기 */
const POPULAR = [25, 6, 445, 149, 94, 448, 700, 1000].map((id) => getDexPokemon(id)).filter((p): p is DexPokemon => !!p)

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


// ── 페이지 ──

export default function HomePage() {
    const t = useT(homeMessages)
    useDocumentTitle(null)

    // 놀이 + 탐색 + 한눈에 보기: 위는 실루엣 퀴즈 | 찾기(검색·타입·세대), 아래는 전체 종족값 지도.
    // 같은 카드 줄을 반복하지 않고, 저마다 다른 방식으로 도감에 들어가게 한다.
    return (
        <VStack gap={5}>
            <VisuallyHidden>
                <Heading level={1}>{t('heroTitle')}</Heading>
                <p>{t('heroLead')}</p>
            </VisuallyHidden>
            <Grid columns={{ minWidth: 420, max: 2 }} gap={5}>
                <SilhouetteQuiz />
                <ExploreCard />
            </Grid>
            <StatMap />
        </VStack>
    )
}

// ── 찾기: 검색 · 자주 찾는 포켓몬 · 타입 · 세대 ──

/** 타입마다 종 수 (폼 제외) */
const TYPE_COUNTS = new Map(TYPES.map((ty) => [ty.name, SPECIES.filter((p) => p.types.includes(ty.name)).length]))

function generationTitle(id: number, lang: string): string {
    if (lang === 'ko') return `${id}세대`
    if (lang === 'ja') return `第${id}世代`
    return `Gen ${id}`
}

function ExploreCard() {
    const lang = useLang()
    const t = useT(homeMessages)
    const navigate = useNavigate()
    const resetFilters = usePokedexStore((s) => s.resetFilters)
    const setTypes = usePokedexStore((s) => s.setTypes)
    const toggleGeneration = usePokedexStore((s) => s.toggleGeneration)

    const openType = (type: string) => {
        resetFilters()
        setTypes([type])
        navigate('/pokedex')
    }
    const openGen = (id: number) => {
        resetFilters()
        toggleGeneration(id)
        navigate('/pokedex')
    }

    return (
        <Card role="region" aria-labelledby="explore-heading" padding={5} className="h-full max-sm:p-4">
            <VStack gap={4}>
                <Heading level={2} id="explore-heading">
                    {t('exploreHeading')}
                </Heading>
                <HeroSearch />
                <PopularPokemon />
                <VStack gap={1.5}>
                    <Text type="supporting" color="secondary" id="types-label">
                        {t('typesHeading')}
                    </Text>
                    <HStack gap={1.5} wrap="wrap" role="group" aria-labelledby="types-label">
                        {TYPES.map((ty) => (
                            <Token
                                key={ty.name}
                                icon={<TypeGlyph type={ty.name} size="sm" />}
                                label={typeName(ty.name, lang)}
                                endContent={
                                    <Text type="supporting" color="secondary" hasTabularNumbers>
                                        {formatNumber(TYPE_COUNTS.get(ty.name) ?? 0, lang)}
                                    </Text>
                                }
                                onClick={() => openType(ty.name)}
                            />
                        ))}
                    </HStack>
                </VStack>
                <VStack gap={1.5}>
                    <Text type="supporting" color="secondary" id="gens-label">
                        {t('gensHeading')}
                    </Text>
                    <HStack gap={1.5} wrap="wrap" role="group" aria-labelledby="gens-label">
                        {GENERATIONS.map((g) => (
                            <Token
                                key={g.id}
                                label={`${generationTitle(g.id, lang)} ${t(`region${g.id}` as HomeKey)}`}
                                onClick={() => openGen(g.id)}
                            />
                        ))}
                    </HStack>
                </VStack>
            </VStack>
        </Card>
    )
}

const SPRITE_BOX: Record<number, string> = { 32: 'h-8 w-8' }

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
                            <PokeImage sources={pokemonImageCandidates(p.id, 32, { sprite: p.sprite })} alt="" size={32} className={SPRITE_BOX[32]} />
                            {displayName(p, lang)}
                        </Link>
                    </li>
                ))}
            </ul>
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

