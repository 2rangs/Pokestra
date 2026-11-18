import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Badge } from '@astryxdesign/core/Badge'
import { Card } from '@astryxdesign/core/Card'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { IconButton } from '@astryxdesign/core/IconButton'
import { List, ListItem } from '@astryxdesign/core/List'
import { MetadataList, MetadataListItem } from '@astryxdesign/core/MetadataList'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden'
import { BackLink, EmptyState } from '../../components/dex/DexUi'
import { PokeImage } from '../../components/ui/PokeImage'
import { StatBar, TypeTag } from '../../components/ui/shared'
import { LANGS, LANG_LABEL, useDocumentTitle, useLang, useT } from '../../i18n'
import { itemsMessages } from '../../i18n/messages/items'
import { displayName } from '../../lib/dex'
import { pokemonImageCandidates } from '../../lib/images'
import { FLAVORS, heldByPokemon, ITEM_BY_SLUG, itemDesc, itemName, itemNeighbors, parseItemQuery } from '../../lib/items'
import { categoryLabel, ItemIcon } from './ItemUi'

const DASH = '-'

export default function ItemDetailPage() {
    const { slug = '' } = useParams()
    const lang = useLang()
    const t = useT(itemsMessages)
    const location = useLocation()
    const navigate = useNavigate()
    const item = ITEM_BY_SLUG.get(slug) ?? null
    const name = item ? itemName(item, lang) : null
    useDocumentTitle(name ? `${name} · ${t('title')}` : t('notFound'))

    const search = location.search
    const { prev, next } = useMemo(
        () => (item ? itemNeighbors(item.name, parseItemQuery(new URLSearchParams(search)), lang) : { prev: null, next: null }),
        [item, search, lang],
    )
    const held = useMemo(() => (item ? heldByPokemon(item) : []), [item])

    // 다른 도구로 이동하면 맨 위로
    useEffect(() => {
        window.scrollTo({ top: 0 })
    }, [slug])

    // 왼쪽/오른쪽 방향키로 이전/다음 도구
    useEffect(() => {
        const onKey = (e: globalThis.KeyboardEvent) => {
            if (e.defaultPrevented || e.isComposing || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
            const el = e.target as HTMLElement | null
            if (el?.closest('input, textarea, select, [contenteditable], [role=tablist], [role=radiogroup], [role=listbox]')) return
            const target = e.key === 'ArrowLeft' ? prev : e.key === 'ArrowRight' ? next : null
            if (target) navigate(`/items/${target.name}${search}`)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [prev, next, navigate, search])

    const backTo = `/items${search}`
    if (!item || !name) {
        return (
            <VStack gap={2}>
                <BackLink to={backTo}>{t('back')}</BackLink>
                <EmptyState title={t('notFound')} description={t('notFoundBody')} />
            </VStack>
        )
    }

    const desc = itemDesc(item, lang)
    const others = LANGS.filter((l) => l !== lang)
        .map((l) => ({ l, n: itemName(item, l) }))
        .filter((o, i, arr) => o.n && o.n !== name && arr.findIndex((x) => x.n === o.n) === i)
    const berry = item.berry
    const flavors = berry?.flavors ?? null

    return (
        <VStack gap={6}>
            <VStack gap={3}>
                <BackLink to={backTo}>{t('back')}</BackLink>
                <HStack gap={4} justify="between" align="start" wrap="wrap">
                    <HStack gap={3} align="start">
                        <ItemIcon slug={item.name} size={48} />
                        <VStack gap={1}>
                            <Heading level={1}>{name}</Heading>
                            {others.length > 0 && (
                                <HStack gap={3} wrap="wrap">
                                    {others.map((o) => (
                                        <span key={o.l} lang={o.l}>
                                            <Text color="secondary">{o.n}</Text>
                                        </span>
                                    ))}
                                </HStack>
                            )}
                            <Text color="secondary">{categoryLabel(item.category, t)}</Text>
                            <Text as="p" color={desc ? 'primary' : 'secondary'} className="max-w-prose">
                                {desc ? <span lang={desc.lang}>{desc.text}</span> : t('noDescription')}
                                {desc && desc.lang !== lang && (
                                    <Text type="supporting" color="secondary">
                                        {' '}
                                        {t('descFallback', { lang: LANG_LABEL[desc.lang] })}
                                    </Text>
                                )}
                            </Text>
                        </VStack>
                    </HStack>
                    <HStack gap={2} align="center">
                        <IconButton
                            icon={<Icon icon="chevronLeft" />}
                            label={prev ? `${t('prev')}: ${itemName(prev, lang)}` : t('prev')}
                            size="lg" className="max-sm:min-h-11 max-sm:min-w-11"
                            isDisabled={!prev}
                            href={prev ? `/items/${prev.name}${search}` : undefined}
                        />
                        <IconButton
                            icon={<Icon icon="chevronRight" />}
                            label={next ? `${t('next')}: ${itemName(next, lang)}` : t('next')}
                            size="lg" className="max-sm:min-h-11 max-sm:min-w-11"
                            isDisabled={!next}
                            href={next ? `/items/${next.name}${search}` : undefined}
                        />
                    </HStack>
                </HStack>
            </VStack>

            <Grid columns={{ minWidth: 400, max: 2 }} gap={6} align="start">
                <Card>
                    <VStack gap={5}>
                        <MetadataList columns="multi">
                            {berry && (
                                <MetadataListItem label={t('naturalGiftLabel')}>
                                    <VStack gap={1}>
                                        <HStack gap={2} align="center" wrap="wrap">
                                            {berry.naturalGiftType ? <TypeTag type={berry.naturalGiftType} /> : <Text>{DASH}</Text>}
                                            <Text hasTabularNumbers>{berry.naturalGiftPower ?? DASH}</Text>
                                        </HStack>
                                        <Text type="supporting" color="secondary">
                                            {t('naturalGiftHelp')}
                                        </Text>
                                    </VStack>
                                </MetadataListItem>
                            )}
                            <MetadataListItem label={t('flingLabel')}>
                                <VStack gap={1}>
                                    <Text hasTabularNumbers>{item.flingPower ?? DASH}</Text>
                                    <Text type="supporting" color="secondary">
                                        {t('flingHelp')}
                                    </Text>
                                </VStack>
                            </MetadataListItem>
                            <MetadataListItem label={t('flingEffect')}>
                                <Text>{item.flingEffect ? t(`flingEffect_${item.flingEffect}`) : DASH}</Text>
                            </MetadataListItem>
                            {berry && (
                                <>
                                    <MetadataListItem label={t('firmness')}>
                                        <VStack gap={1}>
                                            <Text>{berry.firmness ? t(`firmness_${berry.firmness}`) : DASH}</Text>
                                            <Text type="supporting" color="secondary">
                                                {t('firmnessHelp')}
                                            </Text>
                                        </VStack>
                                    </MetadataListItem>
                                    <MetadataListItem label={t('size')}>
                                        <Text hasTabularNumbers>{berry.size != null ? t('sizeValue', { n: (berry.size / 10).toFixed(1) }) : DASH}</Text>
                                    </MetadataListItem>
                                    <MetadataListItem label={t('growthTime')}>
                                        <VStack gap={1}>
                                            <Text hasTabularNumbers>{berry.growthTime != null ? t('growthValue', { n: berry.growthTime }) : DASH}</Text>
                                            <Text type="supporting" color="secondary">
                                                {t('growthTimeHelp')}
                                            </Text>
                                        </VStack>
                                    </MetadataListItem>
                                </>
                            )}
                        </MetadataList>

                        {berry && flavors && (
                            <VStack gap={1.5}>
                                <Heading level={2}>{t('flavors')}</Heading>
                                <Text type="supporting" color="secondary">
                                    {t('flavorsHelp')}
                                </Text>
                                <List>
                                    {FLAVORS.map((f) => (
                                        <ListItem
                                            key={f}
                                            label={
                                                <HStack gap={3} align="center">
                                                    <Text className="w-16 shrink-0">{t(`flavor_${f}`)}</Text>
                                                    <StatBar value={flavors[f]} max={40} label={t(`flavor_${f}`)} className="min-w-20 flex-1" />
                                                    <Text hasTabularNumbers className="w-8 shrink-0 text-right">
                                                        {flavors[f]}
                                                    </Text>
                                                </HStack>
                                            }
                                        />
                                    ))}
                                </List>
                            </VStack>
                        )}
                    </VStack>
                </Card>

                <VStack as="section" gap={2} aria-labelledby="held-by-heading">
                    <HStack gap={2} align="center">
                        <Heading level={2} id="held-by-heading">
                            {t('heldBy')}
                        </Heading>
                        <Badge label={held.length} aria-label={t('heldByCount', { n: held.length })} />
                    </HStack>
                    <VStack gap={0.5}>
                        <Text type="supporting" color="secondary">
                            {t('heldByNote')}
                        </Text>
                        <Text type="supporting" color="secondary">
                            {t('heldChanceHelp')}
                        </Text>
                    </VStack>
                    {held.length === 0 ? (
                        <EmptyState title={t('noHeldBy')} />
                    ) : (
                        <List>
                            {held.map(({ pokemon: p, rarity }) => (
                                <ListItem
                                    key={p.id}
                                    href={`/pokemon/${p.id}`}
                                    startContent={<PokeImage sources={pokemonImageCandidates(p.id, 40, { sprite: p.sprite })} alt="" size={40} />}
                                    label={displayName(p, lang)}
                                    endContent={
                                        <Text size="sm" hasTabularNumbers>
                                            <span aria-hidden="true">{rarity}%</span>
                                            <VisuallyHidden>{t('heldChanceLabel', { n: rarity })}</VisuallyHidden>
                                        </Text>
                                    }
                                />
                            ))}
                        </List>
                    )}
                </VStack>
            </Grid>
        </VStack>
    )
}
