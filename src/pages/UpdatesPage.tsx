/**
 * 업데이트 소식(공지): 날짜별로 묶은 소식 목록, 최신부터. 종류(새 기능·개선·데이터·고침)로 거를 수 있다.
 * 들어오면 가장 최근 소식을 "본 것"으로 기록해 헤더의 새 소식 점을 끈다.
 */
import { useEffect } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { List, ListItem } from '@astryxdesign/core/List'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { VStack } from '@astryxdesign/core/VStack'
import { EmptyState, PageHeader, Segmented } from '../components/dex/DexUi'
import { useUrlParams } from '../components/dex/useUrlParams'
import { LATEST_UPDATE_ID, UPDATES, type UpdateKind } from '../data/updates'
import { type Lang, useDocumentTitle, useLang, useT } from '../i18n'
import { updatesMessages } from '../i18n/messages/updates'
import { useUpdatesStore } from '../stores/updatesStore'

type Filter = 'all' | UpdateKind
const FILTERS: readonly Filter[] = ['all', 'new', 'improve', 'data', 'fix']
const KIND_KEY = { all: 'kindAll', new: 'kindNew', improve: 'kindImprove', data: 'kindData', fix: 'kindFix' } as const

function formatDate(date: string, lang: Lang): string {
    const [y, m, d] = date.split('-').map(Number)
    return new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(y, m - 1, d))
}

export default function UpdatesPage() {
    const lang = useLang()
    const t = useT(updatesMessages)
    useDocumentTitle(t('title'))
    const markSeen = useUpdatesStore((s) => s.markSeen)
    useEffect(() => markSeen(LATEST_UPDATE_ID), [markSeen])

    const [params, update] = useUrlParams()
    const kind = (FILTERS as readonly string[]).includes(params.get('kind') ?? '') ? (params.get('kind') as Filter) : 'all'
    const shown = UPDATES.filter((u) => kind === 'all' || u.kind === kind)
    const days = [...new Set(shown.map((u) => u.date))]

    return (
        <VStack gap={5} className="mx-auto w-full max-w-3xl">
            <PageHeader title={t('title')} subtitle={t('lead')}>
                <Segmented<Filter>
                    label={t('filter')}
                    isLabelHidden
                    value={kind}
                    onChange={(v) => update({ kind: v === 'all' ? null : v })}
                    options={FILTERS.map((f) => ({ value: f, label: t(KIND_KEY[f]) }))}
                />
            </PageHeader>

            {shown.length === 0 ? (
                <EmptyState title={t('empty')} />
            ) : (
                days.map((day) => (
                    <VStack key={day} as="section" gap={2} aria-labelledby={`day-${day}`}>
                        <HStack gap={2} vAlign="center">
                            <Heading level={2} id={`day-${day}`}>
                                <time dateTime={day}>{formatDate(day, lang)}</time>
                            </Heading>
                            {day === UPDATES[0]?.date && <Token size="sm" label={t('latest')} />}
                        </HStack>
                        <VStack gap={2}>
                            {shown
                                .filter((u) => u.date === day)
                                .map((u) => (
                                    <Card key={u.id} padding={4} className="max-sm:p-3">
                                        <VStack as="article" gap={2}>
                                            <HStack gap={2} vAlign="center" wrap="wrap">
                                                <Token size="sm" label={t(KIND_KEY[u.kind])} />
                                                <Heading level={3}>
                                                    {u.title[lang]}
                                                </Heading>
                                            </HStack>
                                            <List density="compact" listStyle="disc" edge="flush">
                                                {u.items[lang].map((line) => (
                                                    <ListItem key={line} label={<Text className="break-keep">{line}</Text>} />
                                                ))}
                                            </List>
                                            {u.link && (
                                                <HStack>
                                                    <Button size="sm" variant="ghost" href={u.link} label={t('go')} endContent={<Icon icon="chevronRight" />} />
                                                </HStack>
                                            )}
                                        </VStack>
                                    </Card>
                                ))}
                        </VStack>
                    </VStack>
                ))
            )}
        </VStack>
    )
}
