import type { ReactNode } from 'react'
import { calcBaseStat, calcHP, getSpecies } from '@kyasi/pokebattle-engine'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { VStack } from '@astryxdesign/core/VStack'
import { useLang, useT } from '../i18n'
import { pokedexMessages } from '../i18n/messages/pokedex'
import { abilityNameL, battleStatLabel, useEngineReady } from '../lib/battle'
import { ABILITY_BY_NAME, getDexPokemon } from '../lib/dex'

const KEYS = ['hp', 'attack', 'defense', 'special_attack', 'special_defense', 'speed'] as const
type Key = typeof KEYS[number]
const LEVELS = [50, 100] as const

/** min: 0 IV / 0 EV / 하락 성격, neutral: 31 IV / 0 EV / 무보정, max: 31 IV / 252 EV / 상승 성격 */
function realStats(base: number, key: Key, level: number) {
    if (key === 'hp') {
        // 껍질몬(HP 종족값 1)은 항상 1
        if (base === 1) return { min: 1, neutral: 1, max: 1 }
        return { min: calcHP(base, level, 0, 0), neutral: calcHP(base, level, 31, 0), max: calcHP(base, level, 31, 252) }
    }
    return {
        min: calcBaseStat(base, level, 0, 0, 0.9),
        neutral: calcBaseStat(base, level, 31, 0, 1),
        max: calcBaseStat(base, level, 31, 252, 1.1),
    }
}

export default function BattleStatsPanel({ dexId, note }: { dexId: number; note?: ReactNode }) {
    const lang = useLang()
    const t = useT(pokedexMessages)
    const { ready, error } = useEngineReady()
    const dex = getDexPokemon(dexId)
    const species = ready && dex ? getSpecies(dex.name) : undefined

    return (
        <Card>
            <section aria-labelledby="battle-stats-title">
                <VStack gap={4}>
                    <HStack justify="between" vAlign="start" gap={3} wrap="wrap">
                        <VStack gap={1} className="min-w-0 flex-1">
                            <HStack gap={3} vAlign="center" wrap="wrap">
                                <Heading level={3} id="battle-stats-title">
                                    {t('battleTitle')}
                                </Heading>
                                {note}
                            </HStack>
                            <Text type="supporting" as="p">
                                {t('battleNote')}
                            </Text>
                        </VStack>
                        {dex && species && (
                            <Button href={`/calc?atk=${encodeURIComponent(dex.name)}`} variant="primary" label={t('openInCalc')} />
                        )}
                    </HStack>

                    {error ? (
                        <Banner status="error" title={t('battleLoadError')} />
                    ) : !ready ? (
                        <VStack gap={2} role="status" aria-live="polite">
                            <span className="sr-only">{t('battleLoading')}</span>
                            {[0, 1, 2].map((i) => (
                                <Skeleton key={i} height={32} index={i} />
                            ))}
                        </VStack>
                    ) : !species ? (
                        <Text color="secondary" as="p">
                            {t('battleNoData')}
                        </Text>
                    ) : (
                        <>
                            <Grid columns={{ minWidth: 280, repeat: 'fit' }} gap={4}>
                                {LEVELS.map((lv) => (
                                    <span key={lv} className="block min-w-0 overflow-x-auto">
                                        <Table density="compact" aria-label={`${t('battleTitle')} Lv.${lv}`}>
                                            <TableHeader>
                                                <TableRow isHeaderRow>
                                                    <TableHeaderCell scope="col">Lv.{lv}</TableHeaderCell>
                                                    <TableHeaderCell scope="col" className="text-right">{t('colBase')}</TableHeaderCell>
                                                    <TableHeaderCell scope="col" className="text-right">{t('colMin')}</TableHeaderCell>
                                                    <TableHeaderCell scope="col" className="text-right">{t('colNeutral')}</TableHeaderCell>
                                                    <TableHeaderCell scope="col" className="text-right">{t('colMax')}</TableHeaderCell>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {KEYS.map((k) => {
                                                    const base = species.base_stats[k]
                                                    const r = realStats(base, k, lv)
                                                    return (
                                                        <TableRow key={k}>
                                                            <TableCell scope="row">
                                                                <Text weight="medium">{battleStatLabel(k, lang)}</Text>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Text color="secondary" hasTabularNumbers>{base}</Text>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Text color="secondary" hasTabularNumbers>{r.min}</Text>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Text hasTabularNumbers>{r.neutral}</Text>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Text weight="semibold" hasTabularNumbers>{r.max}</Text>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </span>
                                ))}
                            </Grid>
                            <Text type="supporting" as="p">
                                {t('hpNatureNote')}
                            </Text>

                            <VStack gap={2}>
                                <Heading level={4}>{t('engineAbilities')}</Heading>
                                <HStack gap={2} wrap="wrap">
                                    {species.abilities.map((a) => {
                                        const label = abilityNameL(a.name, lang)
                                        return (
                                            <Token
                                                key={a.name}
                                                label={label}
                                                color={a.hidden ? 'purple' : 'default'}
                                                href={ABILITY_BY_NAME.has(a.name) ? `/abilities/${a.name}` : undefined}
                                                endContent={a.hidden ? <Text type="supporting" color="inherit">{t('hiddenAbility')}</Text> : undefined}
                                            />
                                        )
                                    })}
                                </HStack>
                            </VStack>
                        </>
                    )}
                </VStack>
            </section>
        </Card>
    )
}
