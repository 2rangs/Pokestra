import { useEffect, useMemo, useRef, useState } from 'react'
import {
    calcDamageSummary, calcDamage, getTypeChart, STATUS_NAME_KO, WEATHER_NAME_KO, TERRAIN_NAME_KO,
    SIDE_CONDITION_KO, FIELD_CONDITION_KO, VOLATILE_NAME_KO,
    type BattleRequest, type PlayerID, type MoveOption,
} from '@kyasi/pokebattle-engine'
import {
    BATTLE_STAT_LABEL_KO, TYPE_COLOR, dexIdOf, itemNameKo, moveNameKo, pokemonNameKo, prettify,
    spriteUrl, backSpriteUrl, artworkUrl,
} from '../../lib/battle'
import { TypeBadge } from '../../components/battle/TypeBadge'
import type { BattleSession, PokeView, SideView } from './useBattleSession'

const STATUS_STYLE: Record<string, string> = {
    burn: 'bg-orange-500', freeze: 'bg-cyan-400', paralysis: 'bg-yellow-400 text-yellow-900',
    poison: 'bg-purple-500', toxic: 'bg-purple-700', sleep: 'bg-slate-400',
}

function hpColor(ratio: number) {
    return ratio > 0.5 ? 'bg-emerald-500' : ratio > 0.2 ? 'bg-amber-400' : 'bg-red-500'
}

function displayName(p: PokeView) {
    return p.nickname && p.nickname !== p.species ? p.nickname : pokemonNameKo(p.species)
}

