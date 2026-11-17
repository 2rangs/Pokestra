import { useEffect, useMemo, useRef, useState } from 'react'
import { fixParticles, type BattleRequest, type PlayerID, type MoveOption } from '@kyasi/pokebattle-engine'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { VStack } from '@astryxdesign/core/VStack'
import { Icon } from '@astryxdesign/core/Icon'
import { ProgressBar } from '@astryxdesign/core/ProgressBar'
import { Selector } from '@astryxdesign/core/Selector'
import { Spinner } from '@astryxdesign/core/Spinner'
import { Switch } from '@astryxdesign/core/Switch'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import {
    battleStatLabel, dexIdOf, itemName, moveNameL, abilityNameL, typeNameL,
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
import { cx } from '../../components/ui/utils'
import { frameText, type BattleSession, type Frame, type PokeView, type SideView } from './useBattleSession'

type TokenColor = 'default' | 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'cyan' | 'blue' | 'purple' | 'pink' | 'gray'

const STATUS_COLOR: Record<string, TokenColor> = {
    burn: 'orange', freeze: 'cyan', paralysis: 'yellow', poison: 'purple', toxic: 'purple', sleep: 'gray',
}

const SPEEDS = [
    { value: 900, label: 'speedSlow' },
    { value: 450, label: 'speedNormal' },
    { value: 180, label: 'speedFast' },
    { value: 40, label: 'speedVeryFast' },
] as const

const ratioOf = (p: { hp: number; max_hp: number }) => (p.max_hp ? Math.max(0, Math.min(1, p.hp / p.max_hp)) : 0)
const pctOf = (p: { hp: number; max_hp: number }) => (p.hp > 0 ? Math.max(1, Math.ceil(ratioOf(p) * 100)) : 0)

type Named = { species: string; nickname?: string | null; setSpecies?: string; set?: { species: string } }
const nameOf = (p: Named, lang: Lang) => pokemonLabel(p.species, p.nickname, lang, p.setSpecies ?? p.set?.species)

function useBattleT() {
    return useT(battleMessages)
}

function StatusToken({ status, lang }: { status: string; lang: Lang }) {
    return (
        <span title={statusLongName(status, lang)} className="inline-flex">
            <Token size="sm" color={STATUS_COLOR[status] ?? 'gray'} label={statusName(status, lang)} description={statusLongName(status, lang)} />
        </span>
    )
}

/** HP 막대: 많으면 초록, 절반 이하 노랑, 1/5 이하 빨강 */
function HpBar({ p, label }: { p: { hp: number; max_hp: number }; label: string }) {
    const ratio = ratioOf(p)
    return (
        <ProgressBar
            label={label}
            isLabelHidden
            value={pctOf(p)}
            max={100}
            variant={ratio > 0.5 ? 'success' : ratio > 0.2 ? 'warning' : 'error'}
        />
    )
}

// ─── 필드 위 포켓몬 카드 ─────────────────────────────────────
function Combatant({ side, exact, back }: { side: SideView; exact: boolean; back: boolean }) {
    const lang = useLang()
    const t = useBattleT()
    const p = side.active
    const name = nameOf(p, lang)
    const volatiles = p.volatiles.map(v => [v, volatileName(v, lang)] as const).filter(([, n]) => n)
    const hpText = exact ? `${p.hp} / ${p.max_hp}` : `${pctOf(p)}%`

    const info = (
        <VStack gap={1.5} className="min-w-0 flex-1">
            <HStack gap={1.5} vAlign="center" wrap="wrap">
                <Text weight="semibold" maxLines={1}>{name}</Text>
                <Text type="supporting" color="secondary">{t('level', { n: p.level })}</Text>
                {p.status && <StatusToken status={p.status} lang={lang} />}
            </HStack>
            <HStack gap={1} wrap="wrap">
                {p.terastallized && p.tera_type
                    ? <TypeBadge type={p.tera_type} size="xs" title={t('tera')} />
                    : p.types.map(ty => <TypeBadge key={ty} type={ty} size="xs" />)}
            </HStack>
            <HpBar p={p} label={exact ? t('hpLabel', { hp: p.hp, max: p.max_hp }) : t('hpPercent', { pct: pctOf(p) })} />
            <HStack gap={2} vAlign="center" hAlign="between">
                <Text type="supporting" weight="medium" hasTabularNumbers>{hpText}</Text>
                <PartyDots side={side} />
            </HStack>
            {(Object.keys(p.stages).length > 0 || volatiles.length > 0) && (
                <HStack gap={1} wrap="wrap">
                    {Object.entries(p.stages).map(([k, v]) => (
                        <Token key={k} size="sm" color={v > 0 ? 'blue' : 'red'} label={`${battleStatLabel(k, lang)} ${v > 0 ? `+${v}` : v}`} />
                    ))}
                    {volatiles.map(([v, n]) => <Token key={v} size="sm" color="purple" label={n!} />)}
                </HStack>
            )}
        </VStack>
    )

    return (
        <section aria-label={name} className="w-full max-w-md min-w-0">
            <Card padding={3}>
                <HStack gap={3} vAlign="center">
                    {back && <Sprite p={p} back />}
                    {info}
                    {!back && <Sprite p={p} back={false} />}
                </HStack>
            </Card>
        </section>
    )
}

function PartyDots({ side }: { side: SideView }) {
    const lang = useLang()
    const t = useBattleT()
    const summary = side.team.map(p => `${nameOf(p, lang)} ${p.fainted ? t('fainted') : `${pctOf(p)}%`}`).join(', ')
    return (
        <span className="flex gap-1" role="img" aria-label={`${t('partyStatus')}: ${summary}`}>
            {side.team.map(p => (
                <span
                    key={p.id}
                    title={`${nameOf(p, lang)} ${p.fainted ? `(${t('fainted')})` : `${pctOf(p)}%`}${p.status ? `, ${statusLongName(p.status, lang)}` : ''}`}
                    className={cx(
                        'h-2.5 w-2.5 rounded-full border',
                        p.fainted ? 'border-border bg-muted' : p.status ? 'border-warning bg-warning' : 'border-success bg-success',
                    )}
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
    const box = 'h-20 w-20 shrink-0 sm:h-28 sm:w-28'
    if (!id) return <span className={box} />
    const candidates = back ? [backSpriteUrl(id), spriteUrl(id), artworkUrl(id)] : [spriteUrl(id), artworkUrl(id)]
    const src = candidates[Math.min(step, candidates.length - 1)]!
    return (
        <img
            key={p.id}
            src={src}
            alt={nameOf(p, lang)}
            onError={() => step < candidates.length - 1 && setFallback({ key, step: step + 1 })}
            className={cx(box, 'object-contain transition-all duration-300 [image-rendering:pixelated]', p.fainted ? 'translate-y-4 opacity-0' : 'opacity-100')}
        />
    )
}

// ─── 필드 상태 (날씨, 필드, 진영 효과) ─────────────────────────
function FieldTokens({ f }: { f: Frame }) {
    const lang = useLang()
    const t = useBattleT()
    const tokens: { label: string; color: TokenColor }[] = []
    if (f.weather) tokens.push({ label: weatherName(f.weather, lang), color: 'blue' })
    if (f.terrain) tokens.push({ label: terrainName(f.terrain, lang), color: 'green' })
    for (const c of f.field) tokens.push({ label: fieldConditionName(c, lang), color: 'pink' })
    const side = (s: SideView, label: string) => s.conditions.filter(c => c.id !== 'wish').map(c => ({
        label: `${label} ${sideConditionName(c.id, lang)}${c.layers > 1 ? `×${c.layers}` : ''}`,
        color: 'orange' as const,
    }))
    tokens.push(...side(f.p2, t('sideFoe')), ...side(f.p1, t('sideOurs')))
    return (
        <HStack gap={2} vAlign="center" wrap="wrap">
            <Heading level={2}>{t('turn', { n: f.turn })}</Heading>
            {tokens.map((c, i) => <Token key={i} size="sm" color={c.color} label={c.label} />)}
        </HStack>
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
    const effLabel = preview ? preview.eff === 0 ? t('effNone') : preview.eff >= 2 ? t('effSuper') : preview.eff < 1 ? t('effWeak') : '' : ''
    const name = moveNameL(opt.index === -1 ? 'struggle' : m.name, lang)
    const meta = m.category === 'status' ? damageClassName('status', lang) : `${damageClassName(m.category, lang)} ${m.power ?? '-'}`
    const pp = `PP ${opt.pp}/${opt.max_pp}`
    const a11y = [
        name, typeNameL(m.type, lang), meta, pp,
        preview && [effLabel, t('damagePreview', { range: preview.text })].filter(Boolean).join(' '),
        opt.disabled_reason,
    ].filter(Boolean).join(', ')
    const effTone = !preview ? '' : preview.eff >= 2 ? 'text-error font-semibold' : preview.eff === 0 || preview.eff < 1 ? 'text-secondary' : 'text-primary'
    return (
        <Button
            label={a11y}
            width="100%"
            isDisabled={opt.disabled}
            tooltip={opt.disabled_reason}
            onClick={() => { if (!opt.disabled) onClick() }}
            className="h-auto min-h-16 justify-start py-2 text-left [&>span]:w-full [&>span>span]:w-full"
        >
            <span className="flex w-full min-w-0 flex-col gap-1">
                <span className="flex min-w-0 items-center justify-between gap-2">
                    <span className="truncate font-semibold">{name}</span>
                    <TypeBadge type={m.type} size="xs" />
                </span>
                <span className="flex flex-wrap items-center justify-between gap-x-2 text-xs font-normal">
                    <span className="flex gap-2 text-secondary"><span>{meta}</span><span className="tabular-nums">{pp}</span></span>
                    {preview && <span className={cx('tabular-nums', effTone)}>{effLabel && `${effLabel} `}{preview.text}</span>}
                </span>
                {opt.disabled_reason && <span className="truncate text-xs font-normal text-error">{opt.disabled_reason}</span>}
            </span>
        </Button>
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
            <span role="status" className="flex min-h-30 items-center justify-center gap-2">
                {!ended && <Spinner size="sm" aria-label={t('inProgress')} />}
                <Text color="secondary">{ended ? t('battleEnded') : session.allRevealed ? t('waitingFoe') : t('inProgress')}</Text>
            </span>
        )
    }

    const switchAction = (id: string) => session.submit({ type: 'switch', player, pokemon_id: req.active.id, switch_to_id: id })
    const activeName = nameOf(req.active, lang)
    const prompt = t('whatWillDo', { name: activeName })

    return (
        <VStack gap={4}>
            {req.type === 'move' && (
                <VStack gap={3}>
                    <HStack gap={3} vAlign="center" hAlign="between" wrap="wrap">
                        <Text weight="semibold">{lang === 'ko' ? fixParticles(prompt) : prompt}</Text>
                        {req.can_terastallize && (
                            <HStack gap={2} vAlign="center">
                                <Switch label={t('terastallize')} value={tera} onChange={setTera} size="sm" />
                                {req.active.tera_type && <TypeBadge type={req.active.tera_type} size="xs" />}
                            </HStack>
                        )}
                    </HStack>
                    <div role="group" aria-label={t('moves')} className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                        {req.moves.map(opt => (
                            <MoveButton
                                key={opt.index}
                                opt={opt}
                                preview={previews[opt.index] ?? null}
                                onClick={() => session.submit({ type: 'move', player, pokemon_id: req.active.id, move_index: opt.index, terastallize: tera || undefined })}
                            />
                        ))}
                    </div>
                    {req.forced && <Text type="supporting" color="secondary">{t('movesLocked')}</Text>}
                </VStack>
            )}
            {req.type === 'switch' && (
                <Text weight="semibold">{req.reason === 'faint' ? t('switchFaint') : t('switchPick')}</Text>
            )}
            <SwitchList req={req} onSwitch={switchAction} />
        </VStack>
    )
}

function SwitchList({ req, onSwitch }: { req: BattleRequest; onSwitch: (id: string) => void }) {
    const lang = useLang()
    const t = useBattleT()
    if (req.switches.length === 0) return null
    return (
        <VStack gap={1.5}>
            {req.type === 'move' && <Text type="label" color="secondary">{t('switchHeading')}</Text>}
            <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {req.switches.map(p => {
                    const id = dexIdOf(p.species)
                    const name = nameOf(p, lang)
                    return (
                        <li key={p.id} className="min-w-0">
                            <Button
                                variant="ghost"
                                width="100%"
                                label={`${t('switchTo', { name })} (${pctOf(p)}%${p.status ? `, ${statusLongName(p.status, lang)}` : ''})`}
                                onClick={() => onSwitch(p.id)}
                                className="h-auto justify-start border border-border py-1 text-left [&>span]:w-full [&>span>span]:w-full"
                            >
                                <span className="flex w-full min-w-0 items-center gap-2">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center">
                                        {id && <img src={spriteUrl(id)} alt="" className="h-9 w-9 object-contain [image-rendering:pixelated]" />}
                                    </span>
                                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                                        <span className="flex min-w-0 items-center gap-1.5">
                                            <span className="truncate text-sm font-semibold">{name}</span>
                                            {p.status && <StatusToken status={p.status} lang={lang} />}
                                        </span>
                                        <HpBar p={p} label={t('hpLabel', { hp: p.hp, max: p.max_hp })} />
                                    </span>
                                    <span className="w-9 shrink-0 text-right text-xs font-normal tabular-nums text-secondary">{pctOf(p)}%</span>
                                </span>
                            </Button>
                        </li>
                    )
                })}
            </ul>
        </VStack>
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
        <div
            ref={ref}
            role="log"
            aria-live="polite"
            aria-label={t('battleLog')}
            tabIndex={0}
            className="h-72 overflow-y-auto overscroll-contain rounded-md border border-border bg-surface px-3 py-2 text-sm lg:h-160"
        >
            {lines.length === 0 && <Text color="secondary">{t('logEmpty')}</Text>}
            <ul className="flex flex-col gap-0.5">
                {lines.map(({ f, text }) => {
                    const e = f.event
                    if (e.type === 'turn_start') {
                        return (
                            <li key={f.index} className="mt-3 border-t border-border pt-2 first:mt-0 first:border-t-0 first:pt-0">
                                <Text type="label" color="secondary">{text}</Text>
                            </li>
                        )
                    }
                    const key = e.type === 'faint' || (e.type === 'damage' && (e.crit || (e.effectiveness ?? 1) > 1))
                    const tone = e.type === 'battle_end' ? 'mt-2 font-bold text-accent'
                        : key ? 'font-medium text-error'
                            : e.type === 'move_use' ? 'font-semibold text-primary'
                                : 'text-secondary'
                    return <li key={f.index} className={tone}>{text}</li>
                })}
            </ul>
        </div>
    )
}

// ─── 결과 ────────────────────────────────────────────────────
function ResultOverlay({ result, onRematch, onExit }: { result: string; onRematch: () => void; onExit: () => void }) {
    const t = useBattleT()
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => { ref.current?.querySelector('button')?.focus() }, [])
    return (
        <div
            ref={ref}
            role="alertdialog"
            aria-label={result}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-lg bg-surface/90 p-4 text-center"
        >
            <Heading level={2}>{result}</Heading>
            <HStack gap={2} hAlign="center" wrap="wrap">
                <Button variant="primary" label={t('rematch')} onClick={onRematch} />
                <Button label={t('backToTeam')} onClick={onExit} />
            </HStack>
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
        ? `${nameOf(f.p1.active, lang)} vs ${nameOf(f.p2.active, lang)} - ${t('turn', { n: f.turn })}`
        : t('title')
    useDocumentTitle(docTitle)

    if (!f) return null

    const result = session.winner === 'draw' ? t('draw')
        : session.winner === 'p1' ? (spectating ? t('winnerIs', { name: cpu1 }) : t('win'))
            : spectating ? t('winnerIs', { name: cpu2 }) : t('lose')

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <VStack gap={4} className="min-w-0">
                <HStack gap={3} vAlign="center" hAlign="between" wrap="wrap">
                    <FieldTokens f={f} />
                    <HStack gap={2} vAlign="center" wrap="wrap">
                        <Selector
                            label={t('speed')}
                            isLabelHidden
                            variant="secondary"
                            size="sm"
                            startIcon="clock"
                            value={String(session.speed)}
                            onChange={v => session.setSpeed(Number(v))}
                            options={SPEEDS.map(s => ({ value: String(s.value), label: t(s.label) }))}
                        />
                        {spectating && (
                            <Button
                                size="sm"
                                label={session.paused ? t('play') : t('pause')}
                                aria-pressed={session.paused}
                                onClick={() => session.setPaused(!session.paused)}
                            />
                        )}
                        {!session.allRevealed && (
                            <Button size="sm" label={t('skip')} endContent={<Icon icon="chevronsRight" />} onClick={session.skip} />
                        )}
                        <Button size="sm" variant="ghost" label={t('exit')} onClick={onExit} />
                    </HStack>
                </HStack>

                {/* 배틀 필드: 상대는 위 오른쪽, 우리는 아래 왼쪽 */}
                <Card padding={4} variant="muted" className="relative">
                    <VStack gap={4}>
                        <HStack hAlign="end"><Combatant side={f.p2} exact={spectating} back={false} /></HStack>
                        <HStack hAlign="start"><Combatant side={f.p1} exact back /></HStack>
                    </VStack>
                    {ended && <ResultOverlay result={result} onRematch={onRematch} onExit={onExit} />}
                </Card>

                {!spectating && (
                    <Card padding={4}>
                        <VStack gap={3}>
                            {session.error && (
                                <span role="alert" className="block">
                                    <Text color="inherit" className="text-error">{t('actionError', { msg: session.error })}</Text>
                                </span>
                            )}
                            <ActionPanel key={`${f.turn}-${session.allRevealed}`} session={session} player="p1" />
                        </VStack>
                    </Card>
                )}
                {spectating && <SpectatorDetails f={f} sideName={sideName!} />}
            </VStack>

            <VStack gap={2} className="min-w-0">
                <Heading level={2}>{t('battleLog')}</Heading>
                <BattleLog session={session} sideName={sideName} />
            </VStack>
        </div>
    )
}

function SpectatorDetails({ f, sideName }: { f: Frame; sideName: (p: PlayerID) => string }) {
    const lang = useLang()
    const t = useBattleT()
    const row = (p: PokeView) => {
        const name = nameOf(p, lang)
        return (
            <li key={p.id} className={cx('grid grid-cols-[minmax(0,6rem)_1fr_2.5rem] items-center gap-2 py-1', p.fainted && 'opacity-50')}>
                <Text type="supporting" weight="medium" maxLines={1}>{name}</Text>
                <HpBar p={p} label={t('hpLabel', { hp: p.hp, max: p.max_hp })} />
                <Text type="supporting" color="secondary" hasTabularNumbers justify="end">{pctOf(p)}%</Text>
                <span className="col-span-3 truncate text-xs text-secondary" title={t('itemOrAbility')}>
                    {p.item ? itemName(p.item, lang) : abilityNameL(p.ability, lang)}
                </span>
            </li>
        )
    }
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[f.p1, f.p2].map(s => (
                <Card key={s.id} padding={3}>
                    <VStack gap={2}>
                        <Text type="label">{sideName(s.id)}</Text>
                        <ul className="divide-y divide-border">{s.team.map(row)}</ul>
                    </VStack>
                </Card>
            ))}
        </div>
    )
}
