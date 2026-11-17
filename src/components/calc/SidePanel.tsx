import { useMemo } from 'react'
import { getSpecies, type BattlePokemon, type Nature, type PrimaryStatus } from '@kyasi/pokebattle-engine'
import { ITEMS, NATURES, abilityNameL, itemName, natureName, typeNameL } from '../../lib/battle'
import { displayName, findDexPokemonByName, officialArtworkUrl, type DexPokemon } from '../../lib/dex'
import { collator, formatNumber, useLang, useT } from '../../i18n'
import { calcMessages } from '../../i18n/messages/calc'
import {
    EV_TOTAL_MAX, STATUS_IDS, STAT_ORDER, TERA_TYPES, clampEv, evTotal, stagedStats,
    type CalcStatKey, type SideState, type StageKey,
} from './calcState'
import { PokemonPicker } from './PokemonPicker'
import { FieldLabel, TypeChip, inputCls } from './ui'

type Props = {
    role: 'atk' | 'def'
    state: SideState
    bp: BattlePokemon
    onChange: (next: SideState) => void
    onPick: (p: DexPokemon) => void
}

const STAGES = Array.from({ length: 13 }, (_, i) => 6 - i)
const numCls = 'px-0.5 text-center text-xs tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
const statGrid = 'grid grid-cols-[2.75rem_minmax(0,1fr)_2.5rem_2rem_3rem_2.5rem] items-center gap-1.5'
const fmtStage = (n: number) => (n > 0 ? `+${n}` : String(n))

