// ─── 필드 위 포켓몬 HUD ─────────────────────────────────────
// 프레임의 SideView 만 받는다 (리플레이 화면에서도 같은 HUD 를 쓴다).
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { HStack } from '@astryxdesign/core/HStack'
import { VStack } from '@astryxdesign/core/VStack'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { battleStatLabel, typeNameL } from '../../../lib/battle'
import { statusLongName, volatileName } from '../../../lib/battleLog'
import { stageMultiplier } from '../../../lib/battleHud'
import { useLang } from '../../../i18n'
import { useBattleStore } from '../../../stores/battleStore'
import { TypeBadge } from '../../../components/battle/TypeBadge'
import { cx } from '../../../components/ui/utils'
import type { PokeView, SideView } from '../useBattleSession'
import { HpBar, StatusToken, TipChip } from './common'
import { nameOf, pctOf, useBattleT } from './util'

export interface CombatantProps {
    side: SideView
    /** 우리 편 (필드 아래쪽: 칩을 HUD 위에 둔다) */
    back: boolean
    /** HP 값: toggle = 숫자↔% 전환 가능, percent = % 만 (대전 중 상대) */
    hpMode: 'toggle' | 'percent'
    /** 아직 테라스탈하지 않았을 때 테라 타입을 보여줄지 (상대는 공개 전 숨김) */
    showTeraType: boolean
}

export function Combatant({ side, back, hpMode, showTeraType }: CombatantProps) {
    const lang = useLang()
    const t = useBattleT()
    const p = side.active
    const name = nameOf(p, lang)
    const volatiles = p.volatiles.map(v => [v, volatileName(v, lang)] as const).filter(([, n]) => n)
    const stages = Object.entries(p.stages)
    const teraHint = showTeraType && !p.terastallized && !side.usedTera && p.tera_type

    // 랭크·휘발성 칩은 HUD 상자 바깥 (상대는 아래, 우리는 위 — 필드 가장자리 쪽으로 자라지 않게)
    const chips = (stages.length > 0 || volatiles.length > 0) && (
        <HStack gap={1} wrap="wrap" hAlign={back ? 'end' : 'start'}>
            {stages.map(([k, v]) => {
                const label = `${battleStatLabel(k, lang)} ${v > 0 ? `+${v}` : v}`
                const tip = t('stageTip', { stat: battleStatLabel(k, lang), x: stageMultiplier(k, v) })
                return (
                    <TipChip key={k} tip={tip}>
                        <Token size="sm" color={v > 0 ? 'blue' : 'red'} label={label} description={tip} />
                    </TipChip>
                )
            })}
            {volatiles.map(([v, n]) => <Token key={v} size="sm" color="purple" label={n!} />)}
        </HStack>
    )

    return (
        <VStack as="section" aria-label={name} gap={1} className="w-full min-w-0">
            {back && chips}
            <Card padding={2} className="shadow-md">
                <VStack gap={0.5}>
                    <HStack gap={1.5} vAlign="center" className="min-w-0">
                        <Text weight="semibold" maxLines={1} className="min-w-0 shrink">{name}</Text>
                        <Text type="supporting" color="secondary" hasTabularNumbers>{t('level', { n: p.level })}</Text>
                        {p.status && <StatusToken status={p.status} lang={lang} />}
                    </HStack>
                    <HStack gap={2} vAlign="center" className="min-h-6">
                        <VStack className="min-w-0 flex-1">
                            <HpBar p={p} label={hpMode === 'percent' ? t('hpPercent', { pct: pctOf(p) }) : t('hpLabel', { hp: p.hp, max: p.max_hp })} />
                        </VStack>
                        <HpValue p={p} mode={hpMode} />
                    </HStack>
                    <HStack gap={1} vAlign="center" wrap="wrap">
                        {p.terastallized && p.tera_type
                            ? <>
                                <TypeBadge type={p.tera_type} size="xs" title={t('tera')} />
                                <Token size="sm" color="teal" label={t('tera')} description={t('teraActive', { type: typeNameL(p.tera_type, lang) })} />
                            </>
                            : p.types.map(ty => <TypeBadge key={ty} type={ty} size="xs" />)}
                        {teraHint && (
                            <Text type="supporting" color="secondary">{t('teraHint', { type: typeNameL(p.tera_type!, lang) })}</Text>
                        )}
                        <PartyDots side={side} />
                    </HStack>
                </VStack>
            </Card>
            {!back && chips}
        </VStack>
    )
}

/** HP 숫자. 누르면 현재/최대 ↔ % (선택은 저장된다) */
function HpValue({ p, mode }: { p: PokeView; mode: 'toggle' | 'percent' }) {
    const t = useBattleT()
    const asPercent = useBattleStore(s => s.hpAsPercent)
    const setAsPercent = useBattleStore(s => s.setHpAsPercent)
    const pct = `${pctOf(p)}%`
    if (mode === 'percent') {
        return <Text type="supporting" weight="medium" hasTabularNumbers>{pct}</Text>
    }
    const exact = `${p.hp}/${p.max_hp}`
    const shown = asPercent ? pct : exact
    return (
        <Button
            size="sm"
            variant="ghost"
            label={`${t('hpLabel', { hp: p.hp, max: p.max_hp })}, ${asPercent ? t('hpShowNumber') : t('hpShowPercent')}`}
            tooltip={asPercent ? t('hpShowNumber') : t('hpShowPercent')}
            onClick={() => setAsPercent(!asPercent)}
            // 터치 영역은 44px 그대로, 위아래로 겹쳐 HUD 높이는 줄인다
            className="-my-2.5 min-h-11 px-1.5 tabular-nums"
        >
            {shown}
        </Button>
    )
}

function PartyDots({ side }: { side: SideView }) {
    const lang = useLang()
    const t = useBattleT()
    const summary = side.team.map(p => `${nameOf(p, lang)} ${p.fainted ? t('fainted') : `${pctOf(p)}%`}`).join(', ')
    return (
        <HStack as="span" gap={1} vAlign="center" role="img" className="ml-auto shrink-0" aria-label={`${t('partyStatus')}: ${summary}`}>
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
        </HStack>
    )
}
