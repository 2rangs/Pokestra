/**
 * 종족값 가로 막대 (숫자가 함께 있어 표 대용이 된다).
 * - 순서 고정: HP · 공격 · 방어 · 특공 · 특방 · 스피드(1세대는 특수) → 합계.
 * - 라벨 칸 고정 폭 · 값은 오른쪽 정렬 tabular · 막대는 0–200 고정 눈금(넘으면 꽉 채우고 "200+").
 * - 막대: 흑백(색은 타입에만). 보조색 막대, 최고 값만 진한 색 + 굵은 글자. 옅은 트랙, 데이터 끝만 4px 둥글게.
 * - 비교(현재) 값은 점선 눈금. 행마다 툴팁(호버·초점·탭). 목록 전체가 탭 한 번, ↑/↓ 로 행 이동(로빙 포커스).
 */
import { type KeyboardEvent, createRef, useMemo, useState } from "react"
import { Tooltip } from "@astryxdesign/core/Tooltip"
import { Divider } from "@astryxdesign/core/Divider"
import { HStack } from "@astryxdesign/core/HStack"
import { Text } from "@astryxdesign/core/Text"
import { VStack } from "@astryxdesign/core/VStack"
import { STAT_SCALE_MAX, type StatDatum, exceedsScale, nextRowIndex, scaleFraction } from "./statChartModel"

/** 라벨·값·200+ 칸 고정 폭 (px): 행마다 막대 시작점과 끝점이 같다 */
const LABEL_W = 64
const VALUE_W = 32
const CAP_W = 36

const pct = (v: number) => `${(scaleFraction(v) * 100).toFixed(2)}%`

function Bar({ d, showCurrent }: { d: StatDatum; showCurrent: boolean }) {
    const width = scaleFraction(d.value)
    return (
        <svg className="block h-3 min-w-0 flex-1 overflow-visible" aria-hidden>
            <rect width="100%" height="100%" rx={4} className="fill-muted" />
            <g className={d.isTop ? "fill-primary" : "fill-secondary"}>
                {width > 0 && <rect width={pct(d.value)} height="100%" rx={4} />}
                {/* 기준선 쪽 모서리는 각지게: 둥근 왼쪽 끝을 4px 사각형으로 덮는다 (아주 짧은 막대는 생략) */}
                {width > 0.02 && <rect width={4} height="100%" />}
            </g>
            {showCurrent && d.current !== null && d.current !== d.value && (
                <line x1={pct(d.current)} x2={pct(d.current)} y1={-3} y2={15} className="stroke-primary" strokeWidth={2} strokeDasharray="3 2" />
            )}
        </svg>
    )
}

interface Props {
    data: readonly StatDatum[]
    label: (d: StatDatum) => string
    /** 행 툴팁 내용 (스크린리더 이름으로도 쓴다) */
    tip: (d: StatDatum) => string
    showCurrent: boolean
    total: { label: string; value: number; note: string | null }
    listLabel: string
}

export function StatBars({ data, label, tip, showCurrent, total, listLabel }: Props) {
    const [focusIndex, setFocusIndex] = useState(0)
    const count = data.length
    const refs = useMemo(() => Array.from({ length: count }, () => createRef<HTMLElement>()), [count])
    // 200 을 넘는 값이 하나라도 있을 때만 "200+" 칸을 둔다 (없으면 막대가 그만큼 길다)
    const hasCap = data.some((d) => exceedsScale(d.value))

    const onKeyDown = (i: number) => (e: KeyboardEvent<HTMLElement>) => {
        const next = nextRowIndex(e.key, i, count)
        if (next === null) return
        // ←/→ 는 처리하지 않는다: 페이지의 이전·다음 이동이 그대로 동작한다
        e.preventDefault()
        setFocusIndex(next)
        refs[next]?.current?.focus()
    }

    const cells = (name: string, value: number, top: boolean) => (
        <>
            <HStack width={LABEL_W}>
                <Text weight={top ? "semibold" : "normal"} color={top ? "primary" : "secondary"}>
                    {name}
                </Text>
            </HStack>
            <HStack width={VALUE_W} justify="end">
                <Text weight={top ? "bold" : "normal"} hasTabularNumbers>
                    {value}
                </Text>
            </HStack>
        </>
    )

    return (
        <VStack gap={0.5} className="min-w-0">
            <VStack as="ul" gap={0.5} aria-label={listLabel}>
                {data.map((d, i) => (
                    <VStack as="li" key={d.key}>
                        <Tooltip content={tip(d)} placement="above" hasHoverIndication={false} touchTrigger="tap">
                            <HStack
                                ref={refs[i]}
                                gap={3}
                                vAlign="center"
                                tabIndex={i === Math.min(focusIndex, count - 1) ? 0 : -1}
                                role="group"
                                aria-label={tip(d)}
                                onFocus={() => setFocusIndex(i)}
                                onKeyDown={onKeyDown(i)}
                                className="-mx-1.5 min-h-11 rounded-sm px-1.5 outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-accent sm:min-h-8"
                            >
                                {cells(label(d), d.value, d.isTop)}
                                <Bar d={d} showCurrent={showCurrent} />
                                {hasCap && (
                                    <HStack width={CAP_W}>
                                        {exceedsScale(d.value) && <Text type="supporting">{`${STAT_SCALE_MAX}+`}</Text>}
                                    </HStack>
                                )}
                            </HStack>
                        </Tooltip>
                    </VStack>
                ))}
            </VStack>
            <Divider />
            <HStack gap={3} vAlign="center" minHeight={36} wrap="wrap">
                {cells(total.label, total.value, true)}
                {total.note && (
                    <Text type="supporting" hasTabularNumbers>
                        {total.note}
                    </Text>
                )}
            </HStack>
        </VStack>
    )
}
