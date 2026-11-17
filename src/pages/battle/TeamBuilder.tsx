import { useMemo, useState } from 'react'
import {
    getMove, getSpecies, parseShowdownTeam, exportShowdownTeam, PRNG, toId,
    type PokemonSet,
} from '@kyasi/pokebattle-engine'
import { findDexPokemonByName, TYPES, type DexPokemon } from '../../lib/dex'
import {
    ITEMS, NATURES, buildSet, itemNameKo, moveNameKo, pokemonNameKo, spriteUrl, dexIdOf,
    BATTLE_STAT_LABEL_KO, TYPE_COLOR, abilityNameKo } from '../../lib/battle'
import { PokemonSearch } from '../../components/battle/PokemonSearch'
import { TypeBadge } from '../../components/battle/TypeBadge'

const EV_PRESETS: { id: string; label: string; evs: PokemonSet['evs'] }[] = [
    { id: 'phys', label: '물리 공격형 (공격·스피드)', evs: { attack: 252, speed: 252, hp: 4 } },
    { id: 'spec', label: '특수 공격형 (특공·스피드)', evs: { special_attack: 252, speed: 252, hp: 4 } },
    { id: 'bulky-phys', label: '물리 내구형 (HP·방어)', evs: { hp: 252, defense: 252, special_defense: 4 } },
    { id: 'bulky-spec', label: '특수 내구형 (HP·특방)', evs: { hp: 252, special_defense: 252, defense: 4 } },
    { id: 'tank-atk', label: '탱커 (HP·공격)', evs: { hp: 252, attack: 252, special_defense: 4 } },
    { id: 'tank-spa', label: '탱커 (HP·특공)', evs: { hp: 252, special_attack: 252, special_defense: 4 } },
]

function evSummary(evs: PokemonSet['evs']): string {
    return Object.entries(evs ?? {})
        .filter(([, v]) => (v ?? 0) > 0)
        .map(([k, v]) => `${BATTLE_STAT_LABEL_KO[k] ?? k} ${v}`)
        .join(' / ') || '노력치 없음'
}

function presetOf(evs: PokemonSet['evs']): string {
    const key = JSON.stringify(evs ?? {})
    return EV_PRESETS.find(p => JSON.stringify(p.evs) === key)?.id ?? ''
}

interface SlotEditorProps {
    set: PokemonSet
    onChange: (s: PokemonSet) => void
    onRemove: () => void
    onReroll: () => void
}