export function SidePanel({ role, state, bp, onChange, onPick }: Props) {
    const lang = useLang()
    const t = useT(calcMessages)
    const dex = findDexPokemonByName(state.slug)
    const species = getSpecies(state.slug)
    const abilities = species?.abilities ?? []
    const nature = NATURES.find(n => n.id === state.nature)
    const real = stagedStats(bp)
    const total = evTotal(state.evs)
    const isAtk = role === 'atk'
    const sideLabel = isAtk ? t('attacker') : t('defender')
    const name = dex ? displayName(dex, lang) : state.slug
    const statName = (k: CalcStatKey) => t(`stat_${k}`)

    const set = <K extends keyof SideState>(key: K, value: SideState[K]) => onChange({ ...state, [key]: value })

    const setEv = (k: CalcStatKey, raw: number) =>
        onChange({ ...state, evs: { ...state.evs, [k]: clampEv(state.evs, k, raw) } })
    const setIv = (k: CalcStatKey, raw: number) =>
        onChange({ ...state, ivs: { ...state.ivs, [k]: Math.max(0, Math.min(31, Math.round(Number.isFinite(raw) ? raw : 0))) } })
    const setStage = (k: StageKey, v: number) => onChange({ ...state, stages: { ...state.stages, [k]: v } })

    const itemOptions = useMemo(() => {
        const ids = ITEMS.map(i => i.id)
        if (state.item && !ids.includes(state.item)) ids.push(state.item)
        const c = collator(lang)
        return ids.map(id => ({ id, label: itemName(id, lang) })).sort((a, b) => c.compare(a.label, b.label))
    }, [state.item, lang])

    const natureOptions = useMemo(() => {
        const c = collator(lang)
        return NATURES
            .map(n => {
                const base = natureName(n.id, lang)
                const label = n.up && n.down
                    ? `${base} (${t(`stat_${n.up as StageKey}`)}↑ ${t(`stat_${n.down as StageKey}`)}↓)`
                    : `${base} (${t('natureNeutral')})`
                return { id: n.id, label, base }
            })
            .sort((a, b) => c.compare(a.base, b.base))
    }, [lang, t])

    const abilityOptions = state.ability && !abilities.some(a => a.name === state.ability)
        ? [{ name: state.ability, hidden: false, slot: 0 }, ...abilities]
        : abilities

    return (
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4" aria-label={`${sideLabel}: ${name}`}>
            <div className="mb-3 flex items-center gap-2">
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-bold text-white ${isAtk ? 'bg-red-500' : 'bg-slate-700'}`}>
                    {sideLabel}
                </span>
                <div className="min-w-0 flex-1">
                    <PokemonPicker current={dex} sideLabel={sideLabel} onPick={onPick} />
                </div>
            </div>

            {/* 포켓몬 정보 */}
            <div className="mb-3 flex items-center gap-3">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-slate-50 sm:h-24 sm:w-24">
                    {dex && <img src={officialArtworkUrl(dex.id)} alt={name} className="h-18 w-18 object-contain sm:h-22 sm:w-22" />}
                </div>
                <div className="min-w-0">
                    <div className="truncate text-lg font-bold text-slate-900">{name}</div>
                    <div className="mb-1.5 truncate text-xs text-slate-400">{dex && dex.id < 10000 ? `#${dex.id} · ` : ''}{state.slug}</div>
                    <div className="flex flex-wrap gap-1">
                        {bp.types.filter((x): x is string => !!x).map(x => <TypeChip key={x} type={x} small />)}
                        {state.tera && <span className="self-center text-[10px] font-semibold text-violet-600">{t('terastallize')}</span>}
                    </div>
                </div>
            </div>

            {/* 세팅 */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <FieldLabel label={t('level')}>
                    <input
                        type="number" min={1} max={100} inputMode="numeric" className={inputCls} value={state.level}
                        onChange={e => set('level', Math.max(1, Math.min(100, Math.round(Number(e.target.value) || 1))))}
                    />
                </FieldLabel>
                <FieldLabel label={t('nature')} className="sm:col-span-2">
                    <select className={inputCls} value={state.nature} onChange={e => set('nature', e.target.value as Nature)}>
                        {natureOptions.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                    </select>
                </FieldLabel>
                <FieldLabel label={t('ability')}>
                    <select className={inputCls} value={state.ability} onChange={e => set('ability', e.target.value)}>
                        {abilityOptions.map(a => (
                            <option key={a.name} value={a.name}>{abilityNameL(a.name, lang)}{a.hidden ? ` (${t('hiddenAbility')})` : ''}</option>
                        ))}
                    </select>
                </FieldLabel>
                <FieldLabel label={t('item')}>
                    <select className={inputCls} value={state.item} onChange={e => set('item', e.target.value)}>
                        <option value="">{t('none')}</option>
                        {itemOptions.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
                    </select>
                </FieldLabel>
                <FieldLabel label={t('status')}>
                    <select
                        className={inputCls} value={state.status ?? ''}
                        onChange={e => set('status', (e.target.value || null) as PrimaryStatus)}
                    >
                        <option value="">{t('none')}</option>
                        {STATUS_IDS.map(s => <option key={s} value={s}>{t(`status_${s}`)}</option>)}
                    </select>
                </FieldLabel>
                <div className="col-span-2 flex min-w-0 flex-col gap-1 sm:col-span-3">
                    <label htmlFor={`calc-${role}-tera`} className="text-[11px] font-semibold tracking-wide text-slate-500">{t('teraType')}</label>
                    <div className="flex items-center gap-2">
                        <select id={`calc-${role}-tera`} className={inputCls} value={state.teraType} onChange={e => set('teraType', e.target.value)}>
                            {TERA_TYPES.map(x => <option key={x} value={x}>{typeNameL(x, lang)}</option>)}
                        </select>
                        <label className="flex shrink-0 cursor-pointer items-center gap-1 text-xs font-semibold text-slate-600">
                            <input
                                type="checkbox" className="h-4 w-4 accent-violet-600" checked={state.tera}
                                onChange={e => set('tera', e.target.checked)}
                            />
                            {t('terastallize')}
                        </label>
                    </div>
                </div>
            </div>

            {!isAtk && (
                <FieldLabel
                    label={t('currentHp', { pct: state.hpPct, hp: bp.hp, max: bp.max_hp })}
                    className="mt-3"
                >
                    <input
                        type="range" min={1} max={100} value={state.hpPct} className="w-full accent-red-500"
                        onChange={e => set('hpPct', Number(e.target.value))}
                    />
                </FieldLabel>
            )}

            {/* 능력치 */}
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-100" role="group" aria-label={t('statsCaption')}>
                <div className={`${statGrid} bg-slate-50 px-2 py-1.5 text-[10px] font-semibold text-slate-500`} aria-hidden>
                    <span>{t('colStat')}</span>
                    <span className="truncate">
                        {t('colEvs')}{' '}
                        <span className={`tabular-nums ${total >= EV_TOTAL_MAX ? 'text-red-500' : ''}`}>
                            {formatNumber(total, lang)}/{formatNumber(EV_TOTAL_MAX, lang)}
                        </span>
                    </span>
                    <span className="text-center">EV</span>
                    <span className="truncate text-center">{t('colIv')}</span>
                    <span className="truncate text-center">{t('colStage')}</span>
                    <span className="truncate text-right">{t('colReal')}</span>
                </div>
                {STAT_ORDER.map(k => {
                    const up = nature?.up === k
                    const down = nature?.down === k
                    const base = species?.base_stats[k] ?? 0
                    const label = statName(k)
                    return (
                        <div key={k} className={`${statGrid} border-t border-slate-100 px-2 py-1`}>
                            <span className="text-xs font-semibold leading-tight text-slate-700">
                                <span className="whitespace-nowrap">
                                    {label}
                                    {up && <span className="text-red-500" aria-hidden>↑</span>}
                                    {down && <span className="text-blue-500" aria-hidden>↓</span>}
                                </span>
                                <span className="block text-[10px] font-normal tabular-nums text-slate-400" title={t('baseStat', { n: base })}>{base}</span>
                            </span>
                            <input
                                type="range" min={0} max={252} step={4} value={state.evs[k]} aria-label={t('evAria', { stat: label })}
                                className="w-full min-w-0 accent-red-500"
                                onChange={e => setEv(k, Number(e.target.value))}
                            />
                            <input
                                type="number" min={0} max={252} step={4} inputMode="numeric" value={state.evs[k]}
                                aria-label={t('evAria', { stat: label })}
                                className={`${inputCls} ${numCls}`}
                                onChange={e => setEv(k, Number(e.target.value))}
                            />
                            <input
                                type="number" min={0} max={31} inputMode="numeric" value={state.ivs[k]}
                                aria-label={t('ivAria', { stat: label })}
                                className={`${inputCls} ${numCls}`}
                                onChange={e => setIv(k, Number(e.target.value))}
                            />
                            {k === 'hp' ? <span className="text-center text-xs text-slate-300" aria-hidden>—</span> : (
                                <select
                                    aria-label={t('stageAria', { stat: label })}
                                    className={`${inputCls} px-0.5 text-center text-xs ${state.stages[k] > 0 ? 'text-red-600' : state.stages[k] < 0 ? 'text-blue-600' : ''}`}
                                    value={state.stages[k]}
                                    onChange={e => setStage(k, Number(e.target.value))}
                                >
                                    {STAGES.map(s => <option key={s} value={s}>{fmtStage(s)}</option>)}
                                </select>
                            )}
                            <span className={`text-right text-sm font-bold tabular-nums ${up ? 'text-red-600' : down ? 'text-blue-600' : 'text-slate-900'}`}>
                                {real[k]}
                            </span>
                        </div>
                    )
                })}
            </div>
        </section>
    )
}
