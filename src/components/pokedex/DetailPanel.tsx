/** 상세 화면 공용 조각: 제목 있는 카드, 골격 줄, 불러오기 실패 배너, 정의 목록(ⓘ 포함) */
import type { ReactNode } from "react"
import { Banner } from "@astryxdesign/core/Banner"
import { Button } from "@astryxdesign/core/Button"
import { Card } from "@astryxdesign/core/Card"
import { Heading } from "@astryxdesign/core/Heading"
import { HStack } from "@astryxdesign/core/HStack"
import { InfoTip } from "@astryxdesign/core/InfoTip"
import { Skeleton } from "@astryxdesign/core/Skeleton"
import { Text } from "@astryxdesign/core/Text"
import { VStack } from "@astryxdesign/core/VStack"

export function Panel({ title, titleNote, className, children }: { title?: string; titleNote?: ReactNode; className?: string; children: ReactNode }) {
    return (
        <Card className={className}>
            <section>
                <VStack gap={3}>
                    {title && (
                        <HStack gap={2} vAlign="center" wrap="wrap">
                            <Heading level={2}>{title}</Heading>
                            {titleNote}
                        </HStack>
                    )}
                    {children}
                </VStack>
            </section>
        </Card>
    )
}

export function SkeletonRows({ n = 4 }: { n?: number }) {
    return (
        <VStack gap={2}>
            {Array.from({ length: n }, (_, i) => (
                <Skeleton key={i} height={24} index={i} />
            ))}
        </VStack>
    )
}

export function LoadError({ message, onRetry, retryLabel }: { message: string; onRetry?: () => void; retryLabel: string }) {
    return (
        <Banner
            status="error"
            title={message}
            endContent={onRetry ? <Button size="sm" label={retryLabel} onClick={onRetry} /> : undefined}
        />
    )
}

export interface Fact {
    label: string
    value: ReactNode
    /** 라벨 옆 ⓘ (탭·포커스·호버로 열린다) */
    hint?: { content: string; label: string }
}

/** 정의 목록: 라벨 칸 고정 폭(값이 한 줄로 정렬), 라벨 흐리게 · 값 진하게 */
export function FactList({ facts }: { facts: readonly Fact[] }) {
    return (
        <VStack as="dl" gap={2}>
            {facts.map((f) => (
                <HStack key={f.label} gap={3} vAlign="start">
                    <HStack as="dt" gap={1} vAlign="center" className="min-h-6 w-28 shrink-0">
                        <Text color="secondary">{f.label}</Text>
                        {f.hint && <InfoTip content={f.hint.content} label={f.hint.label} size="xsm" />}
                    </HStack>
                    <HStack as="dd" gap={1} vAlign="center" wrap="wrap" className="min-h-6 min-w-0 flex-1">
                        {typeof f.value === "string" || typeof f.value === "number" ? <Text hasTabularNumbers>{f.value}</Text> : f.value}
                    </HStack>
                </HStack>
            ))}
        </VStack>
    )
}
