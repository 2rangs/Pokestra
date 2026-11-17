import { getSpecies, type BattlePokemon, type Nature, type PrimaryStatus } from '@kyasi/pokebattle-engine'
import { BATTLE_STAT_LABEL_KO, ITEMS, NATURES, itemNameKo, typeNameKo, abilityNameKo } from '../../lib/battle'
import { displayNameKo, findDexPokemonByName, officialArtworkUrl, type DexPokemon } from '../../lib/dex'
import {
    EV_TOTAL_MAX, STATUS_OPTIONS, STAT_ORDER, TERA_TYPES, clampEv, evTotal, stagedStats,
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
const fmtStage = (n: number) => (n > 0 ? `+${n}` : String(n))

export function SidePanel({ role, state, bp, onChange, onPick }: Props) {
    const dex = findDexPokemonByName(state.slug)
    const species = getSpecies(state.slug)
    const abilities = species?.abilities ?? []
    const nature = NATURES.find(n => n.id === state.nature)
    const real = stagedStats(bp)
    const total = evTotal(state.evs)
    const isAtk = role === 'atk'

    const set = <K extends keyof SideState>(key: K, value: SideState[K]) => onChange({ ...state, [key]: value })

    const setEv = (k: CalcStatKey, raw: number) =>
        onChange({ ...state, evs: { ...state.evs, [k]: clampEv(state.evs, k, raw) } })
    const setIv = (k: CalcStatKey, raw: number) =>
        onChange({ ...state, ivs: { ...state.ivs, [k]: Math.max(0, Math.min(31, Math.round(Number.isFinite(raw) ? raw : 0))) } })
    const setStage = (k: StageKey, v: number) => onChange({ ...state, stages: { ...state.stages, [k]: v } })

    const itemOptions = state.item && !ITEMS.some(i => i.id === state.item)
        ? [{ id: state.item, ko: itemNameKo(state.item) }, ...ITEMS]
        : ITEMS
    const abilityOptions = state.ability && !abilities.some(a => a.name === state.ability)
        ? [{ name: state.ability, hidden: false, slot: 0 }, ...abilities]
        : abilities

    const natureLabel = (n: typeof NATURES[number]) =>
        n.up ? `${n.ko} (${BATTLE_STAT_LABEL_KO[n.up]}↑ ${BATTLE_STAT_LABEL_KO[n.down!]}↓)` : `${n.ko} (무보정)`

    return (
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="mb-3 flex items-center gap-2">
                <span className={`rounded-md px-2 py-0.5 text-xs font-bold text-white ${isAtk ? 'bg-red-500' : 'bg-slate-700'}`}>
                    {isAtk ? '공격 측' : '방어 측'}
                </span>
                <div className="min-w-0 flex-1">
                    <PokemonPicker current={dex} onPick={onPick} />
                </div>
            </div>

            {/* 포켓몬 정보 */}
            <div className="mb-3 flex items-center gap-3">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-slate-50">
                    {dex && <img src={officialArtworkUrl(dex.id)} alt={displayNameKo(dex)} className="h-22 w-22 object-contain" />}
                </div>
                <div className="min-w-0">
                    <div className="truncate text-lg font-bold text-slate-900">{dex ? displayNameKo(dex) : state.slug}</div>
                    <div className="mb-1.5 truncate text-xs text-slate-400">{state.slug}</div>
                    <div className="flex flex-wrap gap-1">
                        {bp.types.filter((t): t is string => !!t).map(t => <TypeChip key={t} type={t} small />)}
                        {state.tera && <span className="self-center text-[10px] font-semibold text-violet-600">테라스탈</span>}
                    </div>
                </div>
            </div>

            {/* 세팅 */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <FieldLabel label="레벨">
                    <input
                        type="number" min={1} max={100} className={inputCls} value={state.level}
                        onChange={e => set('level', Math.max(1, Math.min(100, Math.round(Number(e.target.value) || 1))))}
                    />
                </FieldLabel>
                <FieldLabel label="성격" className="sm:col-span-2">
                    <select className={inputCls} value={state.nature} onChange={e => set('nature', e.target.value as Nature)}>
                        {NATURES.map(n => <option key={n.id} value={n.id}>{natureLabel(n)}</option>)}
                    </select>
                </FieldLabel>
                <FieldLabel label="특성">
                    <select className={inputCls} value={state.ability} onChange={e => set('ability', e.target.value)}>
                        {abilityOptions.map(a => (
                            <option key={a.name} value={a.name}>{abilityNameKo(a.name)}{a.hidden ? ' (숨겨진 특성)' : ''}</option>
                        ))}
                    </select>
                </FieldLabel>
                <FieldLabel label="도구">
                    <select className={inputCls} value={state.item} onChange={e => set('item', e.target.value)}>
                        <option value="">없음</option>
                        {itemOptions.map(i => <option key={i.id} value={i.id}>{i.ko}</option>)}
                    </select>
                </FieldLabel>
                <FieldLabel label="상태이상">
                    <select
                        className={inputCls} value={state.status ?? ''}
                        onChange={e => set('status', (e.target.value || null) as PrimaryStatus)}
                    >
                        {STATUS_OPTIONS.map(s => <option key={s.id ?? 'none'} value={s.id ?? ''}>{s.ko}</option>)}
                    </select>
                </FieldLabel>
                <FieldLabel label="테라 타입" className="col-span-2 sm:col-span-3">
                    <div className="flex items-center gap-2">
                        <select className={inputCls} value={state.teraType} onChange={e => set('teraType', e.target.value)}>
                            {TERA_TYPES.map(t => <option key={t} value={t}>{typeNameKo(t)}</option>)}
                        </select>
                        <span className="flex shrink-0 cursor-pointer items-center gap-1 text-xs font-semibold text-slate-600">
                            <input
                                type="checkbox" className="h-4 w-4 accent-violet-600" checked={state.tera}
                                onChange={e => set('tera', e.target.checked)}
                            />
                            테라스탈
                        </span>
                    </div>
                </FieldLabel>
            </div>

            {!isAtk && (
                <FieldLabel label={`현재 HP ${state.hpPct}% (${bp.hp} / ${bp.max_hp})`} className="mt-3">
                    <input
                        type="range" min={1} max={100} value={state.hpPct} className="w-full accent-red-500"
                        onChange={e => set('hpPct', Number(e.target.value))}
                    />
                </FieldLabel>
            )}

            {/* 능력치 */}
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
                <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem_2rem_3rem_2.5rem] items-center gap-1.5 bg-slate-50 px-2 py-1.5 text-[10px] font-semibold text-slate-500">
                    <span>능력</span>
                    <span>노력치 <span className={total >= EV_TOTAL_MAX ? 'text-red-500' : ''}>{total}/{EV_TOTAL_MAX}</span></span>
                    <span className="text-center">EV</span>
                    <span className="text-center">IV</span>
                    <span className="text-center">랭크</span>
                    <span className="text-right">실능</span>
                </div>
                {STAT_ORDER.map(k => {
                    const up = nature?.up === k
                    const down = nature?.down === k
                    const base = species?.base_stats[k] ?? 0
                    return (
                        <div key={k} className="grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem_2rem_3rem_2.5rem] items-center gap-1.5 border-t border-slate-100 px-2 py-1">
                            <span className="text-xs font-semibold leading-tight text-slate-700">
                                {BATTLE_STAT_LABEL_KO[k]}
                                {up && <span className="text-red-500">↑</span>}
                                {down && <span className="text-blue-500">↓</span>}
                                <span className="block text-[10px] font-normal text-slate-400">{base}</span>
                            </span>
                            <input
                                type="range" min={0} max={252} step={4} value={state.evs[k]} aria-label={`${BATTLE_STAT_LABEL_KO[k]} 노력치`}
                                className="w-full min-w-0 accent-red-500"
                                onChange={e => setEv(k, Number(e.target.value))}
                            />
                            <input
                                type="number" min={0} max={252} step={4} value={state.evs[k]}
                                className={`${inputCls} ${numCls}`}
                                onChange={e => setEv(k, Number(e.target.value))}
                            />
                            <input
                                type="number" min={0} max={31} value={state.ivs[k]}
                                className={`${inputCls} ${numCls}`}
                                onChange={e => setIv(k, Number(e.target.value))}
                            />
                            {k === 'hp' ? <span className="text-center text-xs text-slate-300">—</span> : (
                                <select
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
