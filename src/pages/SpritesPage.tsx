import { memo, useDeferredValue, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { EmptyState, FieldLabel, LoadMore, PageHeader, SearchField, Segmented, SelectField } from '../components/dex/DexUi'
import { artworkUrl, buildSearchKey, foldSearch, padDexNo } from '../components/dex/text'
import { useProgressive } from '../components/dex/useProgressive'
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
    const [params, setParams] = useSearchParams()
    useDocumentTitle(t('title'))

    const q = params.get('q') ?? ''
    const gen = params.get('gen') ?? ''
    const style: Style = params.get('style') === 'artwork' ? 'artwork' : 'sprite'
    const color: Color = params.get('shiny') === '1' ? 'shiny' : 'normal'
    const forms = params.get('forms') === '1'

    const update = (patch: Record<string, string | null>) =>
        setParams(
            (prev) => {
                const next = new URLSearchParams(prev)
                for (const [k, v] of Object.entries(patch)) {
                    if (v) next.set(k, v)
                    else next.delete(k)
                }
                return next
            },
            { replace: true },
        )

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

    return (
        <div>
            <PageHeader title={t('title')} subtitle={t('subtitle')} />

            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1">
                        <SearchField
                            value={q}
                            onChange={(v) => update({ q: v })}
                            label={t('searchLabel')}
                            placeholder={t('searchPlaceholder')}
                        />
                    </div>
                    <div className="sm:w-40">
                        <SelectField label={t('filterGen')} value={gen} onChange={(v) => update({ gen: v || null })}>
                            <option value="">{tc('all')}</option>
                            {GENERATIONS.map((g) => (
                                <option key={g.id} value={g.id}>
                                    {generationName(g.id, lang)}
                                </option>
                            ))}
                        </SelectField>
                    </div>
                </div>
                <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
                    <div>
                        <FieldLabel>{t('style')}</FieldLabel>
                        <Segmented<Style>
                            label={t('style')}
                            value={style}
                            onChange={(v) => update({ style: v === 'artwork' ? 'artwork' : null })}
                            options={[
                                { value: 'sprite', label: t('styleSprite') },
                                { value: 'artwork', label: t('styleArtwork') },
                            ]}
                        />
                    </div>
                    <div>
                        <FieldLabel>{t('color')}</FieldLabel>
                        <Segmented<Color>
                            label={t('color')}
                            value={color}
                            onChange={(v) => update({ shiny: v === 'shiny' ? '1' : null })}
                            options={[
                                { value: 'normal', label: t('normal') },
                                { value: 'shiny', label: `✦ ${t('shiny')}` },
                            ]}
                        />
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 pb-2 text-xs font-semibold text-slate-500">
                        <input
                            type="checkbox"
                            checked={forms}
                            onChange={(e) => update({ forms: e.target.checked ? '1' : null })}
                            className="h-4 w-4 accent-red-500"
                        />
                        {t('includeForms')}
                    </label>
                </div>
            </section>

            <p className="mt-5 mb-2 px-1 text-xs font-semibold text-slate-400" aria-live="polite">
                {tc('results', { n: filtered.length })}
            </p>

            {filtered.length === 0 ? (
                <EmptyState />
            ) : (
                <ul aria-label={t('gallery')} className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                    {filtered.slice(0, shown).map((e) => (
                        <li key={e.p.id}>
                            <SpriteCard entry={e} style={style} shiny={shiny} />
                        </li>
                    ))}
                </ul>
            )}
            <LoadMore hasMore={hasMore} onMore={more} sentinelRef={sentinelRef} />
        </div>
    )
}

const SpriteCard = memo(function SpriteCard({ entry: e, style, shiny }: { entry: Entry; style: Style; shiny: boolean }) {
    const lang = useLang()
    const t = useT(spritesMessages)
    const [failedSrc, setFailedSrc] = useState<string | null>(null)
    const name = displayName(e.p, lang)
    const src = style === 'artwork' ? artworkUrl(e.p.id, shiny) : shiny ? e.p.spriteShiny : e.p.sprite
    const failed = !src || failedSrc === src

    return (
        <Link
            to={`/pokemon/${e.p.id}`}
            className={[
                'group relative flex h-full flex-col items-center rounded-2xl border bg-white p-2 pt-5 text-center transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400',
                shiny ? 'border-amber-200 hover:border-amber-300' : 'border-slate-200 hover:border-slate-300',
            ].join(' ')}
        >
            <span className="absolute left-2 top-1.5 text-[10px] font-semibold tabular-nums text-slate-400">{padDexNo(e.speciesId)}</span>
            {shiny && (
                <span className="absolute right-2 top-1 text-xs text-amber-400" aria-hidden>
                    ✦
                </span>
            )}
            <span className="flex aspect-square w-full max-w-[96px] items-center justify-center">
                {failed ? (
                    <span className="text-[10px] text-slate-300">{t('noImage')}</span>
                ) : (
                    <img
                        key={src}
                        src={src}
                        alt={name}
                        loading="lazy"
                        decoding="async"
                        width={96}
                        height={96}
                        onError={() => setFailedSrc(src)}
                        className={[
                            'h-full w-full object-contain transition-transform group-hover:scale-110',
                            style === 'sprite' ? '[image-rendering:pixelated]' : '',
                        ].join(' ')}
                    />
                )}
            </span>
            <span className="mt-1 line-clamp-2 w-full text-[11px] font-bold leading-tight text-slate-700 group-hover:text-red-500">
                {name}
            </span>
        </Link>
    )
})
