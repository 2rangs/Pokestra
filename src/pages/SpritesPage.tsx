import { memo, useDeferredValue, useMemo, useRef } from 'react'
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import { ClickableCard } from '@astryxdesign/core/ClickableCard'
import { Grid } from '@astryxdesign/core/Grid'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { EmptyState, FilterRow, LoadMore, PageHeader, SearchField, Segmented, SelectField } from '../components/dex/DexUi'
import { PokeImage } from '../components/ui/PokeImage'
import { artworkUrl, buildSearchKey, foldSearch, padDexNo } from '../components/dex/text'
import { useProgressive } from '../components/dex/useProgressive'
import { useUrlParams } from '../components/dex/useUrlParams'
import { useSlashFocus } from '../hooks/useSlashFocus'
import { useDocumentTitle, useLang, useT } from '../i18n'
import { commonMessages } from '../i18n/messages/common'
import { spritesMessages } from '../i18n/messages/sprites'
import {
    ALL_POKEMON,
    type DexPokemon,
    displayName,
    GENERATIONS,
    generationName,
    getGeneration,
    getSpeciesId,
    isAlternateForm,
} from '../lib/dex'

interface Entry {
    p: DexPokemon
    speciesId: number
    gen: number
    form: boolean
    key: string
}

const INDEX: readonly Entry[] = ALL_POKEMON.map((p) => ({
    p,
    speciesId: getSpeciesId(p),
    gen: getGeneration(p),
    form: isAlternateForm(p),
    key: buildSearchKey(p.name, p.nameKo, p.nameEn, p.nameJa),
})).sort((a, b) => a.speciesId - b.speciesId || a.p.id - b.p.id)

type Style = 'sprite' | 'artwork'
type Color = 'normal' | 'shiny'

export default function SpritesPage() {
    const lang = useLang()
    const t = useT(spritesMessages)
    const tc = useT(commonMessages)
    const [params, update] = useUrlParams()
    useDocumentTitle(t('title'))

    const q = params.get('q') ?? ''
    const gen = params.get('gen') ?? ''
    const style: Style = params.get('style') === 'artwork' ? 'artwork' : 'sprite'
    const color: Color = params.get('shiny') === '1' ? 'shiny' : 'normal'
    const forms = params.get('forms') === '1'

    const deferredQ = useDeferredValue(q)
    const filtered = useMemo(() => {
        const raw = deferredQ.trim().replace(/^#/, '')
        const num = /^\d+$/.test(raw) ? Number(raw) : null
        const needle = num == null ? foldSearch(raw) : ''
        const genNum = gen ? Number(gen) : null
        return INDEX.filter(
            (e) =>
                (forms || !e.form) &&
                (genNum == null || e.gen === genNum) &&
                (num == null || e.speciesId === num) &&
                (!needle || e.key.includes(needle)),
        )
    }, [deferredQ, gen, forms])

    const { shown, hasMore, more, sentinelRef } = useProgressive(filtered.length, `${deferredQ}|${gen}|${forms}`, 120)
    const shiny = color === 'shiny'
    const searchRef = useRef<HTMLSpanElement>(null)
    useSlashFocus(searchRef)

    return (
        <VStack gap={4}>
            <PageHeader title={t('title')} subtitle={t('subtitle')} />

            <FilterRow
                label={tc('filters')}
                search={
                    <span ref={searchRef} className="min-w-0 flex-1">
                        <SearchField
                            value={q}
                            onChange={(v) => update({ q: v })}
                            label={t('searchLabel')}
                            placeholder={t('searchPlaceholder')}
                        />
                    </span>
                }
                end={
                    <span aria-live="polite">
                        <Text type="supporting">{tc('results', { n: filtered.length })}</Text>
                    </span>
                }
            >
                <SelectField
                    isLabelHidden
                    label={t('filterGen')}
                    value={gen}
                    onChange={(v) => update({ gen: v || null })}
                    width={150}
                    options={[
                        { value: '', label: tc('all') },
                        ...GENERATIONS.map((g) => ({ value: String(g.id), label: generationName(g.id, lang) })),
                    ]}
                />
                <Segmented<Style>
                    isLabelHidden
                    label={t('style')}
                    value={style}
                    onChange={(v) => update({ style: v === 'artwork' ? 'artwork' : null })}
                    options={[
                        { value: 'sprite', label: t('styleSprite') },
                        { value: 'artwork', label: t('styleArtwork') },
                    ]}
                />
                <Segmented<Color>
                    isLabelHidden
                    label={t('color')}
                    value={color}
                    onChange={(v) => update({ shiny: v === 'shiny' ? '1' : null })}
                    options={[
                        { value: 'normal', label: t('normal') },
                        { value: 'shiny', label: t('shiny') },
                    ]}
                />
                <CheckboxInput
                    size="sm"
                    label={t('includeForms')}
                    value={forms}
                    onChange={(checked) => update({ forms: checked ? '1' : null })}
                />
            </FilterRow>

            <VStack gap={2}>
                {filtered.length === 0 ? (
                    <EmptyState />
                ) : (
                    <Grid columns={{ minWidth: 80, max: 14 }} gap={1.5} role="list" aria-label={t('gallery')}>
                        {filtered.slice(0, shown).map((e) => (
                            <span key={e.p.id} role="listitem" className="block min-w-0">
                                <SpriteCard entry={e} style={style} shiny={shiny} />
                            </span>
                        ))}
                    </Grid>
                )}
                <LoadMore hasMore={hasMore} onMore={more} sentinelRef={sentinelRef} />
            </VStack>
        </VStack>
    )
}

const SpriteCard = memo(function SpriteCard({ entry: e, style, shiny }: { entry: Entry; style: Style; shiny: boolean }) {
    const lang = useLang()
    const t = useT(spritesMessages)
    const name = displayName(e.p, lang)
    const src = style === 'artwork' ? artworkUrl(e.p.id, shiny) : shiny ? e.p.spriteShiny : e.p.sprite

    return (
        <ClickableCard href={`/pokemon/${e.p.id}`} label={shiny ? `${name} (${t('shiny')})` : name} padding={1.5} height="100%">
            <VStack gap={0.5} hAlign="center">
                <span className="flex aspect-square w-full max-w-20 items-center justify-center">
                    <PokeImage sources={[src]} alt="" size={80} pixelated={false} className="h-full w-full" />
                </span>
                <Text type="supporting" hasTabularNumbers>
                    {padDexNo(e.speciesId)}
                </Text>
                <Text size="sm" weight="semibold" justify="center" maxLines={1}>
                    {name}
                </Text>
            </VStack>
        </ClickableCard>
    )
})
