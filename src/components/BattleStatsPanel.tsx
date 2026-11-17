import { Link } from 'react-router'
import { calcBaseStat, calcHP, getSpecies } from '@kyasi/pokebattle-engine'
import { useLang, useT } from '../i18n'
import { pokedexMessages } from '../i18n/messages/pokedex'
import { abilityNameL, battleStatLabel, useEngineReady } from '../lib/battle'
import { ABILITY_BY_NAME, getDexPokemon } from '../lib/dex'

const KEYS = ['hp', 'attack', 'defense', 'special_attack', 'special_defense', 'speed'] as const
type Key = typeof KEYS[number]
const LEVELS = [50, 100] as const

/** min: 0 IV / 0 EV / 하락 성격, neutral: 31 IV / 0 EV / 무보정, max: 31 IV / 252 EV / 상승 성격 */
function realStats(base: number, key: Key, level: number) {
    if (key === 'hp') {
        // 껍질몬(HP 종족값 1)은 항상 1
        if (base === 1) return { min: 1, neutral: 1, max: 1 }
        return { min: calcHP(base, level, 0, 0), neutral: calcHP(base, level, 31, 0), max: calcHP(base, level, 31, 252) }
    }
    return {
        min: calcBaseStat(base, level, 0, 0, 0.9),
        neutral: calcBaseStat(base, level, 31, 0, 1),
        max: calcBaseStat(base, level, 31, 252, 1.1),
    }
}

export default function BattleStatsPanel({ dexId }: { dexId: number }) {
    const lang = useLang()
    const t = useT(pokedexMessages)
    const { ready, error } = useEngineReady()
    const dex = getDexPokemon(dexId)
    const species = ready && dex ? getSpecies(dex.name) : undefined

    return (
        <section aria-labelledby="battle-stats-title" className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <h3 id="battle-stats-title" className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">
                        {t('battleTitle')}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">{t('battleNote')}</p>
                </div>
                {dex && species && (
                    <Link
                        to={`/calc?atk=${encodeURIComponent(dex.name)}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                    >
                        {t('openInCalc')}
                    </Link>
                )}
            </div>

            {error ? (
                <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600" role="alert">{t('battleLoadError')}</p>
            ) : !ready ? (
                <div className="space-y-2" role="status" aria-live="polite">
                    <span className="sr-only">{t('battleLoading')}</span>
                    {[0, 1, 2].map(i => (
                        <div key={i} className="h-8 animate-pulse rounded-xl bg-slate-100" aria-hidden />
                    ))}
                </div>
            ) : !species ? (
                <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">{t('battleNoData')}</p>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {LEVELS.map(lv => (
                            <table key={lv} className="w-full border-collapse text-sm tabular-nums">
                                <caption className="sr-only">{`${t('battleTitle')} Lv.${lv}`}</caption>
                                <thead>
                                    <tr className="text-[11px] font-semibold text-slate-400">
                                        <th scope="col" className="py-1.5 pr-2 text-left"><span className="text-slate-700">Lv.{lv}</span></th>
                                        <th scope="col" className="px-1 py-1.5 text-right">{t('colBase')}</th>
                                        <th scope="col" className="px-1 py-1.5 text-right">{t('colMin')}</th>
                                        <th scope="col" className="px-1 py-1.5 text-right">{t('colNeutral')}</th>
                                        <th scope="col" className="px-1 py-1.5 text-right">{t('colMax')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {KEYS.map(k => {
                                        const base = species.base_stats[k]
                                        const r = realStats(base, k, lv)
                                        return (
                                            <tr key={k} className="border-t border-slate-100">
                                                <th scope="row" className="py-2 pr-2 text-left font-semibold text-slate-700">{battleStatLabel(k, lang)}</th>
                                                <td className="px-1 py-2 text-right text-slate-400">{base}</td>
                                                <td className="px-1 py-2 text-right text-blue-600">{r.min}</td>
                                                <td className="px-1 py-2 text-right text-slate-700">{r.neutral}</td>
                                                <td className="px-1 py-2 text-right font-bold text-red-600">{r.max}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        ))}
                    </div>
                    <p className="mt-2 text-[11px] text-slate-400">{t('hpNatureNote')}</p>

                    <div className="mt-4">
                        <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400">{t('engineAbilities')}</div>
                        <div className="flex flex-wrap gap-2">
                            {species.abilities.map(a => {
                                const cls = `rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${a.hidden ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 bg-slate-50 text-slate-700'}`
                                const body = (
                                    <>
                                        {abilityNameL(a.name, lang)}
                                        {a.hidden && <span className="ml-1.5 text-[10px] font-bold text-violet-500">{t('hiddenAbility')}</span>}
                                    </>
                                )
                                return ABILITY_BY_NAME.has(a.name) ? (
                                    <Link key={a.name} to={`/abilities/${a.name}`} className={`${cls} hover:border-slate-300 hover:bg-white`}>
                                        {body}
                                    </Link>
                                ) : (
                                    <span key={a.name} className={cls}>{body}</span>
                                )
                            })}
                        </div>
                    </div>
                </>
            )}
        </section>
    )
}
