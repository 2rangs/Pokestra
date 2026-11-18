import { useMemo, useState } from 'react'
import { fixParticles, type BattleRequest, type PlayerID, type MoveOption } from '@kyasi/pokebattle-engine'
import { Button } from '@astryxdesign/core/Button'
import { Grid } from '@astryxdesign/core/Grid'
import { HStack } from '@astryxdesign/core/HStack'
import { VStack } from '@astryxdesign/core/VStack'
import { Spinner } from '@astryxdesign/core/Spinner'
import { Switch } from '@astryxdesign/core/Switch'
import { Text } from '@astryxdesign/core/Text'
import { dexIdOf, moveNameL, typeNameL } from '../../../lib/battle'
import { statusLongName } from '../../../lib/battleLog'
import { damageClassName } from '../../../lib/dex'
import { effectivenessLabel, effectivenessTone, koLabel } from '../../../lib/battleHud'
import { useLang } from '../../../i18n'
import { TypeBadge } from '../../../components/battle/TypeBadge'
import { PokeImage } from '../../../components/ui/PokeImage'
import { cx } from '../../../components/ui/utils'
import { pokemonImageCandidates } from '../../../lib/images'
import type { BattleSession } from '../useBattleSession'
import { HpBar, StatusToken } from './common'
import { nameOf, pctOf, useBattleT } from './util'

// ─── 기술 선택 ───────────────────────────────────────────────
/** 기술 버튼에 보여줄 데미지 미리보기 */
export interface MovePreview {
    /** 예상 데미지 % 범위 ("30–36%") */
    text:  string
    eff:   number
    /** 확정/난수 n타 (없으면 null) */
    ko:    string | null
}

const EFF_TONE = {
    super: 'font-semibold text-error',
    weak: 'text-secondary',
    none: 'text-secondary',
    neutral: 'text-primary',
} as const

function MoveButton({ opt, preview, onClick }: {
    opt: MoveOption
    preview: MovePreview | null
    onClick: () => void
}) {
    const lang = useLang()
    const t = useBattleT()
    const m = opt.move
    const name = moveNameL(opt.index === -1 ? 'struggle' : m.name, lang)
    const category = damageClassName(m.category, lang)
    const meta = m.category === 'status' ? category : `${category} ${m.power ?? '-'}`
    const pp = `PP ${opt.pp}/${opt.max_pp}`
    const ppLow = opt.max_pp > 0 && opt.pp / opt.max_pp <= 0.25
    const effLabel = preview ? effectivenessLabel(preview.eff, lang) : null
    const a11y = [
        name,
        t('typeOf', { type: typeNameL(m.type, lang) }),
        m.category === 'status' ? category : `${category} ${t('powerN', { n: m.power ?? '-' })}`,
        pp,
        effLabel,
        preview && t('damagePreview', { range: preview.text }),
        preview?.ko,
        opt.disabled_reason,
    ].filter(Boolean).join(', ')
    return (
        <Button
            label={a11y}
            width="100%"
            isDisabled={opt.disabled}
            tooltip={opt.disabled_reason}
            onClick={() => { if (!opt.disabled) onClick() }}
            // 세로 방향 + stretch: 버튼 안 내용 상자가 버튼 폭을 다 쓴다
            className="h-auto min-h-16 flex-col items-stretch justify-center px-2.5 py-1.5 text-left sm:px-3"
        >
            <VStack as="span" gap={0.5} className="w-full min-w-0">
                <HStack as="span" gap={1.5} vAlign="center" hAlign="between" className="min-w-0">
                    <Text weight="semibold" maxLines={1} hasTruncateTooltip={false}>{name}</Text>
                    <TypeBadge type={m.type} size="xs" className="shrink-0" />
                </HStack>
                <HStack as="span" gap={1.5} vAlign="center" wrap="wrap">
                    <Text type="supporting" size="xsm">{meta}</Text>
                    <Text type="supporting" size="xsm" aria-hidden>·</Text>
                    <Text type="supporting" size="xsm" hasTabularNumbers weight={ppLow ? 'semibold' : undefined} className={cx(ppLow && 'text-warning')}>{pp}</Text>
                </HStack>
                {preview && (
                    <HStack as="span" gap={1.5} vAlign="center" wrap="wrap">
                        {effLabel && <Text size="xsm" hasTabularNumbers className={EFF_TONE[effectivenessTone(preview.eff)]}>{effLabel}</Text>}
                        {effLabel && <Text type="supporting" size="xsm" aria-hidden>·</Text>}
                        <Text size="xsm" hasTabularNumbers>{preview.text}</Text>
                        {preview.ko && <Text type="supporting" size="xsm" aria-hidden>·</Text>}
                        {preview.ko && <Text size="xsm" weight="medium">{preview.ko}</Text>}
                    </HStack>
                )}
                {opt.disabled_reason && <Text size="xsm" maxLines={1} hasTruncateTooltip={false} className="text-error">{opt.disabled_reason}</Text>}
            </VStack>
        </Button>
    )
}

