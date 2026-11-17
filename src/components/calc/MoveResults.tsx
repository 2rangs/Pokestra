import { useId, useMemo, useState, type ReactNode } from 'react'
import type { MoveData } from '@kyasi/pokebattle-engine'
import { moveNameL, pokemonNameL } from '../../lib/battle'
import { moveName, typeName } from '../../lib/dex'
import { LANGS, formatNumber, useLang, useT } from '../../i18n'
import { calcMessages } from '../../i18n/messages/calc'
import { koLabel, pctText, type MoveCalc, type MoveSummary } from './calcState'
import { CategoryBadge, CopyButton, TypeChip, inputCls } from './ui'

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
        <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
            <div className="mb-2 flex gap-2">
                <input
                    type="search" autoFocus className={inputCls} placeholder={t('moveSearchPlaceholder')} value={q}
                    aria-label={t('moveSearchLabel')}
                    onChange={e => setQ(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Escape') onClose()
                        if (e.key === 'Enter' && list[0]) onPick(list[0].name)
                    }}
                />
                <button type="button" onClick={onClose} className="shrink-0 rounded-lg px-2 text-sm text-slate-500 hover:bg-slate-100">{t('close')}</button>
            </div>
            <ul className="max-h-64 overflow-y-auto" aria-label={t('moveSearchLabel')}>
                {list.length === 0 && <li className="px-2 py-2 text-sm text-slate-400">{t('noMoves')}</li>}
                {list.map(m => (
                    <li key={m.name}>
                        <button
                            type="button" onClick={() => onPick(m.name)}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                        >
                            <TypeChip type={m.type} small />
                            <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{moveNameL(m.name, lang)}</span>
                            <CategoryBadge category={m.category} />
                            <span className="w-8 shrink-0 text-right text-xs tabular-nums text-slate-500">{m.power ?? '—'}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    )
}

function HpBar({ min, max, label }: { min: number; max: number; label: string }) {
    const a = Math.min(100, min * 100)
    const b = Math.min(100, max * 100)
    const ko = min >= 1 ? 'bg-red-500' : 'bg-red-400'
    return (
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-emerald-100" role="img" aria-label={label} title={label}>
            <div className="absolute inset-y-0 left-0 bg-red-200" style={{ width: `${b}%` }} />
            <div className={`absolute inset-y-0 left-0 ${ko}`} style={{ width: `${a}%` }} />
        </div>
    )
}

const koColor = (s: MoveSummary) =>
    s.koChance === 'guaranteed' ? (s.koHits === 1 ? 'text-red-600' : 'text-red-500')
        : s.koChance === 'rng' ? 'text-orange-600' : 'text-slate-500'

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
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4" aria-labelledby={`${baseId}-title`}>
            <h2 id={`${baseId}-title`} className="mb-3 text-sm font-bold text-slate-800">{t('movesTitle')}</h2>
            <ol className="flex flex-col gap-2">
                {slots.map(i => {
                    const slug = moves[i]
                    const r = results[i]
                    const isSel = selIdx === i && !!r
                    return (
                        <li key={i} className={`rounded-xl border p-2.5 transition-colors ${isSel ? 'border-red-300 bg-red-50/40' : 'border-slate-100 bg-slate-50/60'}`}>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditing(editing === i ? null : i)}
                                    aria-expanded={editing === i}
                                    aria-label={`${t('moveSlot', { n: i + 1 })}: ${slug ? moveNameL(slug, lang) : t('chooseMove')} — ${t('changeMove')}`}
                                    className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-0.5 text-left hover:bg-white"
                                    title={t('changeMove')}
                                >
                                    {r ? <TypeChip type={r.detail.moveType ?? r.move.type} small /> : <span className="h-4 w-8 shrink-0 rounded bg-slate-200" />}
                                    <span className="min-w-0 truncate text-sm font-semibold text-slate-800">
                                        {slug ? moveNameL(slug, lang) : t('chooseMove')}
                                    </span>
                                    {r && <CategoryBadge category={r.detail.category ?? r.move.category} />}
                                    {r && (
                                        <span className="hidden shrink-0 text-[11px] tabular-nums text-slate-400 min-[400px]:inline">
                                            {t('power', { n: r.detail.basePower || r.move.power || '—' })}
                                        </span>
                                    )}
                                    <span className="ml-auto shrink-0 text-xs text-slate-400" aria-hidden>▾</span>
                                </button>
                                {r && (
                                    <button
                                        type="button" onClick={() => setSelected(i)} aria-pressed={isSel}
                                        className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${isSel ? 'bg-red-500 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:text-slate-700'}`}
                                    >
                                        {t('details')}
                                    </button>
                                )}
                            </div>
                            {editing === i && (
                                <MoveSearch
                                    pool={pool} exclude={moves.filter((m, j) => j !== i && !!m)}
                                    onPick={s => { onChangeMove(i, s); setEditing(null); setSelected(i) }}
                                    onClose={() => setEditing(null)}
                                />
                            )}
                            {r && (
                                <div className="mt-2 cursor-pointer" onClick={() => setSelected(i)}>
                                    <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                                        <span className="text-sm font-bold tabular-nums text-slate-900">
                                            {pctText(r.summary.minRatio, lang)} – {pctText(r.summary.maxRatio, lang)}
                                        </span>
                                        <span className="text-xs tabular-nums text-slate-500">
                                            {formatNumber(r.summary.min, lang)} – {formatNumber(r.summary.max, lang)} / {formatNumber(defenderHp, lang)}
                                        </span>
                                        <span className={`text-xs font-bold ${koColor(r.summary)}`}>{koLabel(r.summary, lang)}</span>
                                    </div>
                                    <HpBar
                                        min={r.summary.minRatio} max={r.summary.maxRatio}
                                        label={t('hpBarLabel', { min: pctText(r.summary.minRatio, lang), max: pctText(r.summary.maxRatio, lang) })}
                                    />
                                </div>
                            )}
                        </li>
                    )
                })}
            </ol>

            {sel && (
                <div className="mt-3 rounded-xl border border-slate-100 p-3 text-xs text-slate-600" aria-live="polite">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="min-w-0 truncate font-bold text-slate-800">{t('detailTitle', { move: moveNameL(sel.slug, lang) })}</div>
                        <CopyButton text={resultLine(sel)} label={t('copyResult')} copiedLabel={t('copied')} />
                    </div>
                    <p className="mb-2 rounded-lg bg-slate-50 px-2 py-1.5 text-[12px] font-medium leading-relaxed text-slate-800">
                        {resultLine(sel)}
                    </p>
                    <div className="mb-2 flex flex-wrap gap-1.5">
                        <Tag tone={sel.detail.effectiveness > 1 ? 'up' : sel.detail.effectiveness < 1 ? 'down' : undefined}>
                            {t('effectiveness', { n: String(sel.detail.effectiveness) })}
                        </Tag>
                        <Tag>{sel.detail.isSTAB ? t('stabYes') : t('stabNo')}</Tag>
                        <Tag>{t('power', { n: sel.detail.basePower })}</Tag>
                    </div>

                    <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2">
                        <span className="text-[11px] font-semibold text-slate-500">{t('rolls')}</span>
                        <span className="text-[10px] text-slate-400">{t('rollsHint')}</span>
                    </div>
                    <ol className="mb-3 grid grid-cols-4 gap-1 sm:grid-cols-8">
                        {sel.summary.range.map((d, i) => {
                            const kills = d >= defenderHp
                            return (
                                <li
                                    key={i}
                                    title={`${i + 1}/16 · ${pctText(d / Math.max(1, defenderHp), lang)}`}
                                    className={`rounded-md px-1 py-1 text-center font-mono text-[11px] tabular-nums ${
                                        kills ? 'bg-red-500 font-bold text-white' : 'bg-slate-100 text-slate-700'
                                    }`}
                                >
                                    {d}
                                </li>
                            )
                        })}
                    </ol>

                    <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-slate-500">{t('showdownDesc')}</span>
                        <CopyButton text={sel.detail.desc} label={t('copy')} copiedLabel={t('copied')} />
                    </div>
                    <div className="break-words rounded-lg bg-white px-2 py-1.5 font-mono text-[11px] leading-relaxed text-slate-600 ring-1 ring-slate-100" lang="en">
                        {sel.detail.desc}
                    </div>
                </div>
            )}
        </section>
    )
}

function Tag({ children, tone }: { children: ReactNode; tone?: 'up' | 'down' }) {
    const cls = tone === 'up' ? 'bg-red-50 text-red-700' : tone === 'down' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'
    return <span className={`rounded-md px-2 py-0.5 font-semibold ${cls}`}>{children}</span>
}
