// ─── 필드 위 포켓몬 HUD ─────────────────────────────────────
// 프레임의 SideView 만 받는다 (리플레이 화면에서도 같은 HUD 를 쓴다).
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { HStack } from '@astryxdesign/core/HStack'
import { VStack } from '@astryxdesign/core/VStack'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { Tooltip } from '@astryxdesign/core/Tooltip'
import { battleStatLabel, dexIdOf, typeNameL, spriteUrl, backSpriteUrl, artworkUrl } from '../../../lib/battle'
import { statusLongName, volatileName } from '../../../lib/battleLog'
import { stageMultiplier } from '../../../lib/battleHud'
import { useLang } from '../../../i18n'
import { useBattleStore } from '../../../stores/battleStore'
import { TypeBadge } from '../../../components/battle/TypeBadge'
import { PokeImage } from '../../../components/ui/PokeImage'
import { cx } from '../../../components/ui/utils'
import type { PokeView, SideView } from '../useBattleSession'
import { HpBar, StatusToken } from './common'
import { nameOf, pctOf, useBattleT } from './util'

export interface CombatantProps {
    side: SideView
    /** 뒷모습 (우리 편: 스프라이트가 왼쪽) */
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

    return (
        <section aria-label={name} className="w-full min-w-0 sm:max-w-md">
            <Card padding={2}>
                <HStack gap={2} vAlign="center">
                    {back && <Sprite p={p} back />}
                    <VStack gap={0.5} className="min-w-0 flex-1">
                        <HStack gap={1.5} vAlign="center" wrap="wrap">
                            <Text weight="semibold" maxLines={1}>{name}</Text>
                            <Text type="supporting" color="secondary">{t('level', { n: p.level })}</Text>
                            {p.status && <StatusToken status={p.status} lang={lang} />}
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
                            </HStack>
                        </HStack>
                        <HStack gap={2} vAlign="center" className="min-h-11">
                            <span className="min-w-0 flex-1">
                                <HpBar p={p} label={hpMode === 'percent' ? t('hpPercent', { pct: pctOf(p) }) : t('hpLabel', { hp: p.hp, max: p.max_hp })} />
                            </span>
                            <HpValue p={p} mode={hpMode} />
                            <PartyDots side={side} />
                        </HStack>
                        {(stages.length > 0 || volatiles.length > 0) && (
                            <HStack gap={1} wrap="wrap">
                                {stages.map(([k, v]) => {
                                    const label = `${battleStatLabel(k, lang)} ${v > 0 ? `+${v}` : v}`
                                    const tip = t('stageTip', { stat: battleStatLabel(k, lang), x: stageMultiplier(k, v) })
                                    return (
                                        <Tooltip key={k} content={tip}>
                                            <Token size="sm" color={v > 0 ? 'blue' : 'red'} label={label} description={tip} />
                                        </Tooltip>
                                    )
                                })}
                                {volatiles.map(([v, n]) => <Token key={v} size="sm" color="purple" label={n!} />)}
                            </HStack>
                        )}
                    </VStack>
                    {!back && <Sprite p={p} back={false} />}
                </HStack>
            </Card>
        </section>
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
            className="min-h-11 px-1.5 tabular-nums"
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
        <span className="flex shrink-0 gap-1" role="img" aria-label={`${t('partyStatus')}: ${summary}`}>
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
    // 휴대폰은 작게 (기술 버튼이 첫 화면에 들어오도록)
    const box = 'h-12 w-12 shrink-0 sm:h-24 sm:w-24'
    if (!id) return <span className={box} />
    // 후보 순서: 뒷모습 도트 → 도트 → 공식 일러스트 (표시 크기가 커도 도트 우선이라 직접 구성)
    const sources = back ? [backSpriteUrl(id), spriteUrl(id), artworkUrl(id)] : [spriteUrl(id), artworkUrl(id)]
    return (
        <PokeImage
            key={p.id}
            sources={sources}
            alt={nameOf(p, lang)}
            size={96}
            className={cx(box, 'transition-all duration-300', p.fainted ? 'translate-y-4 opacity-0' : 'opacity-100')}
        />
    )
}
