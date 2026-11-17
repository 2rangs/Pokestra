import { useState } from 'react'
import type { BattleConfig, PokemonSet } from '@kyasi/pokebattle-engine'
import { useEngineReady, buildRandomTeam, spriteUrl, dexIdOf } from '../../lib/battle'
import { pokemonLabel } from '../../lib/battleLog'
import { useBattleStore, type BattleMode } from '../../stores/battleStore'
import { useDocumentTitle, useLang, useT } from '../../i18n'
import { battleMessages } from '../../i18n/messages/battle'
import { TeamBuilder } from './TeamBuilder'
import { BattleView } from './BattleView'
import { useBattleSession, type Difficulty } from './useBattleSession'

const DIFFICULTIES = [
    { id: 'easy', label: 'diffEasy', desc: 'diffEasyDesc' },
    { id: 'normal', label: 'diffNormal', desc: 'diffNormalDesc' },
    { id: 'hard', label: 'diffHard', desc: 'diffHardDesc' },
] as const satisfies readonly { id: Difficulty; label: string; desc: string }[]

const MODES = [
    { id: 'vs-cpu', label: 'modeVsCpu' },
    { id: 'cpu-vs-cpu', label: 'modeSpectate' },
] as const satisfies readonly { id: BattleMode; label: string }[]

const newSeed = () => Math.floor(Math.random() * 1e9)

function TeamStrip({ team }: { team: PokemonSet[] }) {
    const lang = useLang()
    return (
        <ul className="flex flex-wrap gap-1.5">
            {team.map((s, i) => {
                const id = dexIdOf(s.species)
                const name = pokemonLabel(s.species, s.nickname, lang)
                return (
                    <li key={i} className="flex items-center gap-1 rounded-lg bg-white px-1.5 py-0.5 text-xs text-slate-700 shadow-sm" title={name}>
                        {id && <img src={spriteUrl(id)} alt="" className="h-7 w-7 object-contain [image-rendering:pixelated]" loading="lazy" />}
                        <span className="sr-only sm:not-sr-only">{name}</span>
                    </li>
                )
            })}
        </ul>
    )
}

