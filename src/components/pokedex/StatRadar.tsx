/**
 * 종족값 방사형 그래프 (직접 그린 SVG, 차트 라이브러리 없음).
 * - 0–255 고정 눈금, 흐린 격자 고리(50/100/150/200/255)와 축선은 1px 테두리 토큰.
 * - 선택 값: 타입 옅은 면 + 타입 테두리 2px. 비교(현재) 값: 보조 글자색 점선 — 색만으로 구분하지 않는다.
 * - 꼭짓점은 툴팁 대상. 그래프 전체가 탭 한 번에 들어오고 ←/→/↑/↓ 로 꼭짓점을 옮긴다(로빙 탭인덱스).
 * - 축 순서는 게임 화면과 같다(radarOrder): 물리는 오른쪽, 특수는 왼쪽.
 */
import { type KeyboardEvent, type RefObject, createRef, useMemo } from "react"
import { cx } from "../ui/utils"
import type { TypeColorClasses } from "../../lib/typeColorClasses"
import type { GenStatKey } from "../../lib/generation"
import { RADAR_RINGS, type StatDatum, radarOrder, radarPoints, ringPoints, toPointsAttr } from "./statChartModel"

const R = 88
/** 축 이름 자리: 좌우는 글자 폭, 위아래는 한 줄 높이 */
const PAD_X = 60
const PAD_Y = 22
const W = 2 * (R + PAD_X)
const H = 2 * (R + PAD_Y)
const GEOM = { cx: W / 2, cy: H / 2, r: R }
const LABEL_GAP = 12

interface Props {
    data: readonly StatDatum[]
    /** 축 이름 (짧은 이름) */
    axisLabel: (d: StatDatum) => string
    /** 꼭짓점 이름 (스크린리더) */
    tip: (d: StatDatum) => string
    /** 꼭짓점에 올리거나 초점이 가면 그 옆에 뜨는 값 (세대 비교 시 두 값) */
    readout: (d: StatDatum) => string
    /** 현재 값 점선을 겹쳐 그릴지 */
    showCurrent: boolean
    colors: TypeColorClasses
    label: string
    active: GenStatKey | null
    onActive: (key: GenStatKey | null) => void
}

function Vertex({
    statKey,
    x,
    y,
    colors,
    isActive,
    tabbable,
    tip,
    onActive,
    onKeyDown,
    ref,
}: {
    statKey: GenStatKey
    x: number
    y: number
    colors: TypeColorClasses
    isActive: boolean
    tabbable: boolean
    tip: string
    onActive: (key: GenStatKey | null) => void
    onKeyDown: (e: KeyboardEvent<SVGCircleElement>) => void
    ref: RefObject<SVGCircleElement | null>
}) {
    return (
        <g>
            {/* 보이는 점: 지름 8px 이상, 계열 색으로 채우고 카드 면 색 2px 고리 */}
            <circle cx={x} cy={y} r={isActive ? 6 : 4} className={cx(colors.fill, "stroke-card")} strokeWidth={2} aria-hidden />
            {/* 맞히기 쉬운 24px 투명 대상 (키보드 초점도 여기) */}
            <circle
                ref={ref}
                cx={x}
                cy={y}
                r={12}
                className="cursor-default fill-transparent outline-none focus-visible:stroke-accent"
                strokeWidth={2}
                tabIndex={tabbable ? 0 : -1}
                role="img"
                aria-label={tip}
                onPointerEnter={() => onActive(statKey)}
                onPointerLeave={() => onActive(null)}
                onFocus={() => onActive(statKey)}
                onBlur={() => onActive(null)}
                onKeyDown={onKeyDown}
            />
        </g>
    )
}

