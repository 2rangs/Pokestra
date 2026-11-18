import { useMemo, useState } from 'react'
import { fixParticles, type BattleRequest, type PlayerID, type MoveOption } from '@kyasi/pokebattle-engine'
import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/HStack'
import { VStack } from '@astryxdesign/core/VStack'
import { Spinner } from '@astryxdesign/core/Spinner'
import { Switch } from '@astryxdesign/core/Switch'
import { Text } from '@astryxdesign/core/Text'
import { dexIdOf, moveNameL, typeNameL } from '../../../lib/battle'
import { statusLongName } from '../../../lib/battleLog'
import { damageClassName } from '../../../lib/dex'
import { useLang } from '../../../i18n'
import { TypeBadge } from '../../../components/battle/TypeBadge'
import { PokeImage } from '../../../components/ui/PokeImage'
import { cx } from '../../../components/ui/utils'
import { pokemonImageCandidates } from '../../../lib/images'
import type { BattleSession } from '../useBattleSession'
import { HpBar, StatusToken } from './common'
import { nameOf, pctOf, useBattleT } from './util'

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

export function ActionPanel({ session, player }: { session: BattleSession; player: PlayerID }) {
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
                                        {id && <PokeImage sources={pokemonImageCandidates(id, 36)} alt="" size={36} className="h-9 w-9" />}
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
