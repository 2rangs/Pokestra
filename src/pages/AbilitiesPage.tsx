import { useDeferredValue, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router'
import { Badge } from '@astryxdesign/core/Badge'
import { Card } from '@astryxdesign/core/Card'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { List, ListItem } from '@astryxdesign/core/List'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { Switch } from '@astryxdesign/core/Switch'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { VStack } from '@astryxdesign/core/VStack'
import { BackLink, EmptyState, LoadMore, PageHeader, PokemonChip, SearchField, SelectField } from '../components/dex/DexUi'
import { buildSearchKey, cleanDesc, foldSearch } from '../components/dex/text'
import { useProgressive } from '../components/dex/useProgressive'
import { useUrlParams } from '../components/dex/useUrlParams'
import { collator, formatNumber, LANGS, useDocumentTitle, useLang, useT, type Lang } from '../i18n'
import { abilitiesMessages } from '../i18n/messages/abilities'
import { commonMessages } from '../i18n/messages/common'
import {
    ABILITIES,
    ABILITY_BY_NAME,
    abilityName,
    type DexAbility,
    type DexPokemon,
    generationName,
    getSpeciesId,
    isAlternateForm,
    localText,
    pokemonWithAbility,
} from '../lib/dex'

// ── 데이터 ──

const LIST_ABILITIES: readonly DexAbility[] = ABILITIES
const NAME_INDEX = new Map(LIST_ABILITIES.map((a) => [a.name, buildSearchKey(a.name, a.nameKo, a.nameEn, a.nameJa)]))
const ABILITY_GENS = [...new Set(LIST_ABILITIES.map((a) => a.generation).filter((g): g is number => g != null))].sort((a, b) => a - b)
/** 특성별 보유 포켓몬 수 (목록에서 매번 세지 않도록) */
const HOLDER_COUNT = new Map(LIST_ABILITIES.map((a) => [a.name, pokemonWithAbility(a.name).length]))

export default function AbilitiesPage() {
    const { slug } = useParams()
    return slug ? <AbilityDetail slug={slug} /> : <AbilityList />
}

// ── 목록 ──

function AbilityList() {
    const lang = useLang()
    const t = useT(abilitiesMessages)
    const tc = useT(commonMessages)
    const location = useLocation()
    const [params, update] = useUrlParams()
    useDocumentTitle(t('title'))

    const q = params.get('q') ?? ''
    const gen = params.get('gen') ?? ''

    const deferredQ = useDeferredValue(q)
    const filtered = useMemo(() => {
        const needle = foldSearch(deferredQ)
        const genNum = gen ? Number(gen) : null
        const c = collator(lang)
        const list = LIST_ABILITIES.filter((a) => {
            if (genNum != null && a.generation !== genNum) return false
            if (!needle) return true
            if (NAME_INDEX.get(a.name)!.includes(needle)) return true
            // 현재 언어 설명으로도 검색
            const d = localText(a.desc, lang)
            return !!d && foldSearch(d).includes(needle)
        })
        const names = new Map(list.map((a) => [a.name, abilityName(a.name, lang)]))
        // 이름이 먼저 맞은 결과를 앞에
        return list.sort((a, b) => {
            if (needle) {
                const na = NAME_INDEX.get(a.name)!.includes(needle) ? 0 : 1
                const nb = NAME_INDEX.get(b.name)!.includes(needle) ? 0 : 1
                if (na !== nb) return na - nb
            }
            return c.compare(names.get(a.name)!, names.get(b.name)!)
        })
    }, [deferredQ, gen, lang])

    const { shown, hasMore, more, sentinelRef } = useProgressive(filtered.length, `${deferredQ}|${gen}|${lang}`, 80)

    return (
        <VStack gap={5}>
            <PageHeader title={t('title')} subtitle={t('subtitle', { n: LIST_ABILITIES.length })} />

            <Card>
                <HStack gap={3} wrap="wrap" vAlign="end">
                    <span className="min-w-[14rem] flex-1">
                        <SearchField
                            value={q}
                            onChange={(v) => update({ q: v })}
                            label={t('searchLabel')}
                            placeholder={t('searchPlaceholder')}
                        />
                    </span>
                    <SelectField
                        label={t('filterGen')}
                        value={gen}
                        onChange={(v) => update({ gen: v || null })}
                        width={150}
                        options={[
                            { value: '', label: tc('all') },
                            ...ABILITY_GENS.map((g) => ({ value: String(g), label: generationName(g, lang) })),
                        ]}
                    />
                </HStack>
            </Card>

            <VStack gap={2}>
                <span aria-live="polite">
                    <Text type="supporting">{tc('results', { n: filtered.length })}</Text>
                </span>

                {filtered.length === 0 ? (
                    <EmptyState />
                ) : (
                    <List aria-label={t('list')} hasDividers edge="flush">
                        {filtered.slice(0, shown).map((a) => (
                            <AbilityRow key={a.name} ability={a} lang={lang} search={location.search} />
                        ))}
                    </List>
                )}
                <LoadMore hasMore={hasMore} onMore={more} sentinelRef={sentinelRef} />
            </VStack>
        </VStack>
    )
}

function AbilityRow({ ability: a, lang, search }: { ability: DexAbility; lang: Lang; search: string }) {
    const t = useT(abilitiesMessages)
    const desc = cleanDesc(localText(a.desc, lang), lang)
    const count = HOLDER_COUNT.get(a.name) ?? 0
    return (
        <ListItem
            href={`/abilities/${a.name}${search}`}
            label={abilityName(a.name, lang)}
            description={desc ?? t('noDescription')}
            endContent={
                <HStack gap={3} align="center">
                    {a.generation != null && (
                        <span className="hidden sm:inline">
                            <Text type="supporting">{generationName(a.generation, lang)}</Text>
                        </span>
                    )}
                    <Badge variant="neutral" label={formatNumber(count, lang)} aria-label={t('pokemonCount', { n: count })} />
                </HStack>
            }
        />
    )
}

// ── 상세 ──

interface Holder {
    p: DexPokemon
    hidden: boolean
}

function AbilityDetail({ slug }: { slug: string }) {
    const lang = useLang()
    const t = useT(abilitiesMessages)
    const location = useLocation()
    const ability = ABILITY_BY_NAME.get(slug)
    const name = ability ? abilityName(ability.name, lang) : null
    useDocumentTitle(name ? `${name} · ${t('title')}` : t('notFound'))
    const backTo = `/abilities${location.search}`

    if (!ability) {
        return (
            <VStack gap={2}>
                <BackLink to={backTo}>{t('back')}</BackLink>
                <EmptyState title={t('notFound')} description={t('notFoundBody')} />
            </VStack>
        )
    }

    const a = ability
    const desc = cleanDesc(localText(a.desc, lang), lang)
    const others = LANGS.filter((l) => l !== lang)
        .map((l) => ({ l, n: abilityName(a.name, l) }))
        .filter((o, i, arr) => o.n !== name && arr.findIndex((x) => x.n === o.n) === i)

    return (
        <VStack gap={6}>
            <VStack gap={3}>
                <BackLink to={backTo}>{t('back')}</BackLink>
                <VStack gap={1}>
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
                </VStack>
            </VStack>

            <Card>
                <VStack gap={4}>
                    <VStack gap={1.5}>
                        <Heading level={2}>{t('description')}</Heading>
                        <span className="max-w-[70ch]">
                            <Text as="p" color={desc ? 'primary' : 'secondary'}>
                                {desc ?? t('noDescription')}
                            </Text>
                        </span>
                    </VStack>
                    {a.generation != null && (
                        <MetadataList>
                            <MetadataListItem label={t('introduced')}>
                                <Text>{generationName(a.generation, lang)}</Text>
                            </MetadataListItem>
                        </MetadataList>
                    )}
                </VStack>
            </Card>

            <Holders key={a.name} slug={a.name} />
        </VStack>
    )
}

function Holders({ slug }: { slug: string }) {
    const t = useT(abilitiesMessages)
    const [withForms, setWithForms] = useState(false)

    const all = useMemo<Holder[]>(
        () =>
            pokemonWithAbility(slug)
                .map((p) => ({
                    p,
                    hidden:
                        !!p.abilities.find((x) => x.name === slug && x.hidden) &&
                        !p.abilities.some((x) => x.name === slug && !x.hidden),
                }))
                .sort((x, y) => getSpeciesId(x.p) - getSpeciesId(y.p) || x.p.id - y.p.id),
        [slug],
    )
    const base = useMemo(() => all.filter((h) => !isAlternateForm(h.p)), [all])
    const hasForms = base.length !== all.length
    const list = withForms || base.length === 0 ? all : base
    const standard = list.filter((h) => !h.hidden)
    const hidden = list.filter((h) => h.hidden)

    return (
        <section aria-labelledby="holders-heading">
            <VStack gap={4}>
                <HStack gap={3} align="center" justify="between" wrap="wrap">
                    <VStack gap={0.5}>
                        <HStack gap={2} align="center">
                            <Heading level={2} id="holders-heading">
                                {t('holders')}
                            </Heading>
                            <Badge variant="neutral" label={list.length} aria-label={t('holdersCount', { n: list.length })} />
                        </HStack>
                        {list.length > 0 && (
                            <Text type="supporting">{t('holdersSummary', { normal: standard.length, hidden: hidden.length })}</Text>
                        )}
                    </VStack>
                    {hasForms && base.length > 0 && (
                        <Switch size="sm" label={t('includeForms')} value={withForms} onChange={setWithForms} />
                    )}
                </HStack>

                {list.length === 0 ? (
                    <EmptyState title={t('noHolders')} />
                ) : (
                    <VStack gap={6}>
                        <HolderGroup title={t('standard')} items={standard} resetKey={`${slug}|${withForms}|s`} />
                        <HolderGroup title={t('hidden')} items={hidden} resetKey={`${slug}|${withForms}|h`} hidden />
                    </VStack>
                )}
            </VStack>
        </section>
    )
}

function HolderGroup({ title, items, resetKey, hidden }: { title: string; items: Holder[]; resetKey: string; hidden?: boolean }) {
    const t = useT(abilitiesMessages)
    const { shown, hasMore, more, sentinelRef } = useProgressive(items.length, resetKey, 96)
    if (items.length === 0) return null
    return (
        <VStack gap={2}>
            <HStack gap={2} align="center">
                <Heading level={3}>{title}</Heading>
                <Badge variant={hidden ? 'purple' : 'neutral'} label={items.length} />
            </HStack>
            <Grid columns={{ minWidth: 176 }} gap={2}>
                {items.slice(0, shown).map((h) => (
                    <PokemonChip
                        key={h.p.id}
                        pokemon={h.p}
                        badge={h.hidden ? <Token size="sm" color="purple" label={t('hiddenShort')} /> : undefined}
                    />
                ))}
            </Grid>
            <LoadMore hasMore={hasMore} onMore={more} sentinelRef={sentinelRef} />
        </VStack>
    )
}
