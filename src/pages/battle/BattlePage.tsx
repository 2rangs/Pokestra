import { useState } from 'react'
import type { BattleConfig, PokemonSet } from '@kyasi/pokebattle-engine'
import { useEngineReady, buildRandomTeam, pokemonNameKo, spriteUrl, dexIdOf } from '../../lib/battle'
import { useBattleStore, type BattleMode } from '../../stores/battleStore'
import { TeamBuilder } from './TeamBuilder'
import { BattleView } from './BattleView'
import { useBattleSession, type Difficulty } from './useBattleSession'

const DIFFICULTIES: { id: Difficulty; label: string; desc: string }[] = [
    { id: 'easy',   label: '쉬움',   desc: '무작위로 행동' },
    { id: 'normal', label: '보통',   desc: '데미지·상성을 계산' },
    { id: 'hard',   label: '어려움', desc: '거의 항상 최선의 수' },
]

function TeamStrip({ team }: { team: PokemonSet[] }) {
    return (
        <div className="flex flex-wrap gap-1">
            {team.map((s, i) => {
                const id = dexIdOf(s.species)
                return (
                    <span key={i} className="flex items-center gap-1 rounded-lg bg-white px-1.5 py-0.5 text-xs text-slate-700 shadow-sm" title={pokemonNameKo(s.species)}>
                        {id && <img src={spriteUrl(id)} alt="" className="h-7 w-7 object-contain [image-rendering:pixelated]" loading="lazy" />}
                        <span className="hidden sm:inline">{s.nickname ?? pokemonNameKo(s.species)}</span>
                    </span>
                )
            })}
        </div>
    )
}

export default function BattlePage() {
    const { ready, error } = useEngineReady()
    const store = useBattleStore()
    const session = useBattleSession()
    const [inBattle, setInBattle] = useState(false)
    const [lastConfig, setLastConfig] = useState<BattleConfig | null>(null)

    if (error) return <p className="p-8 text-center text-red-500">배틀 데이터를 불러오지 못했습니다: {error.message}</p>
    if (!ready) return <p className="p-8 text-center text-slate-400">배틀 엔진 데이터 불러오는 중…</p>

    const size = store.teamSize
    const myTeam = store.myTeam.slice(0, size)
    const foeTeam = store.foeTeam.length ? store.foeTeam.slice(0, size) : []
    const spectate = store.mode === 'cpu-vs-cpu'

    const rerollFoe = () => {
        const seed = Math.floor(Math.random() * 1e9)
        store.setFoeTeam(buildRandomTeam(seed, 6), seed)
    }
    const randomMine = () => store.setMyTeam(buildRandomTeam(Math.floor(Math.random() * 1e9), 6))

    const begin = (config?: BattleConfig) => {
        let foe = foeTeam
        if (foe.length === 0) {
            const seed = Math.floor(Math.random() * 1e9)
            const t = buildRandomTeam(seed, 6)
            store.setFoeTeam(t, seed)
            foe = t.slice(0, size)
        }
        const cfg: BattleConfig = config ?? {
            format: 'singles',
            seed: Math.floor(Math.random() * 1e9),
            p1: { name: spectate ? 'CPU 1' : '나', team: myTeam },
            p2: { name: spectate ? 'CPU 2' : '상대 트레이너', team: foe },
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
                onRematch={() => lastConfig && begin({ ...lastConfig, seed: Math.floor(Math.random() * 1e9) })}
            />
        )
    }

    const canStart = myTeam.length > 0

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">배틀 시뮬레이터</h1>
                <p className="mt-1 text-sm text-slate-500">
                    도감의 기술표로 팀을 짜서 CPU와 싱글 배틀을 하거나, CPU끼리의 배틀을 관전하세요. 9세대 규칙(테라스탈 포함)을 따릅니다.
                </p>
            </header>

            <section className="grid grid-cols-1 gap-3 rounded-3xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
                <div>
                    <p className="mb-1.5 text-xs font-bold text-slate-400">모드</p>
                    <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                        {([['vs-cpu', 'CPU와 대전'], ['cpu-vs-cpu', 'CPU 관전']] as [BattleMode, string][]).map(([id, label]) => (
                            <button key={id} type="button" onClick={() => store.setMode(id)}
                                className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-semibold transition ${store.mode === id ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <p className="mb-1.5 text-xs font-bold text-slate-400">CPU 난이도</p>
                    <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                        {DIFFICULTIES.map(d => (
                            <button key={d.id} type="button" onClick={() => store.setDifficulty(d.id)} title={d.desc}
                                className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-semibold transition ${store.difficulty === d.id ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>
                                {d.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <p className="mb-1.5 text-xs font-bold text-slate-400">마릿수</p>
                    <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
                        {[1, 3, 6].map(n => (
                            <button key={n} type="button" onClick={() => store.setTeamSize(n)}
                                className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-semibold transition ${size === n ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>
                                {n} vs {n}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            <section className="space-y-3">
                <div className="flex items-baseline justify-between">
                    <h2 className="text-lg font-bold text-slate-900">{spectate ? 'CPU 1 팀' : '내 팀'}</h2>
                    {store.myTeam.length > size && <p className="text-xs text-slate-400">앞의 {size}마리만 출전합니다</p>}
                </div>
                <TeamBuilder team={store.myTeam} onChange={store.setMyTeam} onRandom={randomMine} />
            </section>

            <section className="space-y-2 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-bold text-slate-900">{spectate ? 'CPU 2 팀' : '상대 팀'}</h2>
                    <button type="button" onClick={rerollFoe} className="rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-100">🎲 상대 팀 바꾸기</button>
                </div>
                {foeTeam.length > 0
                    ? <TeamStrip team={foeTeam} />
                    : <p className="text-sm text-slate-400">시작하면 랜덤 팀이 정해집니다.</p>}
            </section>

            <div className="sticky bottom-3 z-20 flex justify-center">
                <button
                    type="button"
                    disabled={!canStart}
                    onClick={() => begin()}
                    className="rounded-2xl bg-red-500 px-8 py-3 text-lg font-extrabold text-white shadow-lg shadow-red-500/30 transition hover:-translate-y-0.5 hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                    {canStart ? (spectate ? '관전 시작' : '배틀 시작!') : '팀에 포켓몬을 추가하세요'}
                </button>
            </div>
        </div>
    )
}
