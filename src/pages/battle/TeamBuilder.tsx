import { useId, useMemo, useState } from 'react'
import {
    getMove, getSpecies, parseShowdownTeam, exportShowdownTeam, PRNG, toId,
    type PokemonSet,
} from '@kyasi/pokebattle-engine'
import { findDexPokemonByName, TYPES, damageClassName, type DexPokemon } from '../../lib/dex'
import {
    ITEMS, NATURES, buildSet, itemName, moveNameL, abilityNameL, natureName, typeNameL, spriteUrl, dexIdOf,
    battleStatLabel, TYPE_COLOR,
} from '../../lib/battle'
import { pokemonLabel, stripAutoNickname } from '../../lib/battleLog'
import { collator, useLang, useT, type Lang } from '../../i18n'
import { battleMessages } from '../../i18n/messages/battle'
import { PokemonSearch } from '../../components/battle/PokemonSearch'
import { TypeBadge } from '../../components/battle/TypeBadge'

type BattleKey = keyof typeof battleMessages.ko

const EV_PRESETS: { id: string; label: BattleKey; stats: [string, string]; evs: PokemonSet['evs'] }[] = [
    { id: 'phys', label: 'evPhys', stats: ['attack', 'speed'], evs: { attack: 252, speed: 252, hp: 4 } },
    { id: 'spec', label: 'evSpec', stats: ['special_attack', 'speed'], evs: { special_attack: 252, speed: 252, hp: 4 } },
    { id: 'bulky-phys', label: 'evBulkyPhys', stats: ['hp', 'defense'], evs: { hp: 252, defense: 252, special_defense: 4 } },
    { id: 'bulky-spec', label: 'evBulkySpec', stats: ['hp', 'special_defense'], evs: { hp: 252, special_defense: 252, defense: 4 } },
    { id: 'tank-atk', label: 'evTankAtk', stats: ['hp', 'attack'], evs: { hp: 252, attack: 252, special_defense: 4 } },
    { id: 'tank-spa', label: 'evTankSpa', stats: ['hp', 'special_attack'], evs: { hp: 252, special_attack: 252, special_defense: 4 } },
]

function evSummary(evs: PokemonSet['evs'], lang: Lang, none: string): string {
    return Object.entries(evs ?? {})
        .filter(([, v]) => (v ?? 0) > 0)
        .map(([k, v]) => `${battleStatLabel(k, lang)} ${v}`)
        .join(' / ') || none
}

function presetOf(evs: PokemonSet['evs']): string {
    const key = JSON.stringify(evs ?? {})
    return EV_PRESETS.find(p => JSON.stringify(p.evs) === key)?.id ?? ''
}

function moveMeta(m: { category: string; power: number | null }, lang: Lang) {
    return m.category === 'status' ? damageClassName('status', lang) : `${damageClassName(m.category, lang)} ${m.power ?? '-'}`
}

interface SlotEditorProps {
    set: PokemonSet
    onChange: (s: PokemonSet) => void
    onRemove: () => void
    onReroll: () => void
}

