import { Fragment, useId, useMemo, useState } from 'react'
import type { MoveData } from '@kyasi/pokebattle-engine'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Heading } from '@astryxdesign/core/Heading'
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import { moveNameL, pokemonNameL } from '../../lib/battle'
import { moveName, typeName } from '../../lib/dex'
import { LANGS, formatNumber, useLang, useT } from '../../i18n'
import { calcMessages } from '../../i18n/messages/calc'
import { SectionTitle, TypeTag } from '../ui/shared'
import { koLabel, pctText, type MoveCalc, type MoveSummary } from './calcState'
import { CategoryLabel, CopyButton, HpBar } from './ui'

type Props = {
    attacker: string
    defender: string
    moves: string[]
    pool: MoveData[]
    results: (MoveCalc | null)[]
    defenderHp: number
    onChangeMove: (index: number, slug: string) => void
}

/** 기술 검색 키: slug + 한/영/일 이름 + 한/영/일 타입 이름 */
function moveSearchKey(m: MoveData): string {
    return [m.name, ...LANGS.map(l => moveName(m.name, l)), ...LANGS.map(l => typeName(m.type, l))].join(' ').toLowerCase()
}

function MoveSearch({ pool, exclude, onPick, onClose }: {
    pool: MoveData[]; exclude: string[]; onPick: (slug: string) => void; onClose: () => void
}) {
    const lang = useLang()
    const t = useT(calcMessages)
    const [q, setQ] = useState('')
    const keyed = useMemo(() => pool.map(m => ({ m, key: moveSearchKey(m) })), [pool])
    const list = useMemo(() => {
        const s = q.trim().toLowerCase()
        const slug = s.replace(/\s+/g, '-')
        return keyed
            .filter(({ m, key }) => !exclude.includes(m.name) && (!s || key.includes(s) || key.includes(slug)))
            .map(x => x.m)
    }, [keyed, q, exclude])

    return (
        <VStack gap={2} className="py-1">
            <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                    <TextInput
                        type="search" hasAutoFocus width="100%" size="sm" startIcon="search"
                        label={t('moveSearchLabel')} isLabelHidden
                        placeholder={t('moveSearchPlaceholder')} value={q}
                        onChange={v => setQ(v)}
                        onKeyDown={e => {
                            if (e.key === 'Escape') onClose()
                            if (e.key === 'Enter' && list[0]) { e.preventDefault(); onPick(list[0].name) }
                        }}
                    />
                </div>
                <Button size="sm" variant="ghost" label={t('close')} onClick={onClose} />
            </div>
            <ul className="m-0 max-h-64 list-none overflow-y-auto rounded-lg border border-border p-1" aria-label={t('moveSearchLabel')}>
                {list.length === 0 && <li className="px-2 py-2"><Text color="secondary">{t('noMoves')}</Text></li>}
                {list.map(m => (
                    <li key={m.name}>
                        <button
                            type="button" onClick={() => onPick(m.name)}
                            className="flex w-full cursor-pointer items-center gap-2 rounded-md bg-transparent px-2 py-1.5 text-left hover:bg-muted focus-visible:bg-muted"
                        >
                            <span className="min-w-0 flex-1 truncate"><Text weight="medium">{moveNameL(m.name, lang)}</Text></span>
                            <TypeTag type={m.type} size="xs" />
                            <span className="hidden w-12 shrink-0 min-[420px]:inline"><CategoryLabel category={m.category} /></span>
                            <span className="w-8 shrink-0 text-right">
                                <Text type="supporting" color="secondary" hasTabularNumbers>{m.power ?? '-'}</Text>
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </VStack>
    )
}

const koTone = (s: MoveSummary) =>
    s.koChance === 'guaranteed' ? 'text-error' : s.koChance === 'rng' ? 'text-warning' : 'text-secondary'

export function MoveResults({ attacker, defender, moves, pool, results, defenderHp, onChangeMove }: Props) {
    const lang = useLang()
    const t = useT(calcMessages)
    const baseId = useId()
    const [editing, setEditing] = useState<number | null>(null)
    const [selected, setSelected] = useState(0)
    const slots = [0, 1, 2, 3]
    const firstResult = results.findIndex(Boolean)
    const selIdx = results[selected] ? selected : firstResult
    const sel = selIdx >= 0 ? results[selIdx] : null

    const resultLine = (r: MoveCalc) => t('resultLine', {
        atk: pokemonNameL(attacker, lang),
        move: moveNameL(r.slug, lang),
        def: pokemonNameL(defender, lang),
        min: formatNumber(r.summary.min, lang),
        max: formatNumber(r.summary.max, lang),
        minPct: pctText(r.summary.minRatio, lang),
        maxPct: pctText(r.summary.maxRatio, lang),
        ko: koLabel(r.summary, lang),
    })

    return (
        <Card role="region" aria-labelledby={`${baseId}-title`} className="min-w-0">
            <SectionTitle id={`${baseId}-title`}>{t('movesTitle')}</SectionTitle>

            <Table density="balanced" dividers="rows" hasHover>
                <TableHeader>
                    <TableRow isHeaderRow>
                        <TableHeaderCell scope="col">{t('colMove')}</TableHeaderCell>
                        <TableHeaderCell scope="col" className="hidden sm:table-cell">{t('colType')}</TableHeaderCell>
                        <TableHeaderCell scope="col">{t('colDamage')}</TableHeaderCell>
                        <TableHeaderCell scope="col" className="text-right">{t('colKo')}</TableHeaderCell>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {slots.map(i => {
                        const slug = moves[i]
                        const r = results[i]
                        const isSel = selIdx === i && !!r
                        const moveLabel = slug ? moveNameL(slug, lang) : t('chooseMove')
                        const type = r ? (r.detail.moveType ?? r.move.type) : null
                        const category = r ? (r.detail.category ?? r.move.category) : null
                        return (
                            <Fragment key={i}>
                                <TableRow
                                    className={`${r ? 'cursor-pointer' : ''} ${isSel ? 'bg-accent-muted' : ''}`}
                                    onClick={r ? () => setSelected(i) : undefined}
                                >
                                    <TableCell>
                                        <span className="flex flex-col items-start gap-1">
                                            <Button
                                                size="sm" variant="ghost"
                                                label={`${t('moveSlot', { n: i + 1 })}: ${moveLabel}, ${t('changeMove')}`}
                                                tooltip={t('changeMove')}
                                                aria-expanded={editing === i}
                                                onClick={e => { e.stopPropagation(); setEditing(editing === i ? null : i) }}
                                                className="-ml-2 max-w-full"
                                            >
                                                <span className="truncate font-semibold">{moveLabel}</span>
                                            </Button>
                                            {r && category && (
                                                <span className="flex items-center gap-2 sm:hidden">
                                                    {type && <TypeTag type={type} size="xs" />}
                                                    <CategoryLabel category={category} />
                                                </span>
                                            )}
                                        </span>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell">
                                        {r && type && category && (
                                            <span className="flex flex-col items-start gap-1">
                                                <TypeTag type={type} size="sm" />
                                                <CategoryLabel category={category} />
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {r && (
                                            <button
                                                type="button"
                                                aria-pressed={isSel}
                                                aria-label={t('selectMove', { move: moveLabel })}
                                                onClick={e => { e.stopPropagation(); setSelected(i) }}
                                                className="flex w-full min-w-24 cursor-pointer flex-col gap-1 rounded-md bg-transparent p-0 text-left"
                                            >
                                                <Text weight="semibold" hasTabularNumbers>
                                                    {pctText(r.summary.minRatio, lang)} – {pctText(r.summary.maxRatio, lang)}
                                                </Text>
                                                <HpBar
                                                    min={r.summary.minRatio} max={r.summary.maxRatio}
                                                    label={t('hpBarLabel', { min: pctText(r.summary.minRatio, lang), max: pctText(r.summary.maxRatio, lang) })}
                                                />
                                            </button>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {r && (
                                            <span className={koTone(r.summary)}>
                                                <Text weight="semibold" color="inherit">{koLabel(r.summary, lang)}</Text>
                                            </span>
                                        )}
                                    </TableCell>
                                </TableRow>
                                {editing === i && (
                                    <TableRow>
                                        <TableCell colSpan={4}>
                                            <MoveSearch
                                                pool={pool} exclude={moves.filter((m, j) => j !== i && !!m)}
                                                onPick={s => { onChangeMove(i, s); setEditing(null); setSelected(i) }}
                                                onClose={() => setEditing(null)}
                                            />
                                        </TableCell>
                                    </TableRow>
                                )}
                            </Fragment>
                        )
                    })}
                </TableBody>
            </Table>

            {sel && (
                <section className="mt-6 flex flex-col gap-4 border-t border-border pt-5" aria-live="polite" aria-labelledby={`${baseId}-detail`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <VStack gap={1} className="min-w-0">
                            <span id={`${baseId}-detail`}>
                                <Heading level={3}>{t('detailTitle', { move: moveNameL(sel.slug, lang) })}</Heading>
                            </span>
                            <span className={koTone(sel.summary)}>
                                <Text type="display-3" color="inherit">{koLabel(sel.summary, lang)}</Text>
                            </span>
                        </VStack>
                        <CopyButton text={resultLine(sel)} label={t('copyResult')} copiedLabel={t('copied')} />
                    </div>

                    <Text type="large" as="p">{resultLine(sel)}</Text>

                    <VStack gap={1}>
                        <HpBar
                            size="md" min={sel.summary.minRatio} max={sel.summary.maxRatio}
                            label={t('hpBarLabel', { min: pctText(sel.summary.minRatio, lang), max: pctText(sel.summary.maxRatio, lang) })}
                        />
                        <Text type="supporting" color="secondary" hasTabularNumbers>
                            {formatNumber(sel.summary.min, lang)} – {formatNumber(sel.summary.max, lang)} / {formatNumber(defenderHp, lang)} HP
                        </Text>
                    </VStack>

                    <div className="flex flex-wrap gap-x-6 gap-y-1">
                        <span className={sel.detail.effectiveness > 1 ? 'text-error' : sel.detail.effectiveness < 1 ? 'text-info' : 'text-primary'}>
                            <Text color="inherit">{t('effectiveness', { n: String(sel.detail.effectiveness) })}</Text>
                        </span>
                        <Text>{sel.detail.isSTAB ? t('stabYes') : t('stabNo')}</Text>
                        <Text>{t('power', { n: sel.detail.basePower })}</Text>
                    </div>

                    <VStack gap={2}>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <Text type="label">{t('rolls')}</Text>
                            <Text type="supporting" color="secondary">{t('rollsHint')}</Text>
                        </div>
                        <ol className="m-0 grid list-none grid-cols-4 gap-1 p-0 sm:grid-cols-8">
                            {sel.summary.range.map((d, i) => {
                                const kills = d >= defenderHp
                                return (
                                    <li
                                        key={i}
                                        title={`${i + 1}/16, ${pctText(d / Math.max(1, defenderHp), lang)}`}
                                        className={`rounded-md px-1 py-1.5 text-center ${kills ? 'bg-error-muted text-error' : 'bg-muted text-primary'}`}
                                    >
                                        <Text color="inherit" weight={kills ? 'bold' : 'normal'} hasTabularNumbers>{d}</Text>
                                    </li>
                                )
                            })}
                        </ol>
                    </VStack>

                    <VStack gap={2}>
                        <div className="flex items-center justify-between gap-2">
                            <Text type="label">{t('showdownDesc')}</Text>
                            <CopyButton text={sel.detail.desc} label={t('copy')} copiedLabel={t('copied')} />
                        </div>
                        <div className="break-words rounded-lg bg-muted px-3 py-2" lang="en">
                            <Text type="code">{sel.detail.desc}</Text>
                        </div>
                    </VStack>
                </section>
            )}
        </Card>
    )
}
