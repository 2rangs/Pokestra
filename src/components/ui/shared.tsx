/**
 * 여러 페이지가 함께 쓰는 작은 UI 조각 (Astryx 컴포넌트 기반).
 *
 * - PageTitle: 페이지 제목(Heading 1) + 설명
 * - SectionTitle: 섹션 제목(Heading 2) + 오른쪽 보조 내용
 * - StatBar: 능력치 막대
 * - Spinner: 로딩
 */
import type { ElementType, ReactNode } from 'react'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Spinner as AxSpinner } from '@astryxdesign/core/Spinner'
import { VStack } from '@astryxdesign/core/VStack'
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden'
import { cx } from './utils'

// ── 제목 ──

export function PageTitle({
    title,
    lead,
    note,
    children,
    className,
}: {
    title: ReactNode
    /** 제목 아래 한두 줄 설명 */
    lead?: ReactNode
    /** (예전 API) 제목 옆 보조 표시 */
    note?: ReactNode
    children?: ReactNode
    className?: string
}) {
    return (
        <header className={cx('mb-4 flex flex-col gap-1', className)}>
            <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Heading level={1}>{title}</Heading>
                {note && (
                    <Text type="supporting" color="secondary">
                        {note}
                    </Text>
                )}
            </span>
            {lead && (
                <Text as="p" color="secondary">
                    {lead}
                </Text>
            )}
            {children}
        </header>
    )
}

export function SectionTitle({
    children,
    aside,
    id,
    className,
}: {
    children: ReactNode
    /** (예전 API, 무시됨) */
    as?: ElementType
    /** 오른쪽 끝 (개수, 버튼 등) */
    aside?: ReactNode
    id?: string
    className?: string
}) {
    return (
        <span className={cx('mb-3 flex items-baseline justify-between gap-3', className)}>
            <span id={id}>
                <Heading level={2}>{children}</Heading>
            </span>
            {aside && (
                <Text type="supporting" color="secondary">
                    {aside}
                </Text>
            )}
        </span>
    )
}

// ── 능력치 막대 ──

/**
 * 0~max 막대 (SVG: 폭을 속성으로 그려 인라인 style 이 없다).
 * fillClass: 막대 색 유틸리티(예: statBandFill(value)). 기본은 강조색, highlight 가 아니면 조금 옅게.
 */
export function StatBar({
    value,
    max = 255,
    highlight,
    fillClass,
    className,
    label,
}: {
    value: number
    max?: number
    highlight?: boolean
    fillClass?: string
    className?: string
    label?: string
}) {
    const pct = Math.max(0, Math.min(100, (value / max) * 100))
    return (
        <svg
            className={cx('block h-2 w-full overflow-hidden rounded-full', className)}
            role="meter"
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-label={label}
        >
            <rect width="100%" height="100%" rx={4} className="fill-muted" />
            {pct > 0 && (
                <rect
                    width={`${pct}%`}
                    height="100%"
                    rx={4}
                    className={cx(fillClass ?? 'fill-accent', !highlight && !fillClass && 'opacity-70')}
                />
            )}
        </svg>
    )
}

// ── 상태 ──

export function Spinner({ label, className }: { label?: string; className?: string }) {
    return (
        <span role="status" className={cx('flex justify-center py-10', className)}>
            <AxSpinner size="lg" label={label} />
        </span>
    )
}


/** 로딩 중 첫 화면 골격. 높이를 미리 잡아 푸터가 밀리지 않게 하고, 로딩 문구는 스크린리더용으로 둔다. */
export function PageSkeleton({ label, heights = [160, 320, 320] }: { label: string; heights?: number[] }) {
    return (
        <VStack gap={6} role="status" aria-busy="true">
            <VisuallyHidden>{label}</VisuallyHidden>
            {heights.map((h, i) => (
                <Skeleton key={i} height={h} index={i} />
            ))}
        </VStack>
    )
}
