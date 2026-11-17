import { useMemo } from 'react'
import { getSpecies, type BattlePokemon, type Nature, type PrimaryStatus } from '@kyasi/pokebattle-engine'
import { Card } from '@astryxdesign/core/Card'
import { Heading } from '@astryxdesign/core/Heading'
import { Icon } from '@astryxdesign/core/Icon'
import { NumberInput } from '@astryxdesign/core/NumberInput'
import { Selector } from '@astryxdesign/core/Selector'
import { Slider } from '@astryxdesign/core/Slider'
import { Switch } from '@astryxdesign/core/Switch'
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { ITEMS, NATURES, abilityNameL, itemName, natureName, typeNameL } from '../../lib/battle'
import { displayName, findDexPokemonByName, officialArtworkUrl, type DexPokemon } from '../../lib/dex'
import { collator, formatNumber, useLang, useT } from '../../i18n'
import { calcMessages } from '../../i18n/messages/calc'
import { TypeTag } from '../ui/shared'
import {
    EV_TOTAL_MAX, STATUS_IDS, STAT_ORDER, TERA_TYPES, clampEv, evTotal, stagedStats,
    type CalcStatKey, type SideState, type StageKey,
} from './calcState'
import { PokemonPicker } from './PokemonPicker'

type Props = {
    role: 'atk' | 'def'
    state: SideState
    bp: BattlePokemon
    onChange: (next: SideState) => void
    onPick: (p: DexPokemon) => void
}

const NONE = 'none'
const STAGES = Array.from({ length: 13 }, (_, i) => 6 - i)
const fmtStage = (n: number) => (n > 0 ? `+${n}` : String(n))
const STAGE_OPTIONS = STAGES.map(s => ({ value: String(s), label: fmtStage(s) }))

