import { useId, useMemo, useState } from 'react'
import {
    getMove, getSpecies, parseShowdownTeam, exportShowdownTeam, PRNG, toId,
    type PokemonSet,
} from '@kyasi/pokebattle-engine'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Grid } from '@astryxdesign/core/Grid'
import { HStack } from '@astryxdesign/core/HStack'
import { VStack } from '@astryxdesign/core/VStack'
import { Icon } from '@astryxdesign/core/Icon'
import { IconButton } from '@astryxdesign/core/IconButton'
import { Selector, type SelectorOptionType } from '@astryxdesign/core/Selector'
import { Text } from '@astryxdesign/core/Text'
import { TextArea } from '@astryxdesign/core/TextArea'
import { Token } from '@astryxdesign/core/Token'
import { findDexPokemonByName, TYPES, damageClassName, type DexPokemon } from '../../lib/dex'
import {
    ITEMS, NATURES, buildSet, itemName, moveNameL, abilityNameL, natureName, typeNameL, dexIdOf,
    battleStatLabel,
} from '../../lib/battle'
import { pokemonLabel, stripAutoNickname } from '../../lib/battleLog'
import { pokemonImageCandidates } from '../../lib/images'
import { PokeImage } from '../../components/ui/PokeImage'
import { collator, useLang, useT, type Lang } from '../../i18n'
import { battleMessages } from '../../i18n/messages/battle'
import { PokemonSearch } from '../../components/battle/PokemonSearch'
import { TypeBadge } from '../../components/battle/TypeBadge'
import { TypeIconDot } from '../../components/ui/shared'

type BattleKey = keyof typeof battleMessages.ko

/** Selector 는 빈 문자열 값을 '선택 없음'으로 다루므로, '없음' 옵션은 따로 표시값을 둔다 */
const NONE = '__none'

const EV_PRESETS: { id: string; label: BattleKey; stats: [string, string]; evs: PokemonSet['evs'] }[] = [
    { id: 'phys', label: 'evPhys', stats: ['attack', 'speed'], evs: { attack: 252, speed: 252, hp: 4 } },
    { id: 'spec', label: 'evSpec', stats: ['special_attack', 'speed'], evs: { special_attack: 252, speed: 252, hp: 4 } },
    { id: 'bulky-phys', label: 'evBulkyPhys', stats: ['hp', 'defense'], evs: { hp: 252, defense: 252, special_defense: 4 } },
    { id: 'bulky-spec', label: 'evBulkySpec', stats: ['hp', 'special_defense'], evs: { hp: 252, special_defense: 252, defense: 4 } },
    { id: 'tank-atk', label: 'evTankAtk', stats: ['hp', 'attack'], evs: { hp: 252, attack: 252, special_defense: 4 } },
    { id: 'tank-spa', label: 'evTankSpa', stats: ['hp', 'special_attack'], evs: { hp: 252, special_attack: 252, special_defense: 4 } },
]

function evSummary(evs: PokemonSet['evs'], lang: Lang, none: string): string {
    return Object.entries(evs ?? {})
        .filter(([, v]) => (v ?? 0) > 0)
        .map(([k, v]) => `${battleStatLabel(k, lang)} ${v}`)
        .join(' / ') || none
}

function presetOf(evs: PokemonSet['evs']): string {
    const key = JSON.stringify(evs ?? {})
    return EV_PRESETS.find(p => JSON.stringify(p.evs) === key)?.id ?? ''
}

function moveMeta(m: { category: string; power: number | null }, lang: Lang) {
    return m.category === 'status' ? damageClassName('status', lang) : `${damageClassName(m.category, lang)} ${m.power ?? '-'}`
}

/** 포켓몬 그림 자리 (테두리 있는 작은 상자) */
function SpriteBox({ id, size = 'md' }: { id?: number; size?: 'sm' | 'md' }) {
    const box = size === 'md' ? 'h-16 w-16' : 'h-10 w-10'
    const px = size === 'md' ? 64 : 40
    return (
        <span className={`flex shrink-0 items-center justify-center rounded-md border border-border bg-muted ${box}`}>
            {id && <PokeImage sources={pokemonImageCandidates(id, px)} alt="" size={px} className="h-full w-full" />}
        </span>
    )
}

