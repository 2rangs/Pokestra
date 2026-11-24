/**
 * 업데이트 소식(공지): 날짜별로 묶은 소식 목록, 최신부터. 종류(새 기능·개선·데이터·고침)로 거를 수 있다.
 * 들어오면 가장 최근 소식을 "본 것"으로 기록해 헤더의 새 소식 점을 끈다.
 */
import { useEffect } from 'react'
import { Heading } from '@astryxdesign/core/Heading'
import { Link } from '@astryxdesign/core/Link'
import { Text } from '@astryxdesign/core/Text'
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

/** 날짜를 "2026년" / "11월 24일"로 나눠 (날짜 칸에서 줄바꿈되지 않게) */
function dateParts(date: string, lang: Lang): { year: string; day: string } {
    const [y, m, d] = date.split('-').map(Number)
    const at = new Date(y, m - 1, d)
    return {
        year: new Intl.DateTimeFormat(lang, { year: 'numeric' }).format(at),
        day: new Intl.DateTimeFormat(lang, { month: 'long', day: 'numeric' }).format(at),
    }
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
        <VStack gap={4} className="mx-auto w-full max-w-4xl">
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
                // 타임라인: 데스크톱은 왼쪽 날짜(스크롤해도 따라옴) | 오른쪽 소식, 휴대폰은 날짜 아래 소식.
                // 카드 대신 구분선, 종류는 제목 위 작은 글자, 본문은 한 줄 길이를 줄이고 줄 간격을 넓혀 읽기 쉽게.
                <VStack gap={0} className="border-t border-border">
                    {days.map((day) => (
                        <section key={day} aria-labelledby={`day-${day}`} className="grid gap-x-8 border-b border-border py-6 md:grid-cols-[10rem_1fr]">
                            <VStack gap={0.5} className="mb-3 md:sticky md:top-16 md:mb-0 md:self-start">
                                <Text type="supporting" color="secondary">
                                    {dateParts(day, lang).year}
                                </Text>
                                <Heading level={2} id={`day-${day}`}>
                                    <time dateTime={day}>{dateParts(day, lang).day}</time>
                                </Heading>
                                <Text type="supporting" color="secondary">
                                    {day === UPDATES[0]?.date ? `${t('latest')} · ` : ''}
                                    {t('count', { n: shown.filter((u) => u.date === day).length })}
                                </Text>
                            </VStack>
                            <VStack gap={0} className="divide-y divide-border">
                                {shown
                                    .filter((u) => u.date === day)
                                    .map((u) => (
                                        <VStack key={u.id} as="article" gap={2} className="py-5 first:pt-0 last:pb-0">
                                            <Text type="supporting" weight="semibold" color="secondary">
                                                {t(KIND_KEY[u.kind])}
                                            </Text>
                                            <Heading level={3}>{u.title[lang]}</Heading>
                                            <ul className="flex max-w-prose list-disc flex-col gap-1.5 ps-5 marker:text-secondary">
                                                {u.items[lang].map((line) => (
                                                    <li key={line}>
                                                        <Text className="break-keep leading-relaxed">{line}</Text>
                                                    </li>
                                                ))}
                                            </ul>
                                            {u.link && (
                                                <Link href={u.link} weight="semibold" className="w-fit">
                                                    {t('go')} →
                                                </Link>
                                            )}
                                        </VStack>
                                    ))}
                            </VStack>
                        </section>
                    ))}
                </VStack>
            )}
        </VStack>
    )
}
