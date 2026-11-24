/**
 * 홈의 "종족값 지도": 전체 종(폼 제외)을 두 능력치로 줄 세운 그림.
 * 처음 보는 사람도 읽을 수 있게:
 * - 축 고르기를 문장으로: "→ 오른쪽일수록 높은 [공격력] · ↑ 위쪽일수록 높은 [스피드]" + 추천 비교 버튼(빠른 공격수 등).
 * - 그림 네 귀퉁이에 뜻(둘 다 높음 / ○○만 높음 / 둘 다 낮음), 아래에 범례(점 1개 = 1마리, 크기 = 합계, 색 = 타입).
 * - 점에 올리면(휴대폰은 누르면) 그림·이름·타입·수치 카드. 데스크톱은 점을 누르면 바로 상세, 휴대폰은 카드의 버튼으로.
 * - 축 값: 6가지 능력치, 공격력(공격·특공 중 높은 값), 합계. 능력치 0–200(넘는 값은 끝에), 합계 100–800.
 * 키보드·스크린리더 사용자는 그래프 대신 요약 문장과 검색·도감을 쓴다(점 1,000여 개를 모두 초점에 넣지 않는다).
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { IconButton } from '@astryxdesign/core/IconButton'
import { Selector } from '@astryxdesign/core/Selector'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { VStack } from '@astryxdesign/core/VStack'
import { formatNumber, useLang, useT } from '../../i18n'
import { homeMessages } from '../../i18n/messages/home'
import { ALL_POKEMON, type DexPokemon, type StatKey, TYPES, baseStatTotal, isAlternateForm, pokemonName, statLabel, typeName } from '../../lib/dex'
import { pokemonImageCandidates } from '../../lib/images'
import { TYPE_COLOR_CLASSES } from '../../lib/typeColorClasses'
import { PokeImage } from '../ui/PokeImage'
import { TypeChip, TypeGlyph } from '../ui/TypeChip'
import { cx } from '../ui/utils'

const SPECIES: readonly DexPokemon[] = ALL_POKEMON.filter((p) => !isAlternateForm(p))

/** 축에 올릴 수 있는 값: 6가지 능력치, 공격력(공격·특공 중 높은 값), 합계 */
type Metric = StatKey | 'offense' | 'total'
const METRICS: readonly Metric[] = ['hp', 'attack', 'defense', 'spAtk', 'spDef', 'speed', 'offense', 'total']
const value = (m: Metric, p: DexPokemon) => (m === 'total' ? baseStatTotal(p) : m === 'offense' ? Math.max(p.stats.attack, p.stats.spAtk) : p.stats[m])
/** 눈금: 능력치는 0–200(넘는 값은 끝에 붙고, 실제 값은 카드에 나온다), 합계는 100–800 */
const scaleOf = (m: Metric) => (m === 'total' ? { min: 100, max: 800, step: 100 } : { min: 0, max: 200, step: 50 })
const ticksOf = (m: Metric) => {
    const { min, max, step } = scaleOf(m)
    return Array.from({ length: (max - min) / step + 1 }, (_, i) => min + i * step)
}

/** 추천 비교 (한 번에 두 축) */
const PRESETS = [
    { key: 'presetAttacker', x: 'offense', y: 'speed' },
    { key: 'presetWall', x: 'defense', y: 'spDef' },
    { key: 'presetBulk', x: 'hp', y: 'defense' },
    { key: 'presetTotal', x: 'total', y: 'speed' },
] as const satisfies readonly { key: string; x: Metric; y: Metric }[]

// 그림은 칸 너비만큼 실제 픽셀로 그린다(글자·점 크기가 화면과 상관없이 같다). 좁은 화면에서는 더 길쭉하게.
const PAD = { l: 36, r: 12, t: 12, b: 28 }
const radius = (total: number, narrow: boolean) => Math.max(narrow ? 1.5 : 2, Math.min(narrow ? 6 : 9, 2 + (total - 180) / (narrow ? 110 : 80)))
/** 정보 카드 크기 (그림 안 foreignObject) */
const CARD = { w: 228, h: 150 }

/** 마우스가 없는 기기(휴대폰): 첫 탭은 카드, 카드의 버튼으로 상세 */
const isTouch = () => typeof window !== 'undefined' && !!window.matchMedia?.('(hover: none)').matches