// ─── 포켓몬 정보 카드 ─────────────────────────────────────────
function StatusCard({ side, mine }: { side: SideView; mine: boolean }) {
    const p = side.active
    const ratio = p.max_hp ? p.hp / p.max_hp : 0
    return (
        <div className="w-full max-w-[300px] rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-md backdrop-blur">
            <div className="flex items-center gap-1.5">
                <span className="truncate font-bold text-slate-900">{displayName(p)}</span>
                <span className="shrink-0 text-xs text-slate-400">Lv.{p.level}</span>
                {p.status && (
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${STATUS_STYLE[p.status] ?? 'bg-slate-500'}`}>
                        {STATUS_NAME_KO[p.status]}
                    </span>
                )}
                {p.terastallized && p.tera_type && <TypeBadge type={p.tera_type} size="xs" className="ring-2 ring-white/70" />}
            </div>
            <div className="mt-1 flex gap-1">{p.types.map(t => <TypeBadge key={t} type={t} size="xs" />)}</div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
                <div className={`h-full rounded-full transition-all duration-500 ease-out ${hpColor(ratio)}`} style={{ width: `${Math.max(0, ratio * 100)}%` }} />
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
                <span className="tabular-nums text-slate-500">{mine ? `${p.hp} / ${p.max_hp}` : `${Math.ceil(ratio * 100)}%`}</span>
                <PartyBalls side={side} />
            </div>
            {(Object.keys(p.stages).length > 0 || p.volatiles.length > 0) && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                    {Object.entries(p.stages).map(([k, v]) => (
                        <span key={k} className={`rounded px-1 text-[10px] font-semibold ${v > 0 ? 'bg-sky-100 text-sky-700' : 'bg-rose-100 text-rose-700'}`}>
                            {BATTLE_STAT_LABEL_KO[k] ?? k} {v > 0 ? `+${v}` : v}
                        </span>
                    ))}
                    {p.volatiles.filter(v => VOLATILE_NAME_KO[v]).map(v => (
                        <span key={v} className="rounded bg-violet-100 px-1 text-[10px] font-semibold text-violet-700">{VOLATILE_NAME_KO[v]}</span>
                    ))}
                </div>
            )}
        </div>
    )
}

function PartyBalls({ side }: { side: SideView }) {
    return (
        <span className="flex gap-0.5" aria-label="파티 상태">
            {side.team.map(p => (
                <span
                    key={p.id}
                    title={`${displayName(p)} ${p.fainted ? '(기절)' : `${Math.ceil(p.hp / p.max_hp * 100)}%`}`}
                    className={`h-2.5 w-2.5 rounded-full border ${p.fainted ? 'border-slate-300 bg-slate-300' : p.status ? 'border-amber-500 bg-amber-300' : 'border-red-500 bg-red-400'}`}
                />
            ))}
        </span>
    )
}

function Sprite({ p, back }: { p: PokeView; back: boolean }) {
    const id = dexIdOf(p.species)
    // 실패한 URL 단계 (0: 기본, 1: 정면 도트, 2: 공식 아트워크)
    const [fallback, setFallback] = useState<{ key: string; step: number }>({ key: '', step: 0 })
    const key = `${p.species}-${back}`
    const step = fallback.key === key ? fallback.step : 0
    if (!id) return <div className="h-28 w-28" />
    const candidates = back ? [backSpriteUrl(id), spriteUrl(id), artworkUrl(id)] : [spriteUrl(id), artworkUrl(id)]
    const src = candidates[Math.min(step, candidates.length - 1)]!
    return (
        <img
            key={p.id}
            src={src}
            alt={displayName(p)}
            onError={() => setFallback({ key, step: step + 1 })}
            className={`h-28 w-28 object-contain transition-all duration-300 sm:h-36 sm:w-36 [image-rendering:pixelated] ${p.fainted ? 'translate-y-6 opacity-0' : 'opacity-100'}`}
        />
    )
}

// ─── 필드 정보 ───────────────────────────────────────────────
function FieldBar({ session }: { session: BattleSession }) {
    const f = session.current
    if (!f) return null
    const chips: { label: string; tone: string }[] = []
    if (f.weather) chips.push({ label: WEATHER_NAME_KO[f.weather] ?? f.weather, tone: 'bg-sky-100 text-sky-700' })
    if (f.terrain) chips.push({ label: TERRAIN_NAME_KO[f.terrain] ?? f.terrain, tone: 'bg-emerald-100 text-emerald-700' })
    for (const c of f.field) chips.push({ label: FIELD_CONDITION_KO[c] ?? c, tone: 'bg-fuchsia-100 text-fuchsia-700' })
    const side = (s: SideView, label: string) => s.conditions.filter(c => c.id !== 'wish').map(c => ({
        label: `${label} ${SIDE_CONDITION_KO[c.id] ?? c.id}${c.layers > 1 ? `×${c.layers}` : ''}`,
        tone: 'bg-amber-100 text-amber-800',
    }))
    chips.push(...side(f.p2, '상대'), ...side(f.p1, '우리'))
    return (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="rounded-full bg-slate-900 px-2 py-0.5 font-bold text-white">{f.turn}턴</span>
            {chips.map((c, i) => <span key={i} className={`rounded-full px-2 py-0.5 font-semibold ${c.tone}`}>{c.label}</span>)}
        </div>
    )
}

// ─── 기술 선택 ───────────────────────────────────────────────
function MoveButton({ opt, preview, onClick, disabled }: {
    opt: MoveOption
    preview: { text: string; eff: number } | null
    onClick: () => void
    disabled: boolean
}) {
    const m = opt.move
    const color = TYPE_COLOR[m.type] ?? '#94a3b8'
    const effLabel = preview ? preview.eff === 0 ? '효과 없음' : preview.eff >= 2 ? '효과 굉장' : preview.eff < 1 ? '효과 별로' : '' : ''
    return (
        <button
            type="button"
            disabled={disabled || opt.disabled}
            onClick={onClick}
            title={opt.disabled_reason}
            className="group relative flex min-h-[64px] flex-col justify-between overflow-hidden rounded-xl border-2 bg-white px-3 py-2 text-left transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            style={{ borderColor: color }}
        >
            <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: color }} />
            <span className="flex items-center justify-between gap-2">
                <span className="truncate font-bold text-slate-900">{opt.index === -1 ? '발버둥' : moveNameKo(m.name)}</span>
                <TypeBadge type={m.type} size="xs" />
            </span>
            <span className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                <span>{m.category === 'status' ? '변화' : `${m.category === 'physical' ? '물리' : '특수'} ${m.power ?? '-'}`} · PP {opt.pp}/{opt.max_pp}</span>
                {preview && (
                    <span className={`font-semibold ${preview.eff >= 2 ? 'text-red-600' : preview.eff === 0 ? 'text-slate-400' : preview.eff < 1 ? 'text-sky-600' : 'text-slate-600'}`}>
                        {effLabel && `${effLabel} · `}{preview.text}
                    </span>
                )}
            </span>
            {opt.disabled_reason && <span className="text-[10px] text-red-500">{opt.disabled_reason}</span>}
        </button>
    )
}

function ActionPanel({ session, player }: { session: BattleSession; player: PlayerID }) {
    const req = session.request(player)
    // 턴이 바뀌면 부모가 key 로 다시 마운트 → 테라스탈 토글 초기화
    const [tera, setTera] = useState(false)
    const engine = session.engine

    const previews = useMemo(() => {
        if (!engine || !req || req.type !== 'move') return {}
        const me = req.active
        const foe = engine.getActive(engine.foeOf(player))
        if (!foe || foe.fainted) return {}
        const foeSide = engine.getSide(engine.foeOf(player))
        const state = engine.getState()
        const out: Record<number, { text: string; eff: number }> = {}
        for (const opt of req.moves) {
            if (opt.move.category === 'status') continue
            const input = {
                attacker: me, defender: foe, move: opt.move,
                weather: engine.effectiveWeather(), terrain: state.field.terrain, typeChart: getTypeChart(),
                reflect: !!foeSide.conditions.reflect, lightScreen: !!foeSide.conditions.light_screen,
                auroraVeil: !!foeSide.conditions.aurora_veil, isTerastallized: tera,
            }
            const r = calcDamage({ ...input, randomRoll: 100 })
            if (r.damage === 0) { out[opt.index] = { text: '0%', eff: r.effectiveness }; continue }
            const s = calcDamageSummary(input)
            const pct = (n: number) => Math.min(100, Math.round(n / foe.max_hp * 100))
            out[opt.index] = { text: `${pct(s.min)}~${pct(s.max)}%`, eff: r.effectiveness }
        }
        return out
    }, [engine, req, player, tera])

    if (!req) {
        return (
            <div className="flex h-full min-h-[120px] items-center justify-center text-sm text-slate-400">
                {session.phase === 'ended' ? '배틀 종료' : session.allRevealed ? '상대의 행동을 기다리는 중…' : '진행 중…'}
            </div>
        )
    }

    const switchAction = (id: string) => session.submit({ type: 'switch', player, pokemon_id: req.active.id, switch_to_id: id })

    return (
        <div className="space-y-3">
            {req.type === 'move' && (
                <>
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-700">{req.active.nickname !== req.active.species ? req.active.nickname : pokemonNameKo(req.active.species)}은(는) 무엇을 할까?</p>
                        {req.can_terastallize && (
                            <label className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${tera ? 'bg-gradient-to-r from-fuchsia-500 to-sky-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                <input type="checkbox" className="sr-only" checked={tera} onChange={e => setTera(e.target.checked)} />
                                ✦ 테라스탈 ({req.active.tera_type && <TypeBadge type={req.active.tera_type} size="xs" />})
                            </label>
                        )}
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {req.moves.map(opt => (
                            <MoveButton
                                key={opt.index}
                                opt={opt}
                                preview={previews[opt.index] ?? null}
                                disabled={false}
                                onClick={() => session.submit({ type: 'move', player, pokemon_id: req.active.id, move_index: opt.index, terastallize: tera || undefined })}
                            />
                        ))}
                    </div>
                    {req.forced && <p className="text-xs text-slate-400">이번 턴은 기술이 고정되어 있습니다.</p>}
                </>
            )}
            {req.type === 'switch' && (
                <p className="text-sm font-semibold text-slate-700">
                    {req.reason === 'faint' ? '다음 포켓몬을 내보내세요!' : '교체할 포켓몬을 고르세요!'}
                </p>
            )}
            <SwitchList req={req} onSwitch={switchAction} />
        </div>
    )
}

function SwitchList({ req, onSwitch }: { req: BattleRequest; onSwitch: (id: string) => void }) {
    if (req.switches.length === 0) return null
    return (
        <div>
            {req.type === 'move' && <p className="mb-1 text-xs font-semibold text-slate-400">교체</p>}
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {req.switches.map(p => {
                    const id = dexIdOf(p.species)
                    const ratio = p.hp / p.max_hp
                    return (
                        <button key={p.id} type="button" onClick={() => onSwitch(p.id)}
                            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-left hover:border-red-300 hover:bg-red-50">
                            {id && <img src={spriteUrl(id)} alt="" className="h-9 w-9 shrink-0 object-contain [image-rendering:pixelated]" />}
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-bold text-slate-800">{p.nickname !== p.species ? p.nickname : pokemonNameKo(p.species)}</span>
                                <span className="mt-0.5 block h-1.5 overflow-hidden rounded-full bg-slate-200">
                                    <span className={`block h-full ${hpColor(ratio)}`} style={{ width: `${ratio * 100}%` }} />
                                </span>
                                {p.status && <span className="text-[10px] text-slate-500">{STATUS_NAME_KO[p.status]}</span>}
                            </span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// ─── 로그 ────────────────────────────────────────────────────
function BattleLog({ session }: { session: BattleSession }) {
    const ref = useRef<HTMLDivElement>(null)
    const lines = session.frames.slice(0, session.revealed).filter(f => f.text)
    useEffect(() => {
        const el = ref.current
        if (el) el.scrollTop = el.scrollHeight
    }, [lines.length])
    return (
        <div ref={ref} className="h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-relaxed lg:h-[calc(100%-2rem)]">
            {lines.map(f => {
                const e = f.event
                if (e.type === 'turn_start') return <div key={f.index} className="mt-2 mb-1 border-b border-slate-100 pb-0.5 text-xs font-bold text-slate-400">{f.text}</div>
                const tone = e.type === 'move_use' ? 'font-semibold text-slate-900'
                    : e.type === 'faint' ? 'font-semibold text-red-600'
                        : e.type === 'battle_end' ? 'mt-2 text-base font-extrabold text-red-600'
                            : e.type === 'damage' && (e.effectiveness ?? 1) > 1 ? 'text-orange-700'
                                : 'text-slate-600'
                return <div key={f.index} className={tone}>{f.text}</div>
            })}
        </div>
    )
}

// ─── 메인 뷰 ─────────────────────────────────────────────────
export function BattleView({ session, onExit, onRematch }: { session: BattleSession; onExit: () => void; onRematch: () => void }) {
    const f = session.current
    if (!f) return null
    const spectating = session.isAI('p1') && session.isAI('p2')
    const ended = session.phase === 'ended' && session.allRevealed

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
            <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <FieldBar session={session} />
                    <div className="flex items-center gap-1.5 text-xs">
                        <label className="flex items-center gap-1 text-slate-500">속도
                            <select value={session.speed} onChange={e => session.setSpeed(Number(e.target.value))}
                                className="rounded-lg border border-slate-200 bg-white px-1.5 py-1">
                                <option value={900}>느리게</option>
                                <option value={450}>보통</option>
                                <option value={180}>빠르게</option>
                                <option value={40}>매우 빠르게</option>
                            </select>
                        </label>
                        {spectating && (
                            <button type="button" onClick={() => session.setPaused(!session.paused)} className="rounded-lg bg-slate-100 px-2 py-1 font-semibold text-slate-600">
                                {session.paused ? '▶ 재생' : '❚❚ 일시정지'}
                            </button>
                        )}
                        {!session.allRevealed && (
                            <button type="button" onClick={session.skip} className="rounded-lg bg-slate-100 px-2 py-1 font-semibold text-slate-600">건너뛰기 ⏭</button>
                        )}
                        <button type="button" onClick={onExit} className="rounded-lg px-2 py-1 font-semibold text-slate-400 hover:text-red-500">나가기</button>
                    </div>
                </div>

                {/* 배틀 필드 */}
                <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50 p-3 sm:p-5">
                    <div className="pointer-events-none absolute right-[8%] top-[34%] h-10 w-40 rounded-[50%] bg-emerald-200/70 blur-[1px] sm:w-52" />
                    <div className="pointer-events-none absolute bottom-[10%] left-[6%] h-10 w-44 rounded-[50%] bg-emerald-300/60 blur-[1px] sm:w-60" />
                    <div className="relative flex items-start justify-between gap-2">
                        <StatusCard side={f.p2} mine={spectating} />
                        <Sprite p={f.p2.active} back={false} />
                    </div>
                    <div className="relative mt-2 flex items-end justify-between gap-2">
                        <Sprite p={f.p1.active} back />
                        <StatusCard side={f.p1} mine />
                    </div>
                    {ended && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/70 backdrop-blur-sm">
                            <p className="text-3xl font-black text-slate-900">
                                {session.winner === 'draw' ? '무승부' : session.winner === 'p1' ? (spectating ? `${f.p1.name} 승리!` : '승리!') : (spectating ? `${f.p2.name} 승리!` : '패배…')}
                            </p>
                            <div className="flex gap-2">
                                <button type="button" onClick={onRematch} className="rounded-xl bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-600">같은 팀으로 다시</button>
                                <button type="button" onClick={onExit} className="rounded-xl bg-white px-4 py-2 font-semibold text-slate-700 shadow hover:bg-slate-50">팀 편집으로</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 행동 */}
                {!spectating && (
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                        {session.error && <p className="mb-2 text-xs text-red-500">{session.error}</p>}
                        <ActionPanel key={`${f.turn}-${session.allRevealed}`} session={session} player="p1" />
                    </div>
                )}
                {spectating && <SpectatorDetails f={f} />}
            </div>

            <div className="lg:h-[640px]">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">배틀 로그</p>
                <BattleLog session={session} />
            </div>
        </div>
    )
}

function SpectatorDetails({ f }: { f: NonNullable<BattleSession['current']> }) {
    const row = (p: PokeView) => (
        <div key={p.id} className={`flex items-center gap-2 text-xs ${p.fainted ? 'opacity-40' : ''}`}>
            <span className="w-24 truncate font-semibold text-slate-700">{displayName(p)}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                <span className={`block h-full ${hpColor(p.hp / p.max_hp)}`} style={{ width: `${p.hp / p.max_hp * 100}%` }} />
            </span>
            <span className="w-20 truncate text-right text-slate-400">{p.item ? itemNameKo(p.item) : prettify(p.ability)}</span>
        </div>
    )
    return (
        <div className="grid grid-cols-1 gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
            {[f.p1, f.p2].map(s => (
                <div key={s.id} className="space-y-1">
                    <p className="text-xs font-bold text-slate-500">{s.name}</p>
                    {s.team.map(row)}
                </div>
            ))}
        </div>
    )
}
