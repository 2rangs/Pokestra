import { useEffect, useMemo, useRef, useState } from 'react'
import { fixParticles, type BattleRequest, type PlayerID, type MoveOption } from '@kyasi/pokebattle-engine'
import {
    battleStatLabel, TYPE_COLOR, dexIdOf, itemName, moveNameL, abilityNameL,
    spriteUrl, backSpriteUrl, artworkUrl,
} from '../../lib/battle'
import {
    pokemonLabel, statusName, statusLongName, weatherName, terrainName, sideConditionName,
    fieldConditionName, volatileName,
} from '../../lib/battleLog'
import { damageClassName } from '../../lib/dex'
import { useDocumentTitle, useLang, useT, type Lang } from '../../i18n'
import { battleMessages } from '../../i18n/messages/battle'
import { TypeBadge } from '../../components/battle/TypeBadge'
import { frameText, type BattleSession, type Frame, type PokeView, type SideView } from './useBattleSession'

const STATUS_STYLE: Record<string, string> = {
    burn: 'bg-orange-500 text-white', freeze: 'bg-cyan-500 text-white', paralysis: 'bg-yellow-400 text-yellow-950',
    poison: 'bg-purple-500 text-white', toxic: 'bg-purple-700 text-white', sleep: 'bg-slate-500 text-white',
}

const ratioOf = (p: { hp: number; max_hp: number }) => (p.max_hp ? Math.max(0, Math.min(1, p.hp / p.max_hp)) : 0)
const pctOf = (p: { hp: number; max_hp: number }) => (p.hp > 0 ? Math.max(1, Math.ceil(ratioOf(p) * 100)) : 0)

function hpColor(ratio: number) {
    return ratio > 0.5 ? 'bg-emerald-500' : ratio > 0.2 ? 'bg-amber-400' : 'bg-red-500'
}

type Named = { species: string; nickname?: string | null; setSpecies?: string; set?: { species: string } }
const nameOf = (p: Named, lang: Lang) => pokemonLabel(p.species, p.nickname, lang, p.setSpecies ?? p.set?.species)

function useBattleT() {
    return useT(battleMessages)
}