interface SlotEditorProps {
    slot: number
    bench: boolean
    set: PokemonSet
    onChange: (s: PokemonSet) => void
    onRemove: () => void
    onReroll: () => void
}

function SlotEditor({ slot, bench, set, onChange, onRemove, onReroll }: SlotEditorProps) {
    const lang = useLang()
    const t = useT(battleMessages)
    const [open, setOpen] = useState(false)
    const panelId = useId()
    const dex = findDexPokemonByName(set.species)
    const species = getSpecies(set.species)
    const id = dexIdOf(set.species)
    const name = pokemonLabel(set.species, set.nickname, lang)

    const moveOptions = useMemo<SelectorOptionType[]>(() => {
        const coll = collator(lang)
        const learnable = (dex?.moves ?? [])
            .map(n => getMove(n))
            .filter((m): m is NonNullable<typeof m> => !!m)
            .map(m => ({ m, label: moveNameL(m.name, lang) }))
            .sort((a, b) => coll.compare(a.label, b.label))
        return [
            { value: NONE, label: t('none') },
            ...learnable.map(({ m, label }) => ({
                value: m.name,
                label,
                description: `${typeNameL(m.type, lang)}, ${moveMeta(m, lang)}`,
                icon: <TypeIconDot type={m.type} className="h-4 w-4" />,
            })),
        ]
    }, [dex, lang, t])

    const itemOptions = useMemo<SelectorOptionType[]>(() => {
        const coll = collator(lang)
        return [
            { value: NONE, label: t('none') },
            ...ITEMS.map(i => ({ value: i.id, label: itemName(i.id, lang) })).sort((a, b) => coll.compare(a.label, b.label)),
        ]
    }, [lang, t])

    const setMove = (i: number, moveName: string) => {
        const moves = [...set.moves] as string[]
        moves[i] = moveName === NONE ? '' : moveName
        onChange({ ...set, moves: moves.filter(Boolean) as PokemonSet['moves'] })
    }

    const types = species?.types ?? dex?.types ?? []
    const moves = set.moves.filter(Boolean) as string[]

    return (
        <Card padding={3} aria-label={name}>
            <VStack gap={3}>
                <HStack gap={3} vAlign="start">
                    <SpriteBox id={id} />
                    <VStack gap={1} className="min-w-0 flex-1">
                        <HStack gap={2} vAlign="center" wrap="wrap">
                            <Text type="supporting" color="secondary" hasTabularNumbers>{slot}</Text>
                            <Text weight="semibold">{name}</Text>
                            <Text type="supporting" color="secondary">{t('level', { n: set.level })}</Text>
                            {types.map(ty => <TypeBadge key={ty} type={ty} size="xs" />)}
                            {bench && <Token size="sm" color="gray" label={t('bench')} />}
                        </HStack>
                        <HStack gap={3} vAlign="center" wrap="wrap">
                            <Text type="supporting" color="secondary">
                                {[abilityNameL(set.ability, lang), set.item ? itemName(set.item, lang) : t('noItem'), natureName(set.nature, lang)].join(', ')}
                            </Text>
                            {set.teraType && (
                                <HStack gap={1} vAlign="center">
                                    <Text type="supporting" color="secondary">{t('tera')}</Text>
                                    <TypeBadge type={set.teraType} size="xs" />
                                </HStack>
                            )}
                        </HStack>
                    </VStack>
                    <IconButton
                        label={t('removeNamed', { name })}
                        tooltip={t('remove')}
                        icon={<Icon icon="close" />}
                        variant="ghost"
                        size="sm"
                        onClick={onRemove}
                    />
                </HStack>

                {moves.length > 0 && (
                    <ul className="grid grid-cols-1 gap-x-3 gap-y-1 min-[420px]:grid-cols-2">
                        {moves.map(m => {
                            const md = getMove(m)
                            return (
                                <li key={m} className="flex min-w-0 items-center gap-1.5">
                                    {md && <TypeIconDot type={md.type} className="h-3.5 w-3.5" />}
                                    <Text type="supporting" maxLines={1}>{moveNameL(m, lang)}</Text>
                                </li>
                            )
                        })}
                    </ul>
                )}

                <HStack gap={2} wrap="wrap">
                    <Button
                        size="sm"
                        label={open ? t('collapse') : t('edit')}
                        aria-expanded={open}
                        aria-controls={panelId}
                        endContent={<Icon icon={open ? 'chevronDown' : 'chevronRight'} />}
                        onClick={() => setOpen(o => !o)}
                    />
                    <Button size="sm" variant="ghost" label={t('reroll')} tooltip={t('reroll')} onClick={onReroll}>
                        {t('rerollShort')}
                    </Button>
                </HStack>

                {open && (
                    <div id={panelId}>
                        <Grid columns={{ minWidth: 200 }} gap={3}>
                            <Selector
                                label={t('ability')}
                                width="100%"
                                value={set.ability}
                                onChange={v => onChange({ ...set, ability: v })}
                                options={(species?.abilities ?? []).map(a => ({
                                    value: a.name,
                                    label: `${abilityNameL(a.name, lang)}${a.hidden ? ` ${t('hiddenAbility')}` : ''}`,
                                }))}
                            />
                            <Selector
                                label={t('item')}
                                width="100%"
                                hasSearch
                                value={set.item || NONE}
                                onChange={v => onChange({ ...set, item: v === NONE ? undefined : v })}
                                options={itemOptions}
                            />
                            <Selector
                                label={t('nature')}
                                width="100%"
                                hasSearch
                                value={set.nature}
                                onChange={v => onChange({ ...set, nature: v as PokemonSet['nature'] })}
                                options={NATURES.map(n => ({
                                    value: n.id,
                                    label: natureName(n.id, lang),
                                    description: n.up ? `+${battleStatLabel(n.up, lang)} −${battleStatLabel(n.down!, lang)}` : undefined,
                                }))}
                            />
                            <Selector
                                label={t('teraType')}
                                width="100%"
                                value={set.teraType || NONE}
                                onChange={v => onChange({ ...set, teraType: v === NONE ? undefined : v })}
                                options={[
                                    { value: NONE, label: t('none') },
                                    ...[...TYPES.map(ty => ty.name), 'stellar'].map(ty => ({
                                        value: ty,
                                        label: typeNameL(ty, lang),
                                        icon: <TypeIconDot type={ty} className="h-4 w-4" />,
                                    })),
                                ]}
                            />
                            <Selector
                                label={t('evs')}
                                width="100%"
                                value={presetOf(set.evs)}
                                placeholder={evSummary(set.evs, lang, t('noEvs'))}
                                onChange={v => {
                                    const p = EV_PRESETS.find(x => x.id === v)
                                    if (p) onChange({ ...set, evs: p.evs })
                                }}
                                options={EV_PRESETS.map(p => ({
                                    value: p.id,
                                    label: t(p.label, { a: battleStatLabel(p.stats[0], lang), b: battleStatLabel(p.stats[1], lang) }),
                                }))}
                            />
                            {[0, 1, 2, 3].map(i => (
                                <Selector
                                    key={i}
                                    label={t('moveN', { n: i + 1 })}
                                    width="100%"
                                    hasSearch
                                    value={set.moves[i] || NONE}
                                    onChange={v => setMove(i, v)}
                                    options={moveOptions}
                                />
                            ))}
                        </Grid>
                    </div>
                )}
            </VStack>
        </Card>
    )
}

