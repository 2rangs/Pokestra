/**
 * 포켓몬 상세 머리말. 실제 머리말과 로딩 골격이 같은 틀을 쓴다(레이아웃 시프트 방지).
 *
 * 읽는 순서: (위 가장자리) 이전 · 다음 → 이미지 → 번호 · 이름 · 타입 → 핵심 수치 줄 → 조작 줄 → 도감 설명.
 * - md 이상: 이미지(240px) | 글 칸 하나(왼쪽 정렬선 하나)에 나머지를 위에서 아래로.
 * - 휴대폰: 이미지(112px) + 번호·이름·타입이 나란히, 그 아래 수치(2×2)·조작·설명이 전체 폭.
 *   (글 칸 VStack 이 휴대폰에서는 display:contents 라 두 묶음이 바깥 줄바꿈 줄에 그대로 놓인다)
 * - 바탕: 첫 타입의 옅은 면 토큰 (라이트·다크 모두 테마 값).
 */
import type { ReactNode } from "react"
import { Card } from "@astryxdesign/core/Card"
import { Divider } from "@astryxdesign/core/Divider"
import { HStack } from "@astryxdesign/core/HStack"
import { Icon } from "@astryxdesign/core/Icon"
import { InfoTip } from "@astryxdesign/core/InfoTip"
import { Link } from "@astryxdesign/core/Link"
import { Text } from "@astryxdesign/core/Text"
import { VStack } from "@astryxdesign/core/VStack"
import { PokeImage } from "../ui/PokeImage"
import type { Lang } from "../../i18n"
import { type DexPokemon, pokemonName } from "../../lib/dex"
import { dexNumber } from "./format"

export interface StripItem {
    label: string
    value: ReactNode
    /** 값 옆 ⓘ 설명 (라벨 옆에 붙는다) */
    hint?: { content: string; label: string }
}

interface Props {
    nav: ReactNode
    image: { key?: number; sources: (string | null | undefined)[]; alt: string; priority?: boolean }
    number: ReactNode
    name: ReactNode
    /** 이름 줄 오른쪽 (타입 칩 등) */
    badges: ReactNode
    /** 이름 아래 한 줄 (다른 언어 이름 · 분류) */
    subline: ReactNode
    strip: readonly StripItem[]
    controls: ReactNode
    flavor: ReactNode
    /** 도감 설명 묶음의 작은 제목 */
    flavorLabel: string
    /** 도감 설명 제목 옆 조작 (작품 선택) */
    flavorControl?: ReactNode
}

export function DetailHeader({ nav, image, number, name, badges, subline, strip, controls, flavor, flavorLabel, flavorControl }: Props) {
    return (
        <Card>
            <VStack gap={3}>
                {nav}
                <HStack gap={4} vAlign="start" wrap="wrap" className="gap-y-3">
                    <figure className="shrink-0 rounded-lg bg-surface p-1 md:p-2">
                        <PokeImage
                            key={image.key}
                            sources={image.sources}
                            alt={image.alt}
                            size={240}
                            className="size-28 md:size-60"
                            priority={image.priority}
                        />
                    </figure>
                    <VStack gap={3} className="contents md:flex md:min-w-0 md:flex-1">
                        {/* 신원: 번호 → 이름 → 타입(이름 바로 아래, 시선이 이어지게) → 다른 이름·분류 */}
                        <VStack gap={1.5} className="min-w-0 flex-1 basis-40 md:flex-none">
                            {number}
                            {name}
                            <HStack gap={1.5} vAlign="center" wrap="wrap">
                                {badges}
                            </HStack>
                            {subline}
                        </VStack>
                        <VStack gap={3} className="min-w-0 basis-full md:basis-auto">
                            <Divider />
                            {/* 핵심 수치: 칸 4개(휴대폰 2×2), 라벨 위·값 아래 */}
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4 sm:gap-x-0 sm:divide-x sm:divide-border">
                                {strip.map((s, i) => (
                                    <VStack key={i} gap={0.5} className="min-w-0 sm:px-4 sm:first:ps-0">
                                        <HStack as="dt" gap={1} vAlign="center">
                                            <Text type="supporting">{s.label}</Text>
                                            {s.hint && <InfoTip content={s.hint.content} label={s.hint.label} size="xsm" />}
                                        </HStack>
                                        <VStack as="dd">
                                            {typeof s.value === "string" || typeof s.value === "number" ? (
                                                <Text type="large" weight="semibold">
                                                    {s.value}
                                                </Text>
                                            ) : (
                                                s.value
                                            )}
                                        </VStack>
                                    </VStack>
                                ))}
                            </dl>
                            <Divider />
                            <HStack gap={2} vAlign="center" wrap="wrap">
                                {controls}
                            </HStack>
                            {flavor && (
                                <>
                                    <Divider />
                                    <VStack gap={1.5}>
                                        <HStack gap={2} vAlign="center" justify="between" wrap="wrap">
                                            <Text type="supporting" weight="medium">
                                                {flavorLabel}
                                            </Text>
                                            {flavorControl}
                                        </HStack>
                                        {flavor}
                                    </VStack>
                                </>
                            )}
                        </VStack>
                    </VStack>
                </HStack>
            </VStack>
        </Card>
    )
}

/** 머리말 위 가장자리: 이전(왼쪽) · 다음(오른쪽). 휴대폰에서 44px 높이 */
export function NeighborNav({ prev, next, lang, labels, search }: {
    prev: DexPokemon | undefined
    next: DexPokemon | undefined
    lang: Lang
    labels: { nav: string; prev: string; next: string; hint: string }
    search: string
}) {
    return (
        <nav aria-label={labels.nav} title={labels.hint}>
            <HStack gap={4} vAlign="center" justify="between" className="-my-1">
                <NeighborLink p={prev} dir="prev" lang={lang} label={labels.prev} search={search} />
                <NeighborLink p={next} dir="next" lang={lang} label={labels.next} search={search} />
            </HStack>
        </nav>
    )
}

function NeighborLink({ p, dir, lang, label, search }: { p: DexPokemon | undefined; dir: "prev" | "next"; lang: Lang; label: string; search: string }) {
    // 첫·마지막 번호에서도 반대쪽 링크가 제자리에 있게 빈 자리를 둔다
    if (!p) return <HStack aria-hidden />
    const name = pokemonName(p, lang)
    const no = dexNumber(p.id)
    const icon = <Icon icon={dir === "prev" ? "chevronLeft" : "chevronRight"} size="sm" />
    const nameText = (
        <Text weight="medium" maxLines={1} hasTruncateTooltip={false} className="max-w-28 sm:max-w-48">
            {name}
        </Text>
    )
    const noText = (
        <Text color="secondary" hasTabularNumbers>
            {no}
        </Text>
    )
    return (
        <Link href={`/pokemon/${p.id}${search}`} label={`${label}: ${no} ${name}`} hasUnderline={false} color="secondary">
            {/* 휴대폰 44px 터치 높이. 다음은 거울 순서(이름 · 번호 ›) */}
            <HStack as="span" gap={1.5} vAlign="center" className="min-h-11 sm:min-h-8">
                {dir === "prev" ? (
                    <>
                        {icon}
                        {noText}
                        {nameText}
                    </>
                ) : (
                    <>
                        {nameText}
                        {noText}
                        {icon}
                    </>
                )}
            </HStack>
        </Link>
    )
}