export function SidePanel({ role, state, bp, onChange, onPick }: Props) {
    const lang = useLang()
    const t = useT(calcMessages)
    const dex = findDexPokemonByName(state.slug)
    const species = getSpecies(state.slug)
    const abilities = species?.abilities ?? []
    const nature = NATURES.find(n => n.id === state.nature)
    const real = stagedStats(bp)
    const total = evTotal(state.evs)
    const isAtk = role === 'atk'
    const sideLabel = isAtk ? t('attacker') : t('defender')
    const name = dex ? displayName(dex, lang) : state.slug
    const statName = (k: CalcStatKey) => t(`stat_${k}`)
    const titleId = `calc-${role}-title`

    const set = <K extends keyof SideState>(key: K, value: SideState[K]) => onChange({ ...state, [key]: value })

    const setEv = (k: CalcStatKey, raw: number) =>
        onChange({ ...state, evs: { ...state.evs, [k]: clampEv(state.evs, k, raw) } })
    const setIv = (k: CalcStatKey, raw: number) =>
        onChange({ ...state, ivs: { ...state.ivs, [k]: Math.max(0, Math.min(31, Math.round(Number.isFinite(raw) ? raw : 0))) } })
    const setStage = (k: StageKey, v: number) => onChange({ ...state, stages: { ...state.stages, [k]: v } })

    const itemOptions = useMemo(() => {
        const ids = ITEMS.map(i => i.id)
        if (state.item && !ids.includes(state.item)) ids.push(state.item)
        const c = collator(lang)
        const sorted = ids.map(id => ({ value: id, label: itemName(id, lang) })).sort((a, b) => c.compare(a.label, b.label))
        return [{ value: NONE, label: t('none') }, ...sorted]
    }, [state.item, lang, t])

    const natureOptions = useMemo(() => {
        const c = collator(lang)
        return NATURES
            .map(n => {
                const base = natureName(n.id, lang)
                const description = n.up && n.down
                    ? t('natureUpDown', { up: t(`stat_${n.up as StageKey}`), down: t(`stat_${n.down as StageKey}`) })
                    : t('natureNeutral')
                return { value: n.id, label: base, description }
            })
            .sort((a, b) => c.compare(a.label, b.label))
    }, [lang, t])

    const abilityOptions = (state.ability && !abilities.some(a => a.name === state.ability)
        ? [{ name: state.ability, hidden: false, slot: 0 }, ...abilities]
        : abilities
    ).map(a => ({
        value: a.name,
        label: abilityNameL(a.name, lang),
        description: a.hidden ? t('hiddenAbility') : undefined,
    }))

    const statusOptions = [{ value: NONE, label: t('none') }, ...STATUS_IDS.map(s => ({ value: s, label: t(`status_${s}`) }))]
    const teraOptions = TERA_TYPES.map(x => ({ value: x, label: typeNameL(x, lang) }))

    return (
        <Card role="region" aria-labelledby={titleId} className="min-w-0">
            <VStack gap={4}>
                {/* 포켓몬 정보 */}
                <div className="flex items-center gap-4">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-muted">
                        {dex && <img src={officialArtworkUrl(dex.id)} alt={name} className="h-20 w-20 object-contain" />}
                    </div>
                    <VStack gap={1} className="min-w-0">
                        <Text type="supporting" color="secondary">{sideLabel}</Text>
                        <span id={titleId}>
                            <Heading level={2} maxLines={1}>{name}</Heading>
                        </span>
                        {dex && dex.id < 10000 && (
                            <Text type="supporting" color="secondary" hasTabularNumbers>No. {String(dex.id).padStart(4, '0')}</Text>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5">
                            {bp.types.filter((x): x is string => !!x).map(x => <TypeTag key={x} type={x} size="sm" />)}
                            {state.tera && <Text type="supporting" color="accent">{t('terastallize')}</Text>}
                        </div>
                    </VStack>
                </div>

                <PokemonPicker current={dex} sideLabel={sideLabel} onPick={onPick} />

                {/* 세팅 */}
                <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                    <NumberInput
                        label={t('level')} width="100%" min={1} max={100} step={1} isIntegerOnly
                        value={state.level}
                        onChange={v => set('level', Math.max(1, Math.min(100, Math.round(Number(v) || 1))))}
                    />
                    <Selector
                        label={t('nature')} width="100%" hasSearch options={natureOptions}
                        value={state.nature}
                        onChange={v => set('nature', v as Nature)}
                    />
                    <Selector
                        label={t('ability')} width="100%" options={abilityOptions}
                        value={state.ability}
                        onChange={v => set('ability', v)}
                    />
                    <Selector
                        label={t('item')} width="100%" hasSearch options={itemOptions}
                        value={state.item || NONE}
                        onChange={v => set('item', v === NONE ? '' : v)}
                    />
                    <Selector
                        label={t('status')} width="100%" options={statusOptions}
                        value={state.status ?? NONE}
                        onChange={v => set('status', (v === NONE ? null : v) as PrimaryStatus)}
                    />
                    <VStack gap={2}>
                        <Selector
                            label={t('teraType')} width="100%" hasSearch options={teraOptions}
                            value={state.teraType}
                            onChange={v => set('teraType', v)}
                        />
                        <Switch size="sm" label={t('terastallize')} value={state.tera} onChange={v => set('tera', v)} />
                    </VStack>
                </div>

                {!isAtk && (
                    <Slider
                        label={t('currentHp', { pct: state.hpPct, hp: bp.hp, max: bp.max_hp })}
                        min={1} max={100} step={1} value={state.hpPct} valueDisplay="none" width="100%"
                        onChange={(v: number) => set('hpPct', v)}
                    />
                )}

                {/* 능력치 */}
                <div className="min-w-0">
                    <Table density="compact" dividers="rows" aria-label={t('statsCaption')}>
                        <TableHeader>
                            <TableRow isHeaderRow>
                                <TableHeaderCell scope="col">{t('colStat')}</TableHeaderCell>
                                <TableHeaderCell scope="col">
                                    <span className="whitespace-nowrap">
                                        {t('colEvs')}{' '}
                                        <span className={`tabular-nums ${total >= EV_TOTAL_MAX ? 'text-error' : 'text-secondary'}`}>
                                            {formatNumber(total, lang)}/{formatNumber(EV_TOTAL_MAX, lang)}
                                        </span>
                                    </span>
                                </TableHeaderCell>
                                <TableHeaderCell scope="col">{t('colIv')}</TableHeaderCell>
                                <TableHeaderCell scope="col">{t('colStage')}</TableHeaderCell>
                                <TableHeaderCell scope="col" className="text-right">{t('colReal')}</TableHeaderCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {STAT_ORDER.map(k => {
                                const up = nature?.up === k
                                const down = nature?.down === k
                                const base = species?.base_stats[k] ?? 0
                                const label = statName(k)
                                return (
                                    <TableRow key={k}>
                                        <TableCell>
                                            <span className="flex flex-col leading-tight">
                                                <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
                                                    <Text weight="semibold">{label}</Text>
                                                    {up && <Icon icon="arrowUp" size="xsm" className="text-error" aria-label={t('natureUp')} role="img" />}
                                                    {down && <Icon icon="arrowDown" size="xsm" className="text-info" aria-label={t('natureDown')} role="img" />}
                                                </span>
                                                <span title={t('baseStat', { n: base })}>
                                                    <Text type="supporting" color="secondary" hasTabularNumbers>{base}</Text>
                                                </span>
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="hidden w-24 min-w-0 sm:block">
                                                    <Slider
                                                        label={t('evAria', { stat: label })} isLabelHidden valueDisplay="none"
                                                        min={0} max={252} step={4} value={state.evs[k]} width="100%"
                                                        onChange={(v: number) => setEv(k, v)}
                                                    />
                                                </div>
                                                <NumberInput
                                                    label={t('evAria', { stat: label })} isLabelHidden size="sm" width="4.25rem"
                                                    min={0} max={252} step={4} isIntegerOnly value={state.evs[k]}
                                                    onChange={v => setEv(k, Number(v))}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <NumberInput
                                                label={t('ivAria', { stat: label })} isLabelHidden size="sm" width="3.5rem"
                                                min={0} max={31} isIntegerOnly value={state.ivs[k]}
                                                onChange={v => setIv(k, Number(v))}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {k === 'hp' ? <Text color="disabled" aria-hidden>-</Text> : (
                                                <Selector
                                                    label={t('stageAria', { stat: label })} isLabelHidden size="sm" width="4.5rem"
                                                    options={STAGE_OPTIONS}
                                                    value={String(state.stages[k])}
                                                    onChange={v => setStage(k, Number(v))}
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className={up ? 'text-error' : down ? 'text-info' : 'text-primary'}>
                                                <Text weight="bold" color="inherit" hasTabularNumbers>{real[k]}</Text>
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            </VStack>
        </Card>
    )
}
