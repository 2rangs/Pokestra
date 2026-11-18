/**
 * 여러 페이지가 함께 쓰는 작은 UI 조각 (Astryx 컴포넌트 기반).
 *
 * - PageTitle: 페이지 제목(Heading 1) + 설명
 * - SectionTitle: 섹션 제목(Heading 2) + 오른쪽 보조 내용
 * - TypeTag / TypeIconDot: 포켓몬 타입 아이콘 + 이름
 * - StatBar: 능력치 막대
 * - Spinner: 로딩
 */
import type { ElementType, ReactNode } from 'react'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Spinner as AxSpinner } from '@astryxdesign/core/Spinner'
import { VStack } from '@astryxdesign/core/VStack'
import { useLang } from '../../i18n'
import { typeName } from '../../lib/dex'
import { cx, typeColor } from './utils'

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
        <header className={cx('mb-6 flex flex-col gap-1', className)}>
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

// ── 타입 ──

const KNOWN_TYPE_ICONS = new Set([
    'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
    'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
])

export function TypeIconDot({ type, className = 'h-4 w-4' }: { type: string; className?: string }) {
    if (!KNOWN_TYPE_ICONS.has(type)) {
        return <span aria-hidden className={cx('inline-block shrink-0 rounded-full', className)} style={{ background: typeColor(type) }} />
    }
    return (
        <img
            src={`${import.meta.env.BASE_URL}assets/types/${type}.svg`}
            alt=""
            aria-hidden
            className={cx('shrink-0', className)}
            width={16}
            height={16}
        />
    )
}

/** 타입 표시: 아이콘 + 이름 (테두리 있는 작은 태그) */
export function TypeTag({
    type,
    size = 'sm',
    label,
    title,
    className,
}: {
    type: string
    size?: 'xs' | 'sm' | 'md' | 'lg'
    /** 이름 대신 쓸 글자 (예: 테라 타입) */
    label?: ReactNode
    title?: string
    className?: string
}) {
    const lang = useLang()
    const s = {
        xs: { box: 'gap-1 px-1.5 py-px text-[11px]', icon: 'h-3 w-3' },
        sm: { box: 'gap-1 px-2 py-0.5 text-xs', icon: 'h-3.5 w-3.5' },
        md: { box: 'gap-1.5 px-2.5 py-1 text-sm', icon: 'h-4 w-4' },
        lg: { box: 'gap-1.5 px-3 py-1 text-base', icon: 'h-5 w-5' },
    }[size]
    return (
        <span
            title={title}
            className={cx(
                'inline-flex shrink-0 items-center rounded-full border border-border bg-surface font-medium whitespace-nowrap text-primary',
                s.box,
                className,
            )}
        >
            <TypeIconDot type={type} className={s.icon} />
            {label ?? typeName(type, lang)}
        </span>
    )
}

// ── 능력치 막대 ──

/** 0~max 막대. highlight 이면 강조색 */
export function StatBar({
    value,
    max = 255,
    highlight,
    color,
    className,
    label,
}: {
    value: number
    max?: number
    highlight?: boolean
    /** 막대 색 (기본: 강조색) */
    color?: string
    className?: string
    label?: string
}) {
    const pct = Math.max(0, Math.min(100, (value / max) * 100))
    return (
        <span
            className={cx('relative block h-2 w-full overflow-hidden rounded-full bg-muted', className)}
            role="meter"
            aria-valuemin={0}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-label={label}
        >
            <span
                className={cx('absolute inset-y-0 left-0 rounded-full', !color && (highlight ? 'bg-accent' : 'bg-accent/70'))}
                style={{ width: `${pct}%`, ...(color ? { background: color } : null) }}
            />
        </span>
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
            <span className="sr-only">{label}</span>
            {heights.map((h, i) => (
                <Skeleton key={i} height={h} index={i} />
            ))}
        </VStack>
    )
}