export function ActionPanel({ session, player }: { session: BattleSession; player: PlayerID }) {
    const lang = useLang()
    const t = useBattleT()
    // request() 는 부를 때마다 새 객체 → 엔진이 바뀔 때(version)·재생이 끝날 때만 다시 받는다
    const { request, version, allRevealed } = session
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const req = useMemo(() => request(player), [player, version, allRevealed, session.engine])
    // 턴이 바뀌면 부모가 key 로 다시 마운트 → 테라스탈 토글 초기화
    const [tera, setTera] = useState(false)
    const engine = session.engine

    const previews = useMemo(() => {
        if (!engine || !req || req.type !== 'move') return {}
        const out: Record<number, MovePreview> = {}
        for (const opt of req.moves) {
            if (opt.move.category === 'status' || opt.index < 0) continue
            const r = engine.previewDamage(player, opt.index, { terastallize: tera })
            if (!r) continue
            if (r.max === 0) { out[opt.index] = { text: '0%', eff: r.effectiveness, ko: null }; continue }
            const pct = (n: number) => Math.min(100, Math.round(n))
            out[opt.index] = { text: `${pct(r.minPercent)}–${pct(r.maxPercent)}%`, eff: r.effectiveness, ko: koLabel(r, lang) }
        }
        return out
    }, [engine, req, player, tera, lang])

    if (!req) {
        const ended = session.phase === 'ended'
        return (
            <HStack role="status" gap={2} hAlign="center" vAlign="center" className="min-h-30">
                {!ended && <Spinner size="sm" aria-label={t('inProgress')} />}
                <Text color="secondary">{ended ? t('battleEnded') : session.allRevealed ? t('waitingFoe') : t('inProgress')}</Text>
            </HStack>
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
                    <Grid role="group" aria-label={t('moves')} columns={2} gap={2}>
                        {req.moves.map(opt => (
                            <MoveButton
                                key={opt.index}
                                opt={opt}
                                preview={previews[opt.index] ?? null}
                                onClick={() => session.submit({ type: 'move', player, pokemon_id: req.active.id, move_index: opt.index, terastallize: tera || undefined })}
                            />
                        ))}
                    </Grid>
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
                                className="h-auto flex-col items-stretch justify-center border border-border py-1 text-left"
                            >
                                <HStack as="span" gap={2} vAlign="center" className="w-full min-w-0">
                                    <HStack as="span" hAlign="center" vAlign="center" className="h-9 w-9 shrink-0">
                                        {id && <PokeImage sources={pokemonImageCandidates(id, 36)} alt="" size={36} className="h-9 w-9" />}
                                    </HStack>
                                    <VStack as="span" gap={1} className="min-w-0 flex-1">
                                        <HStack as="span" gap={1.5} vAlign="center" className="min-w-0">
                                            <Text size="sm" weight="semibold" maxLines={1} hasTruncateTooltip={false}>{name}</Text>
                                            {p.status && <StatusToken status={p.status} lang={lang} />}
                                        </HStack>
                                        <HpBar p={p} label={t('hpLabel', { hp: p.hp, max: p.max_hp })} />
                                    </VStack>
                                    <Text type="supporting" size="xsm" hasTabularNumbers justify="end" className="w-9 shrink-0">{pctOf(p)}%</Text>
                                </HStack>
                            </Button>
                        </li>
                    )
                })}
            </ul>
        </VStack>
    )
}