/** 비어 있는 자리 */
function EmptySlot({ slot }: { slot: number }) {
    const t = useT(battleMessages)
    return (
        <Card padding={3} variant="transparent" className="border-dashed">
            <HStack gap={3} vAlign="center">
                <SpriteBox size="sm" />
                <Text type="supporting" color="secondary" hasTabularNumbers>{slot}</Text>
                <Text type="supporting" color="secondary">{t('emptySlot')}</Text>
            </HStack>
        </Card>
    )
}

interface TeamBuilderProps {
    team: PokemonSet[]
    onChange: (team: PokemonSet[]) => void
    onRandom: () => void
    maxSize?: number
    /** 이 수를 넘는 자리는 '대기'로 표시한다 */
    activeCount?: number
}

export function TeamBuilder({ team, onChange, onRandom, maxSize = 6, activeCount = maxSize }: TeamBuilderProps) {
    const t = useT(battleMessages)
    const [ioOpen, setIoOpen] = useState(false)
    const [text, setText] = useState('')
    const [ioError, setIoError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const ioId = useId()

    // 자동 닉네임은 붙이지 않는다 → 이름은 화면 언어를 따른다
    const fresh = (p: DexPokemon, level?: number) => stripAutoNickname(buildSet(p, new PRNG(Date.now()), level))

    const add = (p: DexPokemon) => {
        if (team.length >= maxSize) return
        onChange([...team, fresh(p)])
    }

    const importText = () => {
        try {
            const parsed = parseShowdownTeam(text).slice(0, 6).map(s => {
                const sp = getSpecies(s.species) ?? getSpecies(toId(s.species))
                if (!sp) throw new Error(t('unknownPokemon', { name: s.species }))
                return stripAutoNickname({ ...s, species: sp.name, ability: s.ability || sp.abilities[0]?.name || '' })
            })
            if (parsed.length === 0) throw new Error(t('nothingToImport'))
            onChange(parsed)
            setIoError(null)
            setIoOpen(false)
        } catch (err) {
            setIoError((err as Error).message)
        }
    }

    const copy = () => {
        navigator.clipboard?.writeText(text).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        }).catch(() => {})
    }

    const empties = Array.from({ length: Math.max(0, maxSize - team.length) }, (_, i) => team.length + i + 1)

    return (
        <VStack gap={4}>
            <HStack gap={2} vAlign="center" wrap="wrap">
                <div className="w-full sm:w-auto sm:min-w-[240px] sm:flex-1">
                    {team.length < maxSize
                        ? <PokemonSearch onPick={add} placeholder={t('addPokemon', { n: team.length, max: maxSize })} />
                        : <Text color="secondary">{t('teamFull', { n: maxSize })}</Text>}
                </div>
                <Button label={t('randomTeam')} onClick={onRandom} />
                <Button
                    label={t('showdownIO')}
                    variant="ghost"
                    aria-expanded={ioOpen}
                    aria-controls={ioId}
                    onClick={() => { setText(exportShowdownTeam(team.map(stripAutoNickname))); setIoOpen(o => !o); setIoError(null) }}
                />
                {team.length > 0 && <Button label={t('clearTeam')} variant="ghost" onClick={() => onChange([])} />}
            </HStack>

            {ioOpen && (
                <div id={ioId}>
                    <Card padding={3} variant="muted">
                        <VStack gap={2}>
                            <TextArea
                                label={t('showdownIO')}
                                isLabelHidden
                                value={text}
                                onChange={v => setText(v)}
                                rows={10}
                                hasSpellCheck={false}
                                status={ioError ? { type: 'error', message: ioError } : undefined}
                                statusVariant="detached"
                                placeholder={'Garchomp @ Choice Scarf\nAbility: Rough Skin\nEVs: 252 Atk / 4 SpD / 252 Spe\nJolly Nature\n- Earthquake\n- Dragon Claw'}
                                controlClassName="font-mono"
                            />
                            <HStack gap={2}>
                                <Button label={t('importTeam')} variant="primary" onClick={importText} />
                                <Button label={copied ? t('copied') : t('copy')} icon={<Icon icon={copied ? 'checkDouble' : 'copy'} />} onClick={copy} />
                                <span className="sr-only" aria-live="polite">{copied ? t('copied') : ''}</span>
                            </HStack>
                        </VStack>
                    </Card>
                </div>
            )}

            {team.length === 0 && <Text as="p" color="secondary">{t('emptyTeam')}</Text>}

            <ol className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {team.map((s, i) => (
                    <li key={`${s.species}-${i}`} className="min-w-0">
                        <SlotEditor
                            slot={i + 1}
                            bench={i >= activeCount}
                            set={s}
                            onChange={ns => onChange(team.map((x, j) => (j === i ? ns : x)))}
                            onRemove={() => onChange(team.filter((_, j) => j !== i))}
                            onReroll={() => {
                                const dex = findDexPokemonByName(s.species)
                                if (dex) onChange(team.map((x, j) => (j === i ? fresh(dex, s.level) : x)))
                            }}
                        />
                    </li>
                ))}
                {empties.map(n => <li key={`empty-${n}`} className="min-w-0"><EmptySlot slot={n} /></li>)}
            </ol>
        </VStack>
    )
}
