import { Link } from 'react-router'
import { calcBaseStat, calcHP, getSpecies } from '@kyasi/pokebattle-engine'
import { BATTLE_STAT_LABEL_KO, useEngineReady, abilityNameKo } from '../lib/battle'
import { getDexPokemon } from '../lib/dex'

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
    const { ready, error } = useEngineReady()
    const dex = getDexPokemon(dexId)
    const species = ready && dex ? getSpecies(dex.name) : undefined

    return (
        <section className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-300">Battle Stats · 실능치</h3>
                    <p className="mt-1 text-xs text-slate-400">최저 0 IV·0 EV·하락 성격 / 무보정 31 IV·0 EV / 최고 31 IV·252 EV·상승 성격</p>
                </div>
                {dex && species && (
                    <Link
                        to={`/calc?atk=${encodeURIComponent(dex.name)}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-600"
                    >
                        데미지 계산기에서 열기 →
                    </Link>
                )}
            </div>

            {error ? (
                <p className="text-sm text-red-600">배틀 데이터를 불러오지 못했습니다.</p>
            ) : !ready ? (
                <p className="text-sm text-slate-400">배틀 데이터 불러오는 중…</p>
            ) : !species ? (
                <p className="text-sm text-slate-400">배틀 엔진에 이 포켓몬의 데이터가 없습니다.</p>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {LEVELS.map(lv => (
                            <table key={lv} className="w-full border-collapse text-sm tabular-nums">
                                <thead>
                                    <tr className="text-[11px] font-semibold text-slate-400">
                                        <th className="py-1.5 pr-2 text-left"><span className="text-slate-700">Lv.{lv}</span></th>
                                        <th className="px-1 py-1.5 text-right">종족값</th>
                                        <th className="px-1 py-1.5 text-right">최저</th>
                                        <th className="px-1 py-1.5 text-right">무보정</th>
                                        <th className="px-1 py-1.5 text-right">최고</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {KEYS.map(k => {
                                        const base = species.base_stats[k]
                                        const r = realStats(base, k, lv)
                                        return (
                                            <tr key={k} className="border-t border-slate-100">
                                                <td className="py-2 pr-2 font-semibold text-slate-700">{BATTLE_STAT_LABEL_KO[k]}</td>
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
                    <p className="mt-2 text-[11px] text-slate-400">HP는 성격의 영향을 받지 않습니다.</p>

                    <div className="mt-4">
                        <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-300">특성 (배틀 엔진)</div>
                        <div className="flex flex-wrap gap-2">
                            {species.abilities.map(a => (
                                <span
                                    key={a.name}
                                    className={`rounded-xl border px-3 py-1.5 text-sm font-semibold ${a.hidden ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
                                >
                                    {abilityNameKo(a.name)}
                                    {a.hidden && <span className="ml-1.5 text-[10px] font-bold text-violet-500">숨겨진 특성</span>}
                                </span>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </section>
    )
}

