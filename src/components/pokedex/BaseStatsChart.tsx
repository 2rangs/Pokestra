/**
 * 종족값 차트: 가로 막대(값 + 길이) | 방사형(분포 모양). 둘 다 0–255 고정 눈금.
 * 세대를 골랐고 현재 값과 다르면 현재 값을 점선으로 겹치고 범례를 단다(계열 2개 → 범례 필수, 색만으로 구분 안 함).
 */
import { type ReactNode, useState } from "react"
import { Card } from "@astryxdesign/core/Card"
import { Heading } from "@astryxdesign/core/Heading"
import { HStack } from "@astryxdesign/core/HStack"
import { InfoTip } from "@astryxdesign/core/InfoTip"
import { Text } from "@astryxdesign/core/Text"
import { VStack } from "@astryxdesign/core/VStack"
import type { Lang, TFunction } from "../../i18n"
import type { PokedexKey } from "../../i18n/messages/pokedex"
import { statLabel } from "../../lib/dex"
import type { GenStatKey } from "../../lib/generation"
import { TYPE_COLOR_CLASSES, type TypeColorClasses } from "../../lib/typeColorClasses"
import { StatBars } from "./StatBars"
import { StatRadar } from "./StatRadar"
import { type StatDatum, buildStatData, statsDiffer } from "./statChartModel"

interface Props {
    /** 보여 줄 값 (세대 선택 시 그 세대 값, changedIn 포함) */
    stats: readonly { key: GenStatKey; value: number; changedIn?: number | null }[]
    /** 세대를 골랐을 때 비교할 현재 값. 아니면 null */
    current: readonly { key: GenStatKey; value: number }[] | null
    gen: number | null
    /** 첫 번째 타입 (막대·면 색) */
    type: string | undefined
    headingId: string
    /** 차트 오른쪽(좁은 화면은 아래)에 붙는 관련 정보 (능력치 탭의 노력치) */
    aside?: ReactNode
    lang: Lang
    t: TFunction<PokedexKey>
}

function Legend({ gen, colors, t }: { gen: number; colors: TypeColorClasses; t: TFunction<PokedexKey> }) {
    return (
        <HStack as="ul" gap={3} vAlign="center" wrap="wrap" aria-label={t("statDistribution")}>
            <HStack as="li" gap={1.5} vAlign="center">
                <svg className="h-2 w-4 shrink-0" aria-hidden>
                    <rect width="100%" height="100%" rx={2} className={colors.fill} />
                </svg>
                <Text type="supporting">{t("legendSelectedGen", { gen })}</Text>
            </HStack>
            <HStack as="li" gap={1.5} vAlign="center">
                <svg className="h-2 w-4 shrink-0" aria-hidden>
                    <line x1={0} x2="100%" y1="50%" y2="50%" className="stroke-secondary" strokeWidth={2} strokeDasharray="3 2" />
                </svg>
                <Text type="supporting">{t("legendCurrent")}</Text>
            </HStack>
        </HStack>
    )
}

export function BaseStatsChart({ stats, current, gen, type, headingId, aside, lang, t }: Props) {
    const [active, setActive] = useState<GenStatKey | null>(null)
    const colors = TYPE_COLOR_CLASSES[type ?? ""] ?? TYPE_COLOR_CLASSES.normal
    const data = buildStatData(stats, gen !== null ? current : null)
    const showCurrent = gen !== null && statsDiffer(data)
    const fullLabel = (d: StatDatum) => (d.key === "special" ? t("specialStat") : statLabel(d.key, lang))
    const shortLabel = (d: StatDatum) => (d.key === "special" ? t("specialStat") : statLabel(d.key, lang, true))

    const tip = (d: StatDatum) => {
        if (showCurrent && gen !== null && d.current !== null) {
            const base = `${fullLabel(d)} — ${t("statTipCompare", { gen, v: d.value, c: d.current })}`
            return d.changedIn != null ? `${base} (${t("changedInGen", { gen: d.changedIn })})` : base
        }
        return d.isTop ? `${fullLabel(d)} ${d.value} · ${t("highestStat")}` : `${fullLabel(d)} ${d.value}`
    }

    const total = data.reduce((s, d) => s + d.value, 0)
    // 현재 합계는 현재 능력치 6개 전부 (1세대 특수를 특공으로 견준 5축 합이 아니다)
    const currentTotal = showCurrent && current ? current.reduce((s, c) => s + c.value, 0) : null
    // 1세대 특수를 오각형으로 그린다는 설명은 눈금 설명과 함께 ⓘ 에
    const hint = data.some((d) => d.key === "special") ? `${t("statScaleHint")} ${t("specialRadarNote")}` : t("statScaleHint")

    return (
        <Card>
            <section aria-labelledby={headingId}>
                <VStack gap={3}>
                    <HStack gap={3} vAlign="center" justify="between" wrap="wrap">
                        <HStack gap={1.5} vAlign="center">
                            <Heading level={2} id={headingId}>
                                {t("baseStats")}
                            </Heading>
                            <InfoTip content={hint} label={t("infoAbout", { label: t("baseStats") })} />
                        </HStack>
                        {showCurrent && gen !== null && <Legend gen={gen} colors={colors} t={t} />}
                    </HStack>
                    <HStack gap={6} vAlign="center" wrap="wrap" justify="center">
                        <StatBars
                            data={data}
                            label={fullLabel}
                            tip={tip}
                            showCurrent={showCurrent}
                            colors={colors}
                            total={{
                                label: t("total"),
                                value: total,
                                current: currentTotal,
                                tip: gen !== null && currentTotal !== null ? t("statTipCompare", { gen, v: total, c: currentTotal }) : "",
                            }}
                            listLabel={t("baseStats")}
                            active={active}
                            onActive={setActive}
                        />
                        <StatRadar
                            data={data}
                            axisLabel={shortLabel}
                            tip={tip}
                            readout={(d) =>
                                showCurrent && d.current !== null && d.current !== d.value ? `${d.value} · ${t("legendCurrent")} ${d.current}` : String(d.value)
                            }
                            showCurrent={showCurrent}
                            colors={colors}
                            label={t("statDistribution")}
                            active={active}
                            onActive={setActive}
                        />
                        {aside && (
                            <VStack gap={2} className="w-full shrink-0 self-stretch lg:w-56 lg:border-s lg:border-border lg:ps-6">
                                {aside}
                            </VStack>
                        )}
                    </HStack>
                </VStack>
            </section>
        </Card>
    )
}
