/**
 * 종족값 차트: 가로 막대(값 + 길이), 0–200 고정 눈금.
 * 세대를 골랐고 현재 값과 다르면(축별이든 합계든) 현재 값을 점선 눈금·합계 옆 글자로 보이고 범례를 단다
 * (계열 2개 → 범례 필수, 색만으로 구분 안 함). 노력치처럼 관련된 한 줄은 footer 로 같은 카드 맨 아래에.
 */
import type { ReactNode } from "react"
import { Card } from "@astryxdesign/core/Card"
import { Heading } from "@astryxdesign/core/Heading"
import { HStack } from "@astryxdesign/core/HStack"
import { InfoTip } from "@astryxdesign/core/InfoTip"
import { Text } from "@astryxdesign/core/Text"
import { VStack } from "@astryxdesign/core/VStack"
import { type Lang, type TFunction, formatNumber } from "../../i18n"
import type { PokedexKey } from "../../i18n/messages/pokedex"
import { statLabel } from "../../lib/dex"
import type { GenStatKey } from "../../lib/generation"
import { isRankKey, RANK_POPULATION, rankLabel, statRank } from "../../lib/statRank"
import { StatBars } from "./StatBars"
import { STAT_SCALE_MAX, type StatDatum, buildStatData, compareTotals, statsDiffer } from "./statChartModel"

interface Props {
    /** 보여 줄 값 (세대 선택 시 그 세대 값, changedIn 포함) */
    stats: readonly { key: GenStatKey; value: number; changedIn?: number | null }[]
    /** 세대를 골랐을 때 비교할 현재 값. 아니면 null */
    current: readonly { key: GenStatKey; value: number }[] | null
    gen: number | null
    headingId: string
    /** 합계 아래 한 줄 (능력치 탭의 노력치) */
    footer?: ReactNode
    lang: Lang
    t: TFunction<PokedexKey>
}

function Legend({ gen, t }: { gen: number; t: TFunction<PokedexKey> }) {
    return (
        <HStack as="ul" gap={3} vAlign="center" wrap="wrap" aria-label={t("legendLabel")}>
            <HStack as="li" gap={1.5} vAlign="center">
                <svg className="h-2 w-4 shrink-0" aria-hidden>
                    <rect width="100%" height="100%" rx={2} className="fill-secondary" />
                </svg>
                <Text type="supporting">{t("legendSelectedGen", { gen })}</Text>
            </HStack>
            <HStack as="li" gap={1.5} vAlign="center">
                <svg className="h-2 w-4 shrink-0" aria-hidden>
                    <line x1={0} x2="100%" y1="50%" y2="50%" className="stroke-primary" strokeWidth={2} strokeDasharray="3 2" />
                </svg>
                <Text type="supporting">{t("legendCurrent")}</Text>
            </HStack>
        </HStack>
    )
}

export function BaseStatsChart({ stats, current, gen, headingId, footer, lang, t }: Props) {
    const compare = gen !== null ? current : null
    const data = buildStatData(stats, compare)
    const totals = compareTotals(data, compare)
    // 축별 눈금은 다른 값이 있을 때만, 범례는 축이나 합계 중 하나라도 다르면
    const showCurrent = gen !== null && statsDiffer(data)
    const showLegend = gen !== null && (showCurrent || totals.differs)
    const fullLabel = (d: StatDatum) => (d.key === "special" ? t("specialStat") : statLabel(d.key, lang))

    // 분포: 전체 포켓몬(폼 제외, 현재 값) 중 상위 몇 %인지. 1세대 특수처럼 모집단이 없는 값은 빈칸
    // 위쪽 절반은 "상위 N%", 아래쪽 절반은 "하위 N%"(소수 첫째 자리). 맨 끝은 단독·공동 1위 / 최하위
    // long(말풍선·스크린리더): "1,025종 중 123위 (상위 12.0%)"처럼 순위까지 문장으로
    const rankOf = (key: string, value: number, long = false) => {
        const r = isRankKey(key) ? statRank(key, value) : null
        if (!r) return null
        const l = rankLabel(r)
        const n = (v: number) => formatNumber(v, lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        const all = formatNumber(RANK_POPULATION, lang)
        const short = (() => {
            switch (l.kind) {
                case "first":
                    return l.tied > 1 ? (long ? t("rankTiedFirstTip", { n: l.tied }) : t("rankTiedFirst")) : t("rankSoleFirst")
                case "last":
                    return l.tied > 1 ? (long ? t("rankTiedLastTip", { n: l.tied }) : t("rankTiedLast")) : t("rankSoleLast")
                case "top":
                    return t("topPercent", { n: n(l.percent) })
                case "bottom":
                    return t("bottomPercent", { n: n(l.percent) })
            }
        })()
        if (!long) return short
        if (l.kind === "first" || l.kind === "last") return t("rankEndOfAll", { all, label: short })
        return t("rankOfAll", { all, rank: formatNumber(r.rank, lang), pct: short })
    }
    const rank = (d: StatDatum) => rankOf(d.key, d.value)
    const tip = (d: StatDatum) => {
        const r = rankOf(d.key, d.value, true)
        const withRank = (s: string) => (r ? `${s} · ${r}` : s)
        if (gen !== null && d.current !== null && d.current !== d.value) {
            const base = `${fullLabel(d)} — ${t("statTipCompare", { gen, v: d.value, c: d.current })}`
            return withRank(d.changedIn != null ? `${base} (${t("changedInGen", { gen: d.changedIn })})` : base)
        }
        return withRank(d.isTop ? `${fullLabel(d)} ${d.value} · ${t("highestStat")}` : `${fullLabel(d)} ${d.value}`)
    }
    const hint = data.some((d) => d.key === "special")
        ? `${t("statScaleHint", { max: STAT_SCALE_MAX })} ${t("specialStatNote")}`
        : t("statScaleHint", { max: STAT_SCALE_MAX })
    const fullHint = `${hint} ${t("topPercentHint", { n: formatNumber(RANK_POPULATION, lang) })}`

    return (
        <Card>
            <section aria-labelledby={headingId}>
                <VStack gap={3}>
                    <HStack gap={3} vAlign="center" justify="between" wrap="wrap">
                        <HStack gap={1.5} vAlign="center">
                            <Heading level={2} id={headingId}>
                                {t("baseStats")}
                            </Heading>
                            <InfoTip content={fullHint} label={t("infoAbout", { label: t("baseStats") })} />
                        </HStack>
                        {showLegend && gen !== null && <Legend gen={gen} t={t} />}
                    </HStack>
                    <StatBars
                        data={data}
                        label={fullLabel}
                        tip={tip}
                        showCurrent={showCurrent}
                        total={{
                            label: t("total"),
                            value: totals.selected,
                            rank: rankOf("total", totals.selected),
                            note: gen !== null && totals.differs && totals.current !== null ? t("statTipCompare", { gen, v: totals.selected, c: totals.current }) : null,
                        }}
                        listLabel={t("baseStats")}
                        rank={rank}
                    />
                    {footer}
                </VStack>
            </section>
        </Card>
    )
}
