/**
 * 기술/특성/스프라이트/홈 페이지에서 함께 쓰는 작은 UI 조각들.
 * 모두 Astryx 컴포넌트(기본 neutral 테마)를 얇게 감싼 것이다.
 */
import { memo, type ReactNode, type RefObject } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { ClickableCard } from '@astryxdesign/core/ClickableCard'
import { EmptyState as AxEmptyState } from '@astryxdesign/core/EmptyState'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { Link } from '@astryxdesign/core/Link'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { Selector } from '@astryxdesign/core/Selector'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { ToggleButton } from '@astryxdesign/core/ToggleButton'
import { VStack } from '@astryxdesign/core/VStack'
import { useLang, useT } from '../../i18n'
import { commonMessages } from '../../i18n/messages/common'
import { type DexPokemon, displayName, getSpeciesId } from '../../lib/dex'
import { pokemonImageCandidates } from '../../lib/images'
import { PokeImage } from '../ui/PokeImage'
import { PageTitle, TypeTag } from '../ui/shared'
import { padDexNo } from './text'

// ── 타입 / 분류 ──

export function TypeBadge({ type, size = 'sm' }: { type: string; size?: 'sm' | 'md' }) {
    return <TypeTag type={type} size={size} />
}

/** 물리/특수/변화 분류: 글자로만 표시 (변화는 보조색) */
export function ClassBadge({ label, damageClass }: { label: string; damageClass: string }) {
    return (
        <Text size="sm" weight="medium" color={damageClass === 'status' ? 'secondary' : 'primary'}>
            {label}
        </Text>
    )
}

// ── 필터 ──

/** 켜고 끄는 필터 버튼 (Astryx ToggleButton) */
export function FilterChip({
    active,
    onClick,
    children,
    label,
    icon,
}: {
    active: boolean
    onClick: () => void
    /** 보이는 글자 (생략하면 label) */
    children?: ReactNode
    /** 접근성 이름 */
    label: string
    icon?: ReactNode
}) {
    return (
        <ToggleButton size="sm" label={label} icon={icon} isPressed={active} onPressedChange={() => onClick()}>
            {children ?? label}
        </ToggleButton>
    )
}

/** 필드 위의 작은 라벨 */
export function FieldLabel({ children }: { children: ReactNode }) {
    return (
        <Text type="label" color="secondary">
            {children}
        </Text>
    )
}

/** 두세 개 중 하나를 고르는 세그먼트 (Astryx SegmentedControl) + 보이는 라벨 */
export function Segmented<V extends string>({
    label,
    value,
    options,
    onChange,
    isLabelHidden,
}: {
    label: string
    value: V
    options: { value: V; label: string }[]
    onChange: (v: V) => void
    isLabelHidden?: boolean
}) {
    return (
        <VStack gap={1} hAlign="start">
            {!isLabelHidden && <FieldLabel>{label}</FieldLabel>}
            <SegmentedControl size="sm" label={label} value={value} onChange={(v) => onChange(v as V)}>
                {options.map((o) => (
                    <SegmentedControlItem key={o.value} value={o.value} label={o.label} />
                ))}
            </SegmentedControl>
        </VStack>
    )
}

/** 드롭다운 선택 (Astryx Selector). 빈 문자열 값은 "전체"로 보여 준다 */
export function SelectField({
    label,
    value,
    onChange,
    options,
    width = 160,
    isLabelHidden,
}: {
    label: string
    value: string
    onChange: (v: string) => void
    options: { value: string; label: string }[]
    width?: number
    /** 라벨을 숨기고, 값 '' 옵션의 이름을 `label`로 보여 준다("전체" 대신 "타입"). */
    isLabelHidden?: boolean
}) {
    const ALL = '__all__'
    return (
        <Selector
            size="sm"
            width={width}
            label={label}
            isLabelHidden={isLabelHidden}
            value={value || ALL}
            onChange={(v) => onChange(v === ALL ? '' : v)}
            options={options.map((o) => ({ value: o.value || ALL, label: isLabelHidden && !o.value ? label : o.label }))}
        />
    )
}

// ── 필터 줄 (검색 | 선택들 | 오른쪽 끝) ──

export function FilterRow({
    label,
    search,
    children,
    end,
}: {
    label: string
    search: ReactNode
    children?: ReactNode
    end?: ReactNode
}) {
    return (
        <section aria-label={label} className="flex flex-wrap items-end gap-2">
            <span className="w-full sm:w-auto sm:min-w-56 sm:flex-1">{search}</span>
            {children && <span className="flex max-w-full items-end gap-2 overflow-x-auto pb-0.5 *:shrink-0">{children}</span>}
            {end && <span className="ms-auto">{end}</span>}
        </section>
    )
}

// ── 검색창 ──

export function SearchField({
    value,
    onChange,
    label,
    placeholder,
}: {
    value: string
    onChange: (v: string) => void
    label: string
    placeholder?: string
}) {
    return (
        <TextInput
            type="search"
            enterKeyHint="search"
            label={label}
            isLabelHidden
            value={value}
            onChange={(v) => onChange(v)}
            placeholder={placeholder}
            autoComplete="off"
            hasClear
            startIcon={<Icon icon="search" />}
            width="100%"
        />
    )
}

// ── 페이지 머리 / 빈 상태 / 뒤로 ──

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
    return (
        <PageTitle title={title} lead={subtitle}>
            {children}
        </PageTitle>
    )
}

export function EmptyState({ title, description }: { title?: string; description?: string }) {
    const t = useT(commonMessages)
    return <AxEmptyState title={title ?? t('noResults')} description={description} />
}

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
    return (
        <span className="mb-4 inline-flex">
            <Link href={to}>
                <HStack gap={1} align="center" as="span">
                    <Icon icon="chevronLeft" size="sm" />
                    {children}
                </HStack>
            </Link>
        </span>
    )
}

// ── 더 보기 ──

export function LoadMore({
    hasMore,
    onMore,
    sentinelRef,
}: {
    hasMore: boolean
    onMore: () => void
    sentinelRef: RefObject<HTMLDivElement | null>
}) {
    const t = useT(commonMessages)
    if (!hasMore) return null
    return (
        <div ref={sentinelRef} className="mt-4 flex justify-center">
            <Button variant="secondary" label={t('showMore')} onClick={onMore} />
        </div>
    )
}

// ── 포켓몬 타일 (스프라이트 + 이름 + 번호) ──

function PokemonChipImpl({ pokemon: p, badge }: { pokemon: DexPokemon; badge?: ReactNode }) {
    const lang = useLang()
    const name = displayName(p, lang)
    return (
        <ClickableCard href={`/pokemon/${p.id}`} label={name} padding={2} height="100%">
            <HStack gap={2} align="center">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center">
                    <PokeImage sources={pokemonImageCandidates(p.id, 40, { sprite: p.sprite })} alt="" size={40} className="h-10 w-10" />
                </span>
                <VStack gap={0.5} className="min-w-0">
                    <Text size="sm" weight="semibold" maxLines={1}>
                        {name}
                    </Text>
                    <HStack gap={1.5} align="center" wrap="wrap">
                        <Text type="supporting" hasTabularNumbers>
                            {padDexNo(getSpeciesId(p))}
                        </Text>
                        {badge}
                    </HStack>
                </VStack>
            </HStack>
        </ClickableCard>
    )
}

export const PokemonChip = memo(PokemonChipImpl)
