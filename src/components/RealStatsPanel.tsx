import type { ReactNode } from 'react'
import { Card } from '@astryxdesign/core/Card'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { useLang, useT } from '../i18n'
import { pokedexMessages } from '../i18n/messages/pokedex'
import { STAT_KEYS, getDexPokemon, statLabel } from '../lib/dex'
import { realStatRange } from '../lib/stats'

const LEVELS = [50, 100] as const

export default function RealStatsPanel({ dexId, note }: { dexId: number; note?: ReactNode }) {
    const lang = useLang()
    const t = useT(pokedexMessages)
    const dex = getDexPokemon(dexId)

    return (
        <Card>
            <section aria-labelledby="real-stats-title">
                <VStack gap={4}>
                    <HStack justify="between" vAlign="start" gap={3} wrap="wrap">
                        <VStack gap={1} className="min-w-0 flex-1">
                            <HStack gap={3} vAlign="center" wrap="wrap">
                                <Heading level={3} id="real-stats-title">
                                    {t('realStatsTitle')}
                                </Heading>
                                {note}
                            </HStack>
                            <Text type="supporting" as="p">
                                {t('realStatsNote')}
                            </Text>
                        </VStack>
                    </HStack>

                    {!dex ? (
                        <Text color="secondary" as="p">
                            {t('realStatsNoData')}
                        </Text>
                    ) : (
                        <>
                            {/* 표는 카드 여백만큼(12px) 사방으로 번져 나오므로, 두 표의 번짐(12+12)을 넘는 간격을 둬야 서로 붙지 않는다 (보이는 틈 16px) */}
                            <Grid columns={{ minWidth: 280, repeat: 'fit' }} gap={10}>
                                {LEVELS.map((lv) => (
                                    <span key={lv} className="block min-w-0">
                                        <Table density="compact" aria-label={`${t('realStatsTitle')} Lv.${lv}`}>
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
                                                {STAT_KEYS.map((k) => {
                                                    const base = dex.stats[k]
                                                    const r = realStatRange(k, base, lv)
                                                    return (
                                                        <TableRow key={k}>
                                                            <TableCell scope="row">
                                                                <Text weight="medium">{statLabel(k, lang)}</Text>
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
                        </>
                    )}
                </VStack>
            </section>
        </Card>
    )
}