function StatusChip({ status, lang }: { status: string; lang: Lang }) {
    return (
        <span title={statusLongName(status, lang)}
            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold leading-none ${STATUS_STYLE[status] ?? 'bg-slate-500 text-white'}`}>
            {statusName(status, lang)}
        </span>
    )
}

function HpBar({ p, label, thin = false }: { p: { hp: number; max_hp: number }; label: string; thin?: boolean }) {
    const ratio = ratioOf(p)
    return (
        <div
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pctOf(p)}
            className={`overflow-hidden rounded-full bg-slate-200 ${thin ? 'h-1.5' : 'h-2.5 ring-1 ring-inset ring-slate-300/60'}`}
        >
            <div className={`h-full rounded-full transition-[width,background-color] duration-500 ease-out ${hpColor(ratio)}`} style={{ width: `${ratio * 100}%` }} />
        </div>
    )
}

// ─── 포켓몬 정보 카드 ─────────────────────────────────────────
function StatusCard({ side, exact }: { side: SideView; exact: boolean }) {
    const lang = useLang()
    const t = useBattleT()
    const p = side.active
    const name = nameOf(p, lang)
    const volatiles = p.volatiles.map(v => [v, volatileName(v, lang)] as const).filter(([, n]) => n)
    return (
        <section aria-label={name} className="w-full max-w-[300px] min-w-0 rounded-2xl border border-slate-200 bg-white/95 p-2.5 shadow-md backdrop-blur sm:p-3">
            <div className="flex min-w-0 items-center gap-1.5">
                <span className="truncate font-bold text-slate-900">{name}</span>
                <span className="shrink-0 text-xs text-slate-400">{t('level', { n: p.level })}</span>
                {p.status && <StatusChip status={p.status} lang={lang} />}
                {p.terastallized && p.tera_type && <TypeBadge type={p.tera_type} size="xs" className="ring-2 ring-fuchsia-300" />}
            </div>
            {!p.terastallized && <div className="mt-1 flex flex-wrap gap-1">{p.types.map(ty => <TypeBadge key={ty} type={ty} size="xs" />)}</div>}
            <div className="mt-2 flex items-center gap-1.5">
                <span className="text-[10px] font-black text-amber-600" aria-hidden>HP</span>
                <div className="flex-1"><HpBar p={p} label={exact ? t('hpLabel', { hp: p.hp, max: p.max_hp }) : t('hpPercent', { pct: pctOf(p) })} /></div>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold tabular-nums text-slate-600">{exact ? `${p.hp} / ${p.max_hp}` : `${pctOf(p)}%`}</span>
                <PartyBalls side={side} />
            </div>
            {(Object.keys(p.stages).length > 0 || volatiles.length > 0) && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                    {Object.entries(p.stages).map(([k, v]) => (
                        <span key={k} className={`rounded px-1 text-[10px] font-semibold ${v > 0 ? 'bg-sky-100 text-sky-700' : 'bg-rose-100 text-rose-700'}`}>
                            {battleStatLabel(k, lang)} {v > 0 ? `+${v}` : v}
                        </span>
                    ))}
                    {volatiles.map(([v, n]) => (
                        <span key={v} className="rounded bg-violet-100 px-1 text-[10px] font-semibold text-violet-700">{n}</span>
                    ))}
                </div>
            )}
        </section>
    )
}

function PartyBalls({ side }: { side: SideView }) {
    const lang = useLang()
    const t = useBattleT()
    const summary = side.team.map(p => `${nameOf(p, lang)} ${p.fainted ? t('fainted') : `${pctOf(p)}%`}`).join(', ')
    return (
        <span className="flex gap-0.5" role="img" aria-label={`${t('partyStatus')}: ${summary}`}>
            {side.team.map(p => (
                <span
                    key={p.id}
                    title={`${nameOf(p, lang)} ${p.fainted ? `(${t('fainted')})` : `${pctOf(p)}%`}${p.status ? ` · ${statusLongName(p.status, lang)}` : ''}`}
                    className={`h-2.5 w-2.5 rounded-full border ${p.fainted ? 'border-slate-300 bg-slate-300' : p.status ? 'border-amber-500 bg-amber-300' : 'border-red-500 bg-red-400'}`}
                />
            ))}
        </span>
    )
}

function Sprite({ p, back }: { p: PokeView; back: boolean }) {
    const lang = useLang()
    const id = dexIdOf(p.species)
    // 실패한 URL 단계 (0: 기본, 1: 정면 도트, 2: 공식 아트워크)
    const [fallback, setFallback] = useState<{ key: string; step: number }>({ key: '', step: 0 })
    const key = `${p.species}-${back}`
    const step = fallback.key === key ? fallback.step : 0
    if (!id) return <div className="h-24 w-24 shrink-0 sm:h-36 sm:w-36" />
    const candidates = back ? [backSpriteUrl(id), spriteUrl(id), artworkUrl(id)] : [spriteUrl(id), artworkUrl(id)]
    const src = candidates[Math.min(step, candidates.length - 1)]!
    return (
        <img
            key={p.id}
            src={src}
            alt={nameOf(p, lang)}
            onError={() => step < candidates.length - 1 && setFallback({ key, step: step + 1 })}
            className={`h-24 w-24 shrink-0 object-contain transition-all duration-300 sm:h-36 sm:w-36 [image-rendering:pixelated] ${p.fainted ? 'translate-y-6 opacity-0' : 'opacity-100'}`}
        />
    )
}

// ─── 필드 정보 ───────────────────────────────────────────────
function FieldBar({ f }: { f: Frame }) {
    const lang = useLang()
    const t = useBattleT()
    const chips: { label: string; tone: string }[] = []
    if (f.weather) chips.push({ label: weatherName(f.weather, lang), tone: 'bg-sky-100 text-sky-700' })
    if (f.terrain) chips.push({ label: terrainName(f.terrain, lang), tone: 'bg-emerald-100 text-emerald-700' })
    for (const c of f.field) chips.push({ label: fieldConditionName(c, lang), tone: 'bg-fuchsia-100 text-fuchsia-700' })
    const side = (s: SideView, label: string) => s.conditions.filter(c => c.id !== 'wish').map(c => ({
        label: `${label} ${sideConditionName(c.id, lang)}${c.layers > 1 ? `×${c.layers}` : ''}`,
        tone: 'bg-amber-100 text-amber-800',
    }))
    chips.push(...side(f.p2, t('sideFoe')), ...side(f.p1, t('sideOurs')))
    return (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="rounded-full bg-slate-900 px-2 py-0.5 font-bold text-white">{t('turn', { n: f.turn })}</span>
            {chips.map((c, i) => <span key={i} className={`rounded-full px-2 py-0.5 font-semibold ${c.tone}`}>{c.label}</span>)}
        </div>
    )
}

// ─── 기술 선택 ───────────────────────────────────────────────
function MoveButton({ opt, preview, onClick }: {
    opt: MoveOption
    preview: { text: string; eff: number } | null
    onClick: () => void
}) {
    const lang = useLang()
    const t = useBattleT()
    const m = opt.move
    const color = TYPE_COLOR[m.type] ?? '#94a3b8'
    const effLabel = preview ? preview.eff === 0 ? t('effNone') : preview.eff >= 2 ? t('effSuper') : preview.eff < 1 ? t('effWeak') : '' : ''
    const name = moveNameL(opt.index === -1 ? 'struggle' : m.name, lang)
    const meta = m.category === 'status' ? damageClassName('status', lang) : `${damageClassName(m.category, lang)} ${m.power ?? '-'}`
    return (
        <button
            type="button"
            disabled={opt.disabled}
            onClick={onClick}
            title={opt.disabled_reason}
            className="group relative flex min-h-[64px] flex-col justify-between overflow-hidden rounded-xl border-2 bg-white py-2 pl-3.5 pr-3 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            style={{ borderColor: color }}
        >
            <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: color }} />
            <span className="flex items-center justify-between gap-2">
                <span className="truncate font-bold text-slate-900">{name}</span>
                <TypeBadge type={m.type} size="xs" />
            </span>
            <span className="flex flex-wrap items-center justify-between gap-x-2 text-[11px] text-slate-500">
                <span>{meta} · <span className="tabular-nums">PP {opt.pp}/{opt.max_pp}</span></span>
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
    const lang = useLang()
    const t = useBattleT()
    const req = session.request(player)
    // 턴이 바뀌면 부모가 key 로 다시 마운트 → 테라스탈 토글 초기화
    const [tera, setTera] = useState(false)
    const engine = session.engine

    const previews = useMemo(() => {
        if (!engine || !req || req.type !== 'move') return {}
        const out: Record<number, { text: string; eff: number }> = {}
        for (const opt of req.moves) {
            if (opt.move.category === 'status' || opt.index < 0) continue
            const r = engine.previewDamage(player, opt.index, { terastallize: tera })
            if (!r) continue
            if (r.max === 0) { out[opt.index] = { text: '0%', eff: r.effectiveness }; continue }
            const pct = (n: number) => Math.min(100, Math.round(n))
            out[opt.index] = { text: `${pct(r.minPercent)}–${pct(r.maxPercent)}%`, eff: r.effectiveness }
        }
        return out
    }, [engine, req, player, tera])

    if (!req) {
        const ended = session.phase === 'ended'
        return (
            <div role="status" className="flex h-full min-h-[120px] items-center justify-center gap-2 text-sm text-slate-400">
                {!ended && <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-400" aria-hidden />}
                {ended ? t('battleEnded') : session.allRevealed ? t('waitingFoe') : t('inProgress')}
            </div>
        )
    }

    const switchAction = (id: string) => session.submit({ type: 'switch', player, pokemon_id: req.active.id, switch_to_id: id })
    const activeName = nameOf(req.active, lang)
    const prompt = t('whatWillDo', { name: activeName })

    return (
        <div className="space-y-3">
            {req.type === 'move' && (
                <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-700">{lang === 'ko' ? fixParticles(prompt) : prompt}</p>
                        {req.can_terastallize && (
                            <label className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-red-400 ${tera ? 'bg-gradient-to-r from-fuchsia-500 to-sky-500 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                <input type="checkbox" className="sr-only" checked={tera} onChange={e => setTera(e.target.checked)} />
                                <span aria-hidden>✦</span> {t('terastallize')}
                                {req.active.tera_type && <TypeBadge type={req.active.tera_type} size="xs" />}
                            </label>
                        )}
                    </div>
                    <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                        {req.moves.map(opt => (
                            <MoveButton
                                key={opt.index}
                                opt={opt}
                                preview={previews[opt.index] ?? null}
                                onClick={() => session.submit({ type: 'move', player, pokemon_id: req.active.id, move_index: opt.index, terastallize: tera || undefined })}
                            />
                        ))}
                    </div>
                    {req.forced && <p className="text-xs text-slate-400">{t('movesLocked')}</p>}
                </>
            )}
            {req.type === 'switch' && (
                <p className="text-sm font-semibold text-slate-700">
                    {req.reason === 'faint' ? t('switchFaint') : t('switchPick')}
                </p>
            )}
            <SwitchList req={req} onSwitch={switchAction} />
        </div>
    )
}

function SwitchList({ req, onSwitch }: { req: BattleRequest; onSwitch: (id: string) => void }) {
    const lang = useLang()
    const t = useBattleT()
    if (req.switches.length === 0) return null
    return (
        <div>
            {req.type === 'move' && <p className="mb-1 text-xs font-semibold text-slate-400">{t('switchHeading')}</p>}
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {req.switches.map(p => {
                    const id = dexIdOf(p.species)
                    const name = nameOf(p, lang)
                    return (
                        <button key={p.id} type="button" onClick={() => onSwitch(p.id)}
                            aria-label={`${t('switchTo', { name })} (${pctOf(p)}%${p.status ? `, ${statusLongName(p.status, lang)}` : ''})`}
                            className="flex min-w-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-left transition hover:border-red-300 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-400">
                            {id && <img src={spriteUrl(id)} alt="" className="h-9 w-9 shrink-0 object-contain [image-rendering:pixelated]" />}
                            <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1">
                                    <span className="truncate text-xs font-bold text-slate-800">{name}</span>
                                    {p.status && <StatusChip status={p.status} lang={lang} />}
                                </span>
                                <span className="mt-0.5 flex items-center gap-1">
                                    <span className="flex-1"><HpBar p={p} label={t('hpLabel', { hp: p.hp, max: p.max_hp })} thin /></span>
                                    <span className="text-[10px] tabular-nums text-slate-500">{pctOf(p)}%</span>
                                </span>
                            </span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// ─── 로그 ────────────────────────────────────────────────────
function BattleLog({ session, sideName }: { session: BattleSession; sideName?: (p: PlayerID) => string }) {
    const lang = useLang()
    const t = useBattleT()
    const ref = useRef<HTMLDivElement>(null)
    const { frames, revealed } = session
    // 문장은 현재 언어로 그릴 때마다 만든다 → 언어를 바꾸면 지난 로그도 바뀐다
    const lines = useMemo(
        () => frames.slice(0, revealed)
            .map(f => ({ f, text: frameText(f, lang, sideName) }))
            .filter((x): x is { f: Frame; text: string } => x.text !== null),
        [frames, revealed, lang, sideName],
    )
    useEffect(() => {
        const el = ref.current
        if (el) el.scrollTop = el.scrollHeight
    }, [lines.length])
    return (
        <div ref={ref} role="log" aria-live="polite" aria-label={t('battleLog')} tabIndex={0}
            className="h-64 overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-relaxed focus-visible:outline-2 focus-visible:outline-red-400 lg:h-[calc(100%-2rem)]">
            {lines.length === 0 && <p className="text-slate-400">{t('logEmpty')}</p>}
            {lines.map(({ f, text }) => {
                const e = f.event
                if (e.type === 'turn_start') return <div key={f.index} className="mb-1 mt-2 border-b border-slate-100 pb-0.5 text-xs font-bold text-slate-400 first:mt-0">{text}</div>
                const tone = e.type === 'move_use' ? 'font-semibold text-slate-900'
                    : e.type === 'faint' ? 'font-semibold text-red-600'
                        : e.type === 'battle_end' ? 'mt-2 text-base font-extrabold text-red-600'
                            : e.type === 'damage' && (e.effectiveness ?? 1) > 1 ? 'text-orange-700'
                                : 'text-slate-600'
                return <div key={f.index} className={tone}>{text}</div>
            })}
        </div>
    )
}

// ─── 메인 뷰 ─────────────────────────────────────────────────
export function BattleView({ session, onExit, onRematch }: { session: BattleSession; onExit: () => void; onRematch: () => void }) {
    const lang = useLang()
    const t = useBattleT()
    const f = session.current
    const spectating = session.isAI('p1') && session.isAI('p2')
    const ended = session.phase === 'ended' && session.allRevealed

    const cpu1 = t('cpu1')
    const cpu2 = t('cpu2')
    const sideName = useMemo(
        () => (spectating ? (p: PlayerID) => (p === 'p1' ? cpu1 : cpu2) : undefined),
        [spectating, cpu1, cpu2],
    )

    const docTitle = f
        ? `${nameOf(f.p1.active, lang)} vs ${nameOf(f.p2.active, lang)} · ${t('turn', { n: f.turn })}`
        : t('title')
    useDocumentTitle(docTitle)

    if (!f) return null

    const result = session.winner === 'draw' ? t('draw')
        : session.winner === 'p1' ? (spectating ? t('winnerIs', { name: cpu1 }) : t('win'))
            : spectating ? t('winnerIs', { name: cpu2 }) : t('lose')

    const ctrl = 'rounded-lg px-2 py-1 font-semibold transition focus-visible:outline-2 focus-visible:outline-red-400'

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
            <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <FieldBar f={f} />
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <label className="flex items-center gap-1 text-slate-500">{t('speed')}
                            <select value={session.speed} onChange={e => session.setSpeed(Number(e.target.value))}
                                className="rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-slate-700">
                                <option value={900}>{t('speedSlow')}</option>
                                <option value={450}>{t('speedNormal')}</option>
                                <option value={180}>{t('speedFast')}</option>
                                <option value={40}>{t('speedVeryFast')}</option>
                            </select>
                        </label>
                        {spectating && (
                            <button type="button" onClick={() => session.setPaused(!session.paused)} aria-pressed={session.paused}
                                className={`${ctrl} bg-slate-100 text-slate-600 hover:bg-slate-200`}>
                                <span aria-hidden>{session.paused ? '▶ ' : '❚❚ '}</span>{session.paused ? t('play') : t('pause')}
                            </button>
                        )}
                        {!session.allRevealed && (
                            <button type="button" onClick={session.skip} className={`${ctrl} bg-slate-100 text-slate-600 hover:bg-slate-200`}>
                                {t('skip')}<span aria-hidden> ⏭</span>
                            </button>
                        )}
                        <button type="button" onClick={onExit} className={`${ctrl} text-slate-400 hover:text-red-500`}>{t('exit')}</button>
                    </div>
                </div>

                {/* 배틀 필드 */}
                <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50 p-2.5 sm:p-5">
                    <div className="pointer-events-none absolute right-[8%] top-[34%] h-10 w-32 rounded-[50%] bg-emerald-200/70 blur-[1px] sm:w-52" />
                    <div className="pointer-events-none absolute bottom-[10%] left-[6%] h-10 w-36 rounded-[50%] bg-emerald-300/60 blur-[1px] sm:w-60" />
                    <div className="relative flex items-start justify-between gap-2">
                        <StatusCard side={f.p2} exact={spectating} />
                        <Sprite p={f.p2.active} back={false} />
                    </div>
                    <div className="relative mt-2 flex items-end justify-between gap-2">
                        <Sprite p={f.p1.active} back />
                        <StatusCard side={f.p1} exact />
                    </div>
                    {ended && (
                        <div role="alertdialog" aria-label={result} className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/75 p-4 text-center backdrop-blur-sm">
                            <p className={`text-3xl font-black ${!spectating && session.winner === 'p2' ? 'text-slate-700' : 'text-slate-900'}`}>{result}</p>
                            <div className="flex flex-wrap justify-center gap-2">
                                <button type="button" onClick={onRematch} autoFocus className="rounded-xl bg-red-500 px-4 py-2 font-semibold text-white shadow-lg shadow-red-500/30 hover:bg-red-600">{t('rematch')}</button>
                                <button type="button" onClick={onExit} className="rounded-xl bg-white px-4 py-2 font-semibold text-slate-700 shadow hover:bg-slate-50">{t('backToTeam')}</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 행동 */}
                {!spectating && (
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                        {session.error && <p role="alert" className="mb-2 rounded-lg bg-red-50 px-2 py-1 text-xs text-red-600">{t('actionError', { msg: session.error })}</p>}
                        <ActionPanel key={`${f.turn}-${session.allRevealed}`} session={session} player="p1" />
                    </div>
                )}
                {spectating && <SpectatorDetails f={f} sideName={sideName!} />}
            </div>

            <div className="min-w-0 lg:h-[640px]">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{t('battleLog')}</p>
                <BattleLog session={session} sideName={sideName} />
            </div>
        </div>
    )
}

function SpectatorDetails({ f, sideName }: { f: Frame; sideName: (p: PlayerID) => string }) {
    const lang = useLang()
    const t = useBattleT()
    const row = (p: PokeView) => {
        const name = nameOf(p, lang)
        return (
            <li key={p.id} className={`flex items-center gap-2 text-xs ${p.fainted ? 'opacity-40' : ''}`}>
                <span className="w-24 truncate font-semibold text-slate-700" title={name}>{name}</span>
                <span className="flex-1"><HpBar p={p} label={t('hpLabel', { hp: p.hp, max: p.max_hp })} thin /></span>
                <span className="w-8 text-right tabular-nums text-slate-500">{pctOf(p)}%</span>
                <span className="w-20 truncate text-right text-slate-400" title={t('itemOrAbility')}>
                    {p.item ? itemName(p.item, lang) : abilityNameL(p.ability, lang)}
                </span>
            </li>
        )
    }
    return (
        <div className="grid grid-cols-1 gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
            {[f.p1, f.p2].map(s => (
                <div key={s.id} className="min-w-0 space-y-1">
                    <p className="text-xs font-bold text-slate-500">{sideName(s.id)}</p>
                    <ul className="space-y-1">{s.team.map(row)}</ul>
                </div>
            ))}
        </div>
    )
}