function SlotEditor({ set, onChange, onRemove, onReroll }: SlotEditorProps) {
    const lang = useLang()
    const t = useT(battleMessages)
    const [open, setOpen] = useState(false)
    const panelId = useId()
    const dex = findDexPokemonByName(set.species)
    const species = getSpecies(set.species)
    const id = dexIdOf(set.species)
    const name = pokemonLabel(set.species, set.nickname, lang)

    const learnable = useMemo(() => {
        const names = dex?.moves ?? []
        const coll = collator(lang)
        return names
            .map(n => getMove(n))
            .filter((m): m is NonNullable<typeof m> => !!m)
            .map(m => ({ m, label: moveNameL(m.name, lang) }))
            .sort((a, b) => coll.compare(a.label, b.label))
    }, [dex, lang])

    const items = useMemo(() => {
        const coll = collator(lang)
        return ITEMS.map(i => ({ id: i.id, label: itemName(i.id, lang) })).sort((a, b) => coll.compare(a.label, b.label))
    }, [lang])

    const setMove = (i: number, moveName: string) => {
        const moves = [...set.moves] as string[]
        moves[i] = moveName
        onChange({ ...set, moves: moves.filter(Boolean) as PokemonSet['moves'] })
    }

    const types = species?.types ?? dex?.types ?? []
    const select = 'mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100'
    const fieldLabel = 'block text-xs font-semibold text-slate-500'
    const iconBtn = 'rounded-lg px-2 py-1 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-red-400'

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-start gap-3">
                {id
                    ? <img src={spriteUrl(id)} alt="" className="h-14 w-14 shrink-0 object-contain [image-rendering:pixelated]" loading="lazy" />
                    : <div className="h-14 w-14 shrink-0 rounded-xl bg-slate-100" />}
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-slate-900">{name}</span>
                        <span className="text-xs text-slate-400">{t('level', { n: set.level })}</span>
                        {types.map(ty => <TypeBadge key={ty} type={ty} size="xs" />)}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-1 text-xs text-slate-500">
                        <span>{abilityNameL(set.ability, lang)}</span>
                        <span aria-hidden>·</span>
                        <span>{set.item ? itemName(set.item, lang) : t('noItem')}</span>
                        <span aria-hidden>·</span>
                        <span>{natureName(set.nature, lang)}</span>
                        {set.teraType && <><span aria-hidden>·</span><span>{t('tera')}</span> <TypeBadge type={set.teraType} size="xs" /></>}
                    </div>
                    <ul className="mt-1.5 grid grid-cols-2 gap-1">
                        {set.moves.filter(Boolean).map(m => {
                            const md = getMove(m!)
                            return (
                                <li key={m} className="flex min-w-0 items-center gap-1 rounded-md bg-slate-50 px-1.5 py-0.5 text-xs text-slate-700">
                                    {md && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: TYPE_COLOR[md.type] ?? '#94a3b8' }} title={typeNameL(md.type, lang)} />}
                                    <span className="truncate">{moveNameL(m!, lang)}</span>
                                </li>
                            )
                        })}
                    </ul>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                    <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls={panelId}
                        className={`${iconBtn} bg-slate-100 text-slate-600 hover:bg-slate-200`}>
                        {open ? t('collapse') : t('edit')}
                    </button>
                    <button type="button" onClick={onReroll} title={t('reroll')} aria-label={t('reroll')}
                        className={`${iconBtn} bg-slate-100 text-slate-600 hover:bg-slate-200`}>
                        <span aria-hidden>🎲</span>
                    </button>
                    <button type="button" onClick={onRemove} aria-label={t('removeNamed', { name })}
                        className={`${iconBtn} bg-red-50 text-red-500 hover:bg-red-100`}>
                        {t('remove')}
                    </button>
                </div>
            </div>

            {open && (
                <div id={panelId} className="mt-3 grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">
                    <label className={fieldLabel}>{t('ability')}
                        <select className={select} value={set.ability} onChange={e => onChange({ ...set, ability: e.target.value })}>
                            {(species?.abilities ?? []).map(a => (
                                <option key={a.name} value={a.name}>{abilityNameL(a.name, lang)}{a.hidden ? ` ${t('hiddenAbility')}` : ''}</option>
                            ))}
                        </select>
                    </label>
                    <label className={fieldLabel}>{t('item')}
                        <select className={select} value={set.item ?? ''} onChange={e => onChange({ ...set, item: e.target.value || undefined })}>
                            <option value="">{t('none')}</option>
                            {items.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
                        </select>
                    </label>
                    <label className={fieldLabel}>{t('nature')}
                        <select className={select} value={set.nature} onChange={e => onChange({ ...set, nature: e.target.value as PokemonSet['nature'] })}>
                            {NATURES.map(n => (
                                <option key={n.id} value={n.id}>
                                    {natureName(n.id, lang)}{n.up ? ` (+${battleStatLabel(n.up, lang)} -${battleStatLabel(n.down!, lang)})` : ''}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className={fieldLabel}>{t('teraType')}
                        <select className={select} value={set.teraType ?? ''} onChange={e => onChange({ ...set, teraType: e.target.value || undefined })}>
                            <option value="">{t('none')}</option>
                            {TYPES.map(ty => <option key={ty.name} value={ty.name}>{typeNameL(ty.name, lang)}</option>)}
                            <option value="stellar">{typeNameL('stellar', lang)}</option>
                        </select>
                    </label>
                    <label className={`${fieldLabel} sm:col-span-2`}>{t('evs')}
                        <select className={select} value={presetOf(set.evs)} onChange={e => {
                            const p = EV_PRESETS.find(x => x.id === e.target.value)
                            if (p) onChange({ ...set, evs: p.evs })
                        }}>
                            <option value="" disabled>{evSummary(set.evs, lang, t('noEvs'))}</option>
                            {EV_PRESETS.map(p => (
                                <option key={p.id} value={p.id}>
                                    {t(p.label, { a: battleStatLabel(p.stats[0], lang), b: battleStatLabel(p.stats[1], lang) })}
                                </option>
                            ))}
                        </select>
                    </label>
                    {[0, 1, 2, 3].map(i => (
                        <label key={i} className={fieldLabel}>{t('moveN', { n: i + 1 })}
                            <select className={select} value={set.moves[i] ?? ''} onChange={e => setMove(i, e.target.value)}>
                                <option value="">—</option>
                                {learnable.map(({ m, label }) => (
                                    <option key={m.name} value={m.name}>
                                        {label} · {typeNameL(m.type, lang)} · {moveMeta(m, lang)}
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
    const t = useT(battleMessages)
    const [ioOpen, setIoOpen] = useState(false)
    const [text, setText] = useState('')
    const [ioError, setIoError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const ioId = useId()

    // 자동 닉네임은 붙이지 않는다 → 이름은 화면 언어를 따른다
    const fresh = (p: DexPokemon, level?: number) => stripAutoNickname(buildSet(p, new PRNG(Date.now()), level))

    const add = (p: DexPokemon) => {
        if (team.length >= maxSize) return
        onChange([...team, fresh(p)])
    }

    const importText = () => {
        try {
            const parsed = parseShowdownTeam(text).slice(0, 6).map(s => {
                const sp = getSpecies(s.species) ?? getSpecies(toId(s.species))
                if (!sp) throw new Error(t('unknownPokemon', { name: s.species }))
                return stripAutoNickname({ ...s, species: sp.name, ability: s.ability || sp.abilities[0]?.name || '' })
            })
            if (parsed.length === 0) throw new Error(t('nothingToImport'))
            onChange(parsed)
            setIoError(null)
            setIoOpen(false)
        } catch (err) {
            setIoError((err as Error).message)
        }
    }

    const copy = () => {
        navigator.clipboard?.writeText(text).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        }).catch(() => {})
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <div className="w-full sm:w-auto sm:min-w-[220px] sm:flex-1">
                    {team.length < maxSize
                        ? <PokemonSearch onPick={add} placeholder={t('addPokemon', { n: team.length, max: maxSize })} />
                        : <p className="text-sm text-slate-400">{t('teamFull', { n: maxSize })}</p>}
                </div>
                <button type="button" onClick={onRandom} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                    <span aria-hidden>🎲 </span>{t('randomTeam')}
                </button>
                <button type="button" aria-expanded={ioOpen} aria-controls={ioId}
                    onClick={() => { setText(exportShowdownTeam(team.map(stripAutoNickname))); setIoOpen(o => !o); setIoError(null) }}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                    {t('showdownIO')}
                </button>
                {team.length > 0 && (
                    <button type="button" onClick={() => onChange([])} className="rounded-xl px-2 py-2 text-sm text-slate-400 hover:text-red-500">{t('clearTeam')}</button>
                )}
            </div>

            {ioOpen && (
                <div id={ioId} className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        rows={10}
                        spellCheck={false}
                        aria-label={t('showdownIO')}
                        aria-invalid={!!ioError}
                        placeholder={'Garchomp @ Choice Scarf\nAbility: Rough Skin\nEVs: 252 Atk / 4 SpD / 252 Spe\nJolly Nature\n- Earthquake\n- Dragon Claw'}
                        className="w-full rounded-xl border border-slate-200 bg-white p-2 font-mono text-xs outline-none focus:border-red-400"
                    />
                    {ioError && <p role="alert" className="text-xs text-red-500">{ioError}</p>}
                    <div className="flex gap-2">
                        <button type="button" onClick={importText} className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-600">{t('importTeam')}</button>
                        <button type="button" onClick={copy} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
                            <span aria-live="polite">{copied ? t('copied') : t('copy')}</span>
                        </button>
                    </div>
                </div>
            )}

            {team.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
                    {t('emptyTeam')}
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
                                if (dex) onChange(team.map((x, j) => (j === i ? fresh(dex, s.level) : x)))
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
