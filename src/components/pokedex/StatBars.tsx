/**
 * 종족값 가로 막대 (숫자가 함께 있는 표 대용).
 * - 라벨 칸 고정 폭 · 값은 오른쪽 정렬 tabular · 막대는 0–255 고정 눈금.
 * - 막대: 타입 색 한 가지(무지개·상태 색 없음), 데이터 끝만 4px 둥글게, 기준선 쪽은 각지게.
 * - 가장 높은 값은 색이 아니라 굵기로 강조. 비교(현재) 값은 점선 눈금.
 */
import { Tooltip } from "@astryxdesign/core/Tooltip"
import { Divider } from "@astryxdesign/core/Divider"
import { HStack } from "@astryxdesign/core/HStack"
import { Text } from "@astryxdesign/core/Text"
import { VStack } from "@astryxdesign/core/VStack"
import { cx } from "../ui/utils"
import type { GenStatKey } from "../../lib/generation"
import type { TypeColorClasses } from "../../lib/typeColorClasses"
import { type StatDatum, scaleFraction } from "./statChartModel"

/** 라벨·값 칸 고정 폭 (px): 행마다 막대 시작점이 같다 */
const LABEL_W = 64
const VALUE_W = 32

const pct = (v: number) => `${(scaleFraction(v) * 100).toFixed(2)}%`

function Bar({ d, colors, showCurrent }: { d: StatDatum; colors: TypeColorClasses; showCurrent: boolean }) {
    const width = scaleFraction(d.value)
    return (
        <svg className="block h-2 min-w-0 flex-1 overflow-visible" aria-hidden>
            <rect width="100%" height="100%" rx={4} className="fill-track" />
            <g className={colors.fill}>
                {width > 0 && <rect width={pct(d.value)} height="100%" rx={4} />}
                {/* 기준선 쪽 모서리는 각지게: 둥근 왼쪽 끝을 4px 사각형으로 덮는다 (아주 짧은 막대는 생략) */}
                {width > 0.02 && <rect width={4} height="100%" />}
            </g>
            {showCurrent && d.current !== null && d.current !== d.value && (
                <line
                    x1={pct(d.current)}
                    x2={pct(d.current)}
                    y1={-3}
                    y2={11}
                    className="stroke-secondary"
                    strokeWidth={2}
                    strokeDasharray="3 2"
                />
            )}
        </svg>
    )
}

interface Props {
    data: readonly StatDatum[]
    label: (d: StatDatum) => string
    /** 행 툴팁 내용 */
    tip: (d: StatDatum) => string
    showCurrent: boolean
    colors: TypeColorClasses
    total: { label: string; value: number; current: number | null; tip: string }
    listLabel: string
    active: GenStatKey | null
    onActive: (key: GenStatKey | null) => void
}

export function StatBars({ data, label, tip, showCurrent, colors, total, listLabel, active, onActive }: Props) {
    return (
        <VStack gap={0.5} className="min-w-0 flex-1 basis-64">
            <VStack as="ul" gap={0.5} aria-label={listLabel}>
                {data.map((d) => (
                    <VStack as="li" key={d.key}>
                        <Tooltip content={tip(d)} placement="above" hasHoverIndication={false}>
                            <HStack
                                gap={3}
                                vAlign="center"
                                tabIndex={0}
                                role="group"
                                aria-label={tip(d)}
                                onPointerEnter={() => onActive(d.key)}
                                onPointerLeave={() => onActive(null)}
                                onFocus={() => onActive(d.key)}
                                onBlur={() => onActive(null)}
                                className={cx(
                                    "-mx-1.5 min-h-11 rounded-sm px-1.5 sm:min-h-8 outline-none focus-visible:ring-2 focus-visible:ring-accent",
                                    active === d.key && "bg-muted",
                                )}
                            >
                                <HStack width={LABEL_W}>
                                    <Text weight={d.isTop ? "semibold" : "normal"} color={d.isTop ? "primary" : "secondary"}>
                                        {label(d)}
                                    </Text>
                                </HStack>
                                <HStack width={VALUE_W} justify="end">
                                    <Text weight={d.isTop ? "bold" : "normal"} hasTabularNumbers>
                                        {d.value}
                                    </Text>
                                </HStack>
                                <Bar d={d} colors={colors} showCurrent={showCurrent} />
                            </HStack>
                        </Tooltip>
                    </VStack>
                ))}
            </VStack>
            <Divider />
            <HStack gap={3} vAlign="center" minHeight={32}>
                <HStack width={LABEL_W}>
                    <Text weight="semibold">{total.label}</Text>
                </HStack>
                <HStack width={VALUE_W} justify="end">
                    <Text weight="bold" hasTabularNumbers>
                        {total.value}
                    </Text>
                </HStack>
                {showCurrent && total.current !== null && total.current !== total.value && (
                    <Text type="supporting" hasTabularNumbers>
                        {total.tip}
                    </Text>
                )}
            </HStack>
        </VStack>
    )
}