/** 세그먼트 버튼 그룹 */
function Segmented<T extends string | number>({ label, value, options, onChange }: {
    label: string
    value: T
    options: readonly { id: T; label: string; title?: string }[]
    onChange: (v: T) => void
}) {
    return (
        <div role="group" aria-label={label}>
            <p className="mb-1.5 text-xs font-bold text-slate-400">{label}</p>
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                {options.map(o => (
                    <button
                        key={o.id}
                        type="button"
                        onClick={() => onChange(o.id)}
                        title={o.title}
                        aria-pressed={value === o.id}
                        className={`min-w-0 flex-1 rounded-lg px-2 py-1.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-red-400 ${value === o.id ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <span className="block truncate">{o.label}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}

export default function BattlePage() {
    const t = useT(battleMessages)
    const { ready, error } = useEngineReady()
    const store = useBattleStore()
    const session = useBattleSession()
    const [inBattle, setInBattle] = useState(false)
    const [lastConfig, setLastConfig] = useState<BattleConfig | null>(null)

    useDocumentTitle(t('title'))

    if (error) {
        return (
            <div role="alert" className="mx-auto max-w-md space-y-3 rounded-3xl border border-red-100 bg-red-50 p-6 text-center">
                <p className="font-semibold text-red-600">{t('loadError')}</p>
                <p className="break-words text-xs text-red-400">{error.message}</p>
                <button type="button" onClick={() => window.location.reload()} className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600">
                    {t('retry')}
                </button>
            </div>
        )
    }
    if (!ready) {
        return (
            <div role="status" className="flex flex-col items-center justify-center gap-3 p-12 text-sm text-slate-400">
                <span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-red-500" aria-hidden />
                {t('loadingEngine')}
            </div>
        )
    }

    const size = store.teamSize
    const myTeam = store.myTeam.slice(0, size)
    const foeTeam = store.foeTeam.length ? store.foeTeam.slice(0, size) : []
    const spectate = store.mode === 'cpu-vs-cpu'

    const rerollFoe = () => {
        const seed = newSeed()
        store.setFoeTeam(buildRandomTeam(seed, 6), seed)
    }
    const randomMine = () => store.setMyTeam(buildRandomTeam(newSeed(), 6))

    const begin = (config?: BattleConfig) => {
        let foe = foeTeam
        if (foe.length === 0) {
            const seed = newSeed()
            const team = buildRandomTeam(seed, 6)
            store.setFoeTeam(team, seed)
            foe = team.slice(0, size)
        }
        // 진영 이름은 화면에서 현재 언어로 다시 정하므로 여기서는 고정 식별자만 둔다
        const cfg: BattleConfig = config ?? {
            format: 'singles',
            seed: newSeed(),
            p1: { name: spectate ? 'CPU 1' : 'Player', team: myTeam },
            p2: { name: spectate ? 'CPU 2' : 'CPU', team: foe },
        }
        setLastConfig(cfg)
        session.start(cfg, {
            p1: spectate ? store.difficulty : 'human',
            p2: store.difficulty,
            speed: store.speed,
        })
        setInBattle(true)
        window.scrollTo({ top: 0 })
    }

    if (inBattle && session.current) {
        return (
            <BattleView
                session={session}
                onExit={() => setInBattle(false)}
                onRematch={() => lastConfig && begin({ ...lastConfig, seed: newSeed() })}
            />
        )
    }

    const canStart = myTeam.length > 0

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t('title')}</h1>
                <p className="mt-1 text-sm text-slate-500">{t('intro')}</p>
            </header>

            <section className="grid grid-cols-1 gap-3 rounded-3xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
                <Segmented
                    label={t('mode')}
                    value={store.mode}
                    options={MODES.map(m => ({ id: m.id, label: t(m.label) }))}
                    onChange={store.setMode}
                />
                <Segmented
                    label={t('difficulty')}
                    value={store.difficulty}
                    options={DIFFICULTIES.map(d => ({ id: d.id, label: t(d.label), title: t(d.desc) }))}
                    onChange={store.setDifficulty}
                />
                <Segmented
                    label={t('teamSize')}
                    value={size}
                    options={[1, 3, 6].map(n => ({ id: n, label: t('sizeOption', { n }) }))}
                    onChange={store.setTeamSize}
                />
            </section>

            <section className="space-y-3" aria-labelledby="battle-my-team">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <h2 id="battle-my-team" className="text-lg font-bold text-slate-900">
                        {spectate ? t('cpuTeam', { name: t('cpu1') }) : t('myTeam')}
                    </h2>
                    {store.myTeam.length > size && <p className="text-xs text-slate-400">{t('onlyFirstN', { n: size })}</p>}
                </div>
                <TeamBuilder team={store.myTeam} onChange={store.setMyTeam} onRandom={randomMine} />
            </section>

            <section className="space-y-2 rounded-3xl border border-slate-200 bg-slate-50 p-4" aria-labelledby="battle-foe-team">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 id="battle-foe-team" className="text-lg font-bold text-slate-900">
                        {spectate ? t('cpuTeam', { name: t('cpu2') }) : t('foeTeam')}
                    </h2>
                    <button type="button" onClick={rerollFoe} className="rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-100">
                        <span aria-hidden>🎲 </span>{t('rerollFoe')}
                    </button>
                </div>
                {foeTeam.length > 0
                    ? <TeamStrip team={foeTeam} />
                    : <p className="text-sm text-slate-400">{t('foeRandomHint')}</p>}
            </section>

            <div className="sticky bottom-3 z-20 flex justify-center px-2">
                <button
                    type="button"
                    disabled={!canStart}
                    onClick={() => begin()}
                    className="w-full max-w-xs rounded-2xl bg-red-500 px-8 py-3 text-lg font-extrabold text-white shadow-lg shadow-red-500/30 transition hover:-translate-y-0.5 hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none disabled:hover:translate-y-0 sm:w-auto sm:max-w-none"
                >
                    {canStart ? (spectate ? t('startSpectate') : t('startBattle')) : t('addPokemonFirst')}
                </button>
            </div>
        </div>
    )
}