function SlotEditor({ set, onChange, onRemove, onReroll }: SlotEditorProps) {
    const [open, setOpen] = useState(false)
    const dex = findDexPokemonByName(set.species)
    const species = getSpecies(set.species)
    const id = dexIdOf(set.species)

    const learnable = useMemo(() => {
        const names = dex?.moves ?? []
        return names
            .map(n => getMove(n))
            .filter((m): m is NonNullable<typeof m> => !!m)
            .sort((a, b) => moveNameKo(a.name).localeCompare(moveNameKo(b.name), 'ko'))
    }, [dex])

    const setMove = (i: number, name: string) => {
        const moves = [...set.moves] as string[]
        moves[i] = name
        onChange({ ...set, moves: moves.filter(Boolean) as PokemonSet['moves'] })
    }

    const types = species?.types ?? dex?.types ?? []
    const select = 'w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-red-400'

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-start gap-3">
                {id && <img src={spriteUrl(id)} alt="" className="h-14 w-14 shrink-0 object-contain [image-rendering:pixelated]" />}
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-slate-900">{set.nickname ?? pokemonNameKo(set.species)}</span>
                        <span className="text-xs text-slate-400">Lv.{set.level}</span>
                        {types.map(t => <TypeBadge key={t} type={t} size="xs" />)}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-slate-500">
                        {abilityNameKo(set.ability)} · {set.item ? itemNameKo(set.item) : '도구 없음'} · {NATURES.find(n => n.id === set.nature)?.ko ?? set.nature}
                        {set.teraType && <> · 테라 <TypeBadge type={set.teraType} size="xs" /></>}
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-1">
                        {set.moves.filter(Boolean).map(m => {
                            const md = getMove(m!)
                            return (
                                <span key={m} className="flex items-center gap-1 truncate rounded-md bg-slate-50 px-1.5 py-0.5 text-xs text-slate-700">
                                    {md && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: TYPE_COLOR[md.type] ?? '#94a3b8' }} />}
                                    <span className="truncate">{moveNameKo(m!)}</span>
                                </span>
                            )
                        })}
                    </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                    <button type="button" onClick={() => setOpen(o => !o)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200">{open ? '접기' : '편집'}</button>
                    <button type="button" onClick={onReroll} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200" title="추천 세트 다시 뽑기">🎲</button>
                    <button type="button" onClick={onRemove} className="rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-500 hover:bg-red-100">삭제</button>
                </div>
            </div>

            {open && (
                <div className="mt-3 grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">
                    <label className="text-xs text-slate-500">특성
                        <select className={select} value={set.ability} onChange={e => onChange({ ...set, ability: e.target.value })}>
                            {(species?.abilities ?? []).map(a => <option key={a.name} value={a.name}>{abilityNameKo(a.name)}{a.hidden ? ' (숨겨진 특성)' : ''}</option>)}
                        </select>
                    </label>
                    <label className="text-xs text-slate-500">도구
                        <select className={select} value={set.item ?? ''} onChange={e => onChange({ ...set, item: e.target.value || undefined })}>
                            <option value="">없음</option>
                            {ITEMS.map(i => <option key={i.id} value={i.id}>{i.ko}</option>)}
                        </select>
                    </label>
                    <label className="text-xs text-slate-500">성격
                        <select className={select} value={set.nature} onChange={e => onChange({ ...set, nature: e.target.value as PokemonSet['nature'] })}>
                            {NATURES.map(n => (
                                <option key={n.id} value={n.id}>
                                    {n.ko}{n.up ? ` (+${BATTLE_STAT_LABEL_KO[n.up]} -${BATTLE_STAT_LABEL_KO[n.down!]})` : ''}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="text-xs text-slate-500">테라스탈 타입
                        <select className={select} value={set.teraType ?? ''} onChange={e => onChange({ ...set, teraType: e.target.value || undefined })}>
                            <option value="">없음</option>
                            {TYPES.map(t => <option key={t.name} value={t.name}>{t.nameKo}</option>)}
                            <option value="stellar">스텔라</option>
                        </select>
                    </label>
                    <label className="text-xs text-slate-500 sm:col-span-2">노력치
                        <select className={select} value={presetOf(set.evs)} onChange={e => {
                            const p = EV_PRESETS.find(x => x.id === e.target.value)
                            if (p) onChange({ ...set, evs: p.evs })
                        }}>
                            <option value="" disabled>{evSummary(set.evs)}</option>
                            {EV_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select>
                    </label>
                    {[0, 1, 2, 3].map(i => (
                        <label key={i} className="text-xs text-slate-500">기술 {i + 1}
                            <select className={select} value={set.moves[i] ?? ''} onChange={e => setMove(i, e.target.value)}>
                                <option value="">—</option>
                                {learnable.map(m => (
                                    <option key={m.name} value={m.name}>
                                        {moveNameKo(m.name)} · {m.category === 'status' ? '변화' : `${m.category === 'physical' ? '물리' : '특수'} ${m.power ?? '-'}`}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ))}
                </div>
            )}
        </div>
    )
}

interface TeamBuilderProps {
    team: PokemonSet[]
    onChange: (team: PokemonSet[]) => void
    onRandom: () => void
    maxSize?: number
}

export function TeamBuilder({ team, onChange, onRandom, maxSize = 6 }: TeamBuilderProps) {
    const [ioOpen, setIoOpen] = useState(false)
    const [text, setText] = useState('')
    const [ioError, setIoError] = useState<string | null>(null)

    const add = (p: DexPokemon) => {
        if (team.length >= maxSize) return
        onChange([...team, buildSet(p, new PRNG(Date.now()))])
    }

    const importText = () => {
        try {
            const parsed = parseShowdownTeam(text).slice(0, 6).map(s => {
                const sp = getSpecies(s.species) ?? getSpecies(toId(s.species))
                if (!sp) throw new Error(`알 수 없는 포켓몬: ${s.species}`)
                return { ...s, species: sp.name, ability: s.ability || sp.abilities[0]?.name || '', nickname: s.nickname ?? pokemonNameKo(sp.name) }
            })
            if (parsed.length === 0) throw new Error('가져올 포켓몬이 없습니다')
            onChange(parsed)
            setIoError(null)
            setIoOpen(false)
        } catch (err) {
            setIoError((err as Error).message)
        }
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-[200px] flex-1">
                    {team.length < maxSize
                        ? <PokemonSearch onPick={add} placeholder={`포켓몬 추가 (${team.length}/${maxSize})`} />
                        : <p className="text-sm text-slate-400">팀이 가득 찼습니다 ({maxSize}마리)</p>}
                </div>
                <button type="button" onClick={onRandom} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700">🎲 랜덤 팀</button>
                <button type="button" onClick={() => { setText(exportShowdownTeam(team)); setIoOpen(o => !o); setIoError(null) }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                    Showdown 가져오기/내보내기
                </button>
                {team.length > 0 && (
                    <button type="button" onClick={() => onChange([])} className="rounded-xl px-2 py-2 text-sm text-slate-400 hover:text-red-500">비우기</button>
                )}
            </div>

            {ioOpen && (
                <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        rows={10}
                        spellCheck={false}
                        placeholder={'Garchomp @ Choice Scarf\nAbility: Rough Skin\nEVs: 252 Atk / 4 SpD / 252 Spe\nJolly Nature\n- Earthquake\n- Dragon Claw'}
                        className="w-full rounded-xl border border-slate-200 bg-white p-2 font-mono text-xs outline-none focus:border-red-400"
                    />
                    {ioError && <p className="text-xs text-red-500">{ioError}</p>}
                    <div className="flex gap-2">
                        <button type="button" onClick={importText} className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-600">가져오기</button>
                        <button type="button" onClick={() => navigator.clipboard?.writeText(text).catch(() => {})} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600">복사</button>
                    </div>
                </div>
            )}

            {team.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                    포켓몬을 검색해서 추가하거나 랜덤 팀을 만들어 보세요.
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                    {team.map((s, i) => (
                        <SlotEditor
                            key={`${s.species}-${i}`}
                            set={s}
                            onChange={ns => onChange(team.map((x, j) => (j === i ? ns : x)))}
                            onRemove={() => onChange(team.filter((_, j) => j !== i))}
                            onReroll={() => {
                                const dex = findDexPokemonByName(s.species)
                                if (dex) onChange(team.map((x, j) => (j === i ? buildSet(dex, new PRNG(Date.now()), s.level) : x)))
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