export function StatRadar({ data: input, axisLabel, tip, readout, showCurrent, colors, label, active, onActive }: Props) {
    const data = radarOrder(input)
    const n = data.length
    // 꼭짓점 수만큼 ref (5 또는 6). 툴팁이 이 원을 기준으로 뜬다
    const refs = useMemo(() => Array.from({ length: n }, () => createRef<SVGCircleElement>()), [n])

    const selected = radarPoints(
        data.map((d) => d.value),
        GEOM,
    )
    const current = radarPoints(
        data.map((d) => d.current ?? d.value),
        GEOM,
    )
    const outer = ringPoints(n, 255, GEOM)
    const labels = ringPoints(n, 255, { ...GEOM, r: R + LABEL_GAP })

    const focusVertex = (i: number) => {
        const next = (i + n) % n
        refs[next]?.current?.focus()
    }
    const onKeyDown = (i: number) => (e: KeyboardEvent<SVGCircleElement>) => {
        const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0
        if (!step) return
        // 페이지의 ←/→ 이전·다음 이동보다 먼저 처리한다 (페이지는 defaultPrevented 를 건너뛴다)
        e.preventDefault()
        focusVertex(i + step)
    }
    const activeIndex = data.findIndex((d) => d.key === active)
    const tabIndexAt = Math.max(0, activeIndex)
    // 값 글자 자리: 꼭짓점에서 바깥쪽으로 18px(맞히기 원 밖), 좌우 방향에 맞춰 정렬
    const readoutAt = (() => {
        if (activeIndex < 0) return { x: 0, y: 0, anchor: "middle" as const }
        const p = selected[activeIndex]
        const angle = (2 * Math.PI * activeIndex) / n
        const dx = Math.sin(angle)
        const dy = -Math.cos(angle)
        const anchor = Math.abs(dx) < 0.2 ? ("middle" as const) : dx > 0 ? ("start" as const) : ("end" as const)
        return { x: p.x + dx * 18, y: p.y + dy * 18, anchor }
    })()

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-74 max-w-full shrink-0 overflow-visible" role="group" aria-label={label}>
            {/* 격자: 고리와 축선 (1px, 흐리게) */}
            <g aria-hidden className="fill-none stroke-border">
                {RADAR_RINGS.map((v) => (
                    <polygon key={v} points={toPointsAttr(ringPoints(n, v, GEOM))} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                ))}
                {outer.map((p, i) => (
                    <line key={i} x1={GEOM.cx} y1={GEOM.cy} x2={p.x} y2={p.y} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                ))}
            </g>

            {/* 선택 값: 옅은 타입 면 + 타입 테두리 2px */}
            <polygon
                aria-hidden
                points={toPointsAttr(selected)}
                className={cx(colors.fillSubtle, colors.stroke, "fill-opacity-90")}
                strokeWidth={2}
                strokeLinejoin="round"
            />
            {/* 현재 값: 점선 (선택 세대와 다를 때만) */}
            {showCurrent && (
                <polygon
                    aria-hidden
                    points={toPointsAttr(current)}
                    className="fill-none stroke-secondary"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    strokeLinejoin="round"
                />
            )}

            {/* 축 이름: 글자 토큰 (계열 색 아님) */}
            <g aria-hidden className="fill-secondary text-sm">
                {labels.map((p, i) => {
                    const dx = p.x - GEOM.cx
                    const anchor = Math.abs(dx) < 1 ? "middle" : dx > 0 ? "start" : "end"
                    const dy = p.y - GEOM.cy
                    const baseline = Math.abs(dy) < 1 ? "middle" : dy < 0 ? "auto" : "hanging"
                    const d = data[i]
                    return (
                        <text
                            key={d.key}
                            x={p.x}
                            y={p.y}
                            textAnchor={anchor}
                            dominantBaseline={Math.abs(dx) < 1 ? baseline : "middle"}
                            fontWeight={d.isTop ? 600 : undefined}
                        >
                            {axisLabel(d)}
                        </text>
                    )
                })}
            </g>

            {selected.map((p, i) => (
                <Vertex
                    key={data[i].key}
                    statKey={data[i].key}
                    x={p.x}
                    y={p.y}
                    colors={colors}
                    isActive={active === data[i].key}
                    tabbable={i === tabIndexAt}
                    tip={tip(data[i])}
                    onActive={onActive}
                    onKeyDown={onKeyDown(i)}
                    ref={refs[i]}
                />
            ))}

            {/* 값 읽기: SVG 요소는 CSS anchor 앵커가 될 수 없어 Astryx Tooltip 대신 꼭짓점 바깥쪽에 직접 그린다.
                글자는 글자 토큰, 카드 면 색 테두리(paint-order)로 선 위에서도 읽힌다 */}
            {activeIndex >= 0 && (
                <text
                    aria-hidden
                    x={readoutAt.x}
                    y={readoutAt.y}
                    textAnchor={readoutAt.anchor}
                    dominantBaseline="middle"
                    className="pointer-events-none fill-primary stroke-card text-sm font-semibold tabular-nums"
                    strokeWidth={4}
                    strokeLinejoin="round"
                    paintOrder="stroke"
                >
                    {readout(data[activeIndex])}
                </text>
            )}
        </svg>
    )
}