export function StatMap() {
    const lang = useLang()
    const t = useT(homeMessages)
    const navigate = useNavigate()
    const [xm, setXm] = useState<Metric>('offense')
    const [ym, setYm] = useState<Metric>('speed')
    const [type, setType] = useState<string | null>(null)
    const [hover, setHover] = useState<DexPokemon | null>(null)
    const [picked, setPicked] = useState<DexPokemon | null>(null)
    const boxRef = useRef<HTMLSpanElement>(null)
    const [W, setW] = useState(1000)
    useLayoutEffect(() => {
        const el = boxRef.current
        if (!el) return
        const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))))
        ro.observe(el)
        return () => ro.disconnect()
    }, [])
    const narrow = W < 640
    const H = narrow ? Math.round(W * 0.95) : Math.min(440, Math.round(W * 0.4))
    const unit = (m: Metric, v: number) => {
        const { min, max } = scaleOf(m)
        return (Math.min(max, Math.max(min, v)) - min) / (max - min)
    }
    const sx = (v: number) => PAD.l + unit(xm, v) * (W - PAD.l - PAD.r)
    const sy = (v: number) => H - PAD.b - unit(ym, v) * (H - PAD.t - PAD.b)

    const metricLabel = (m: Metric) => (m === 'offense' ? t('mapOffense') : m === 'total' ? t('mapTotalAxis') : statLabel(m, lang))
    /** 좁은 자리용 짧은 이름 ("공격력 (공격·특공 중 높은 값)" → "공격력") */
    const shortLabel = (m: Metric) => metricLabel(m).split(/ ?[(（]/)[0]
    const metricOptions = METRICS.map((m) => ({ value: m, label: metricLabel(m) }))
    const setAxes = (x: Metric, y: Metric) => {
        setXm(x)
        setYm(y)
        setPicked(null)
    }

    const points = useMemo(() => {
        return SPECIES.map((p) => {
            const on = type === null || p.types.includes(type)
            // 강조 중이면 그 타입 색, 아니면 첫 타입 색
            const colorType = type && on ? type : p.types[0]
            return { p, x: sx(value(xm, p)), y: sy(value(ym, p)), r: radius(baseStatTotal(p), narrow), on, colorType, total: baseStatTotal(p) }
        }).sort((u, v) => Number(u.on) - Number(v.on) || v.r - u.r) // 흐린 점 먼저, 큰 점 먼저(작은 점이 위에)
        // eslint-disable-next-line react-hooks/exhaustive-deps -- sx/sy 는 축·W·H 로 정해진다
    }, [xm, ym, type, W, H, narrow])
    const pointOf = useMemo(() => new Map(points.map((d) => [d.p.id, d])), [points])

    // 이름표: 합계 상위 3마리. 글자 상자가 겹치면 오른쪽 → 왼쪽 → 위 → 아래 순서로 자리를 옮긴다
    const labeled = useMemo(() => {
        const top = points
            .filter((d) => d.on)
            .sort((u, v) => v.total - u.total)
            .slice(0, 3)
        // 강조 고리 자체도 장애물
        const boxes = top.map((d) => ({ x: d.x - d.r - 6, y: d.y - d.r - 6, w: 2 * d.r + 12, h: 2 * d.r + 12 }))
        return top.map((d) => {
            const name = pokemonName(d.p, lang)
            const w = name.length * 13 + 4
            const h = 16
            const spots = [
                { x: d.x + d.r + 8, y: d.y - h / 2, anchor: 'start' as const },
                { x: d.x - d.r - 8 - w, y: d.y - h / 2, anchor: 'end' as const },
                { x: d.x - w / 2, y: d.y - d.r - 10 - h, anchor: 'middle' as const },
                { x: d.x - w / 2, y: d.y + d.r + 10, anchor: 'middle' as const },
            ]
            const hit = (b: { x: number; y: number }) => boxes.some((o) => b.x < o.x + o.w && o.x < b.x + w && b.y < o.y + o.h && o.y < b.y + h)
            const spot = spots.find((b) => !hit(b)) ?? spots[0]
            boxes.push({ x: spot.x, y: spot.y, w, h })
            const tx = spot.anchor === 'start' ? spot.x : spot.anchor === 'end' ? spot.x + w : spot.x + w / 2
            return { d, name, tx, ty: spot.y + h - 3, anchor: spot.anchor }
        })
    }, [points, lang])
    const typeLabel = type ? typeName(type, lang) : t('mapAll')

    // 정보 카드: 탭해서 고른 포켓몬 → 마우스를 올린 포켓몬. 점 옆(화면 가운데 쪽)에 붙이고 그림 밖으로 나가지 않게.
    const shown = picked ?? hover
    const shownPt = shown ? pointOf.get(shown.id) : undefined
    const cardX = shownPt ? Math.min(Math.max(4, shownPt.x + (shownPt.x > W / 2 ? -CARD.w - 14 : 14)), W - CARD.w - 4) : 0
    const cardY = shownPt ? Math.min(Math.max(4, shownPt.y - 40), H - CARD.h - 4) : 0

    const corner = 'fill-secondary text-[11px] font-semibold'
    const plot = { l: PAD.l + 8, r: W - PAD.r - 8, t: PAD.t + 14, b: H - PAD.b - 8 }

    return (
        <Card padding={5} className="max-sm:p-4">
            <VStack gap={3}>
                <VStack gap={0.5}>
                    <Heading level={2} id="stat-map-heading">
                        {t('mapTitle')}
                    </Heading>
                    <Text type="supporting" color="secondary">
                        {t('mapLead', { n: formatNumber(SPECIES.length, lang) })}
                    </Text>
                </VStack>

                {/* 축 고르기: 문장처럼 읽힌다 */}
                <HStack gap={2} vAlign="center" wrap="wrap" role="group" aria-label={t('mapAxes')}>
                    <HStack gap={1.5} vAlign="center">
                        <Text weight="semibold" textWrap="nowrap">
                            {t('mapRight')}
                        </Text>
                        <Selector
                            label={t('mapX')}
                            isLabelHidden
                            width={150}
                            presentation="adaptive"
                            value={xm}
                            onChange={(v) => setAxes(v as Metric, ym)}
                            options={metricOptions}
                            renderValue={(o) => shortLabel(o.value as Metric)}
                        />
                    </HStack>
                    <IconButton label={t('mapSwap')} icon={<Icon icon="arrowsUpDown" />} variant="ghost" size="sm" onClick={() => setAxes(ym, xm)} />
                    <HStack gap={1.5} vAlign="center">
                        <Text weight="semibold" textWrap="nowrap">
                            {t('mapUp')}
                        </Text>
                        <Selector
                            label={t('mapY')}
                            isLabelHidden
                            width={150}
                            presentation="adaptive"
                            value={ym}
                            onChange={(v) => setAxes(xm, v as Metric)}
                            options={metricOptions}
                            renderValue={(o) => shortLabel(o.value as Metric)}
                        />
                    </HStack>
                </HStack>

                <HStack gap={1.5} vAlign="center" wrap="wrap" role="group" aria-label={t('mapPresets')}>
                    <Text type="supporting" color="secondary">
                        {t('mapPresets')}
                    </Text>
                    {PRESETS.map((pr) => (
                        <Token key={pr.key} label={t(pr.key)} color={xm === pr.x && ym === pr.y ? 'gray' : 'default'} onClick={() => setAxes(pr.x, pr.y)} />
                    ))}
                </HStack>

                <HStack gap={1.5} vAlign="center" wrap="wrap" role="group" aria-label={t('mapHighlight')}>
                    <Text type="supporting" color="secondary">
                        {t('mapHighlight')}
                    </Text>
                    <Token label={t('mapAll')} color={type === null ? 'gray' : 'default'} onClick={() => setType(null)} />
                    {TYPES.map((ty) => (
                        <Token
                            key={ty.name}
                            label={typeName(ty.name, lang)}
                            icon={<TypeGlyph type={ty.name} size="sm" />}
                            color={type === ty.name ? 'gray' : 'default'}
                            onClick={() => setType(type === ty.name ? null : ty.name)}
                        />
                    ))}
                </HStack>

                <span ref={boxRef} className="block w-full">
                    <svg
                        width={W}
                        height={H}
                        viewBox={`0 0 ${W} ${H}`}
                        className="block"
                        role="img"
                        aria-labelledby="stat-map-heading"
                        aria-description={t('mapSummary', { x: metricLabel(xm), y: metricLabel(ym), type: typeLabel })}
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setPicked(null)
                        }}
                    >
                        {ticksOf(xm).map((v) => (
                            <g key={`x${v}`}>
                                <line x1={sx(v)} x2={sx(v)} y1={PAD.t} y2={H - PAD.b} className="stroke-border" />
                                <text x={sx(v)} y={H - PAD.b + 16} textAnchor="middle" className="fill-secondary text-[11px]">
                                    {v}
                                </text>
                            </g>
                        ))}
                        {ticksOf(ym).map((v) => (
                            <g key={`y${v}`}>
                                <line x1={PAD.l} x2={W - PAD.r} y1={sy(v)} y2={sy(v)} className="stroke-border" />
                                <text x={PAD.l - 8} y={sy(v) + 4} textAnchor="end" className="fill-secondary text-[11px]">
                                    {v}
                                </text>
                            </g>
                        ))}

                        {/* 네 귀퉁이의 뜻 */}
                        <g className="pointer-events-none" aria-hidden>
                            <text x={plot.r} y={plot.t} textAnchor="end" className={corner}>
                                ↗ {t('mapBothHigh')}
                            </text>
                            <text x={plot.l} y={plot.t} className={corner}>
                                ↖ {t('mapOnlyHigh', { m: shortLabel(ym) })}
                            </text>
                            <text x={plot.r} y={plot.b} textAnchor="end" className={corner}>
                                {t('mapOnlyHigh', { m: shortLabel(xm) })} ↘
                            </text>
                            <text x={plot.l} y={plot.b} className={corner}>
                                ↙ {t('mapBothLow')}
                            </text>
                        </g>

                        {points.map((d) => (
                            <circle
                                key={d.p.id}
                                cx={d.x}
                                cy={d.y}
                                r={d.r}
                                strokeWidth={shown?.id === d.p.id ? 3 : 1}
                                className={cx(
                                    'cursor-pointer transition-opacity hover:stroke-primary hover:stroke-2',
                                    shown?.id === d.p.id ? 'stroke-primary' : 'stroke-surface',
                                    d.on ? (TYPE_COLOR_CLASSES[d.colorType]?.dot ?? 'fill-secondary') : 'fill-secondary opacity-15',
                                )}
                                onMouseEnter={() => setHover(d.p)}
                                onMouseLeave={() => setHover(null)}
                                onClick={() => (isTouch() ? setPicked(d.p) : navigate(`/pokemon/${d.p.id}`))}
                            />
                        ))}

                        {labeled.map(({ d, name, tx, ty, anchor }) => (
                            <g key={d.p.id} className="pointer-events-none">
                                <circle cx={d.x} cy={d.y} r={d.r + 4} fill="none" className="stroke-primary" strokeWidth={2} />
                                <text x={tx} y={ty} textAnchor={anchor} className="fill-primary stroke-surface text-[13px] font-bold [paint-order:stroke]" strokeWidth={4}>
                                    {name}
                                </text>
                            </g>
                        ))}

                        {/* 정보 카드 */}
                        {shown && shownPt && (
                            <foreignObject x={cardX} y={cardY} width={CARD.w} height={CARD.h} className={cx('overflow-visible', !picked && 'pointer-events-none')}>
                                <VStack gap={1.5} className="rounded-lg border border-border bg-surface p-3 shadow-lg">
                                    <HStack gap={2} vAlign="center">
                                        <PokeImage sources={pokemonImageCandidates(shown.id, 48, { sprite: shown.sprite })} alt="" size={48} className="size-12" />
                                        <VStack gap={0.5} className="min-w-0">
                                            <Text weight="bold" maxLines={1}>
                                                {pokemonName(shown, lang)}
                                            </Text>
                                            <HStack gap={1} wrap="wrap">
                                                {shown.types.map((ty) => (
                                                    <TypeChip key={ty} type={ty} size="sm" />
                                                ))}
                                            </HStack>
                                        </VStack>
                                    </HStack>
                                    <Text type="supporting" hasTabularNumbers>
                                        {shortLabel(xm)} <Text weight="semibold">{value(xm, shown)}</Text> · {shortLabel(ym)}{' '}
                                        <Text weight="semibold">{value(ym, shown)}</Text>
                                        {xm !== 'total' && ym !== 'total' && ` · ${t('mapTotal', { n: baseStatTotal(shown) })}`}
                                    </Text>
                                    {picked && (
                                        <HStack gap={1.5}>
                                            <Button size="sm" variant="primary" label={t('mapOpen')} href={`/pokemon/${shown.id}`} />
                                            <Button size="sm" variant="ghost" label={t('mapClose')} onClick={() => setPicked(null)} />
                                        </HStack>
                                    )}
                                </VStack>
                            </foreignObject>
                        )}
                    </svg>
                </span>

                {/* 범례 */}
                <HStack gap={3} vAlign="center" wrap="wrap">
                    <Text type="supporting" color="secondary">
                        {t('mapLegendDot')} · {t('mapLegendSize')} · {t('mapLegendColor')}
                    </Text>
                    <Text type="supporting" color="secondary">
                        {narrow ? t('mapTapHint') : t('mapHoverHint')}
                    </Text>
                </HStack>
            </VStack>
        </Card>
    )
}
