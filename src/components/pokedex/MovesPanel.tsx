import { type ReactNode, useMemo, useState } from "react"
import { Banner } from "@astryxdesign/core/Banner"
import { Button } from "@astryxdesign/core/Button"
import { Card } from "@astryxdesign/core/Card"
import { EmptyState } from "@astryxdesign/core/EmptyState"
import { Heading } from "@astryxdesign/core/Heading"
import { HStack } from "@astryxdesign/core/HStack"
import { Icon } from "@astryxdesign/core/Icon"
import { Link } from "@astryxdesign/core/Link"
import { Skeleton } from "@astryxdesign/core/Skeleton"
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from "@astryxdesign/core/Table"
import { Text } from "@astryxdesign/core/Text"
import { TextInput } from "@astryxdesign/core/TextInput"
import { ToggleButton } from "@astryxdesign/core/ToggleButton"
import { VStack } from "@astryxdesign/core/VStack"
import type { PokemonDetail, PokemonMoveEntry } from "../../hooks/usePokemon"
import { type Lang, type TFunction, collator } from "../../i18n"
import type { PokedexKey } from "../../i18n/messages/pokedex"
import { MOVE_BY_NAME, damageClassName, moveName, titleCaseSlug } from "../../lib/dex"
import { TypeTag } from "../ui/shared"
import { norm } from "./search"

type T = TFunction<PokedexKey>

type Method = "level-up" | "machine" | "egg" | "tutor" | "other" | "legacy"
const METHOD_ORDER: readonly Method[] = ["level-up", "machine", "egg", "tutor", "other", "legacy"]
const METHOD_LABEL: Record<Method, PokedexKey> = {
    "level-up": "methodLevelUp",
    machine: "methodMachine",
    egg: "methodEgg",
    tutor: "methodTutor",
    other: "methodOther",
    legacy: "methodLegacy",
}

interface MoveRow {
    slug: string
    method: Method
    level: number | null
}

/**
 * 습득 방법 기준으로 삼을 작품 (앞쪽 우선).
 * PokeAPI 버전 그룹 id 는 발매 순서가 아니고(일본판 복각 등), 레벨업 데이터가 없는 작품도 있어서
 * 본편 작품 목록에서 레벨업 기술이 있는 첫 작품을 고른다.
 */
const VERSION_GROUP_PRIORITY = [
    "scarlet-violet",
    "sword-shield",
    "legends-za",
    "brilliant-diamond-shining-pearl",
    "legends-arceus",
    "lets-go-pikachu-lets-go-eevee",
    "ultra-sun-ultra-moon",
    "sun-moon",
    "omega-ruby-alpha-sapphire",
    "x-y",
    "black-2-white-2",
    "black-white",
    "heartgold-soulsilver",
    "platinum",
    "diamond-pearl",
    "emerald",
    "firered-leafgreen",
    "ruby-sapphire",
    "crystal",
    "gold-silver",
    "yellow",
    "red-blue",
] as const

const VERSION_GROUP_NAME: Partial<Record<string, Record<Lang, string>>> = {
    "scarlet-violet": { ko: "스칼렛·바이올렛", en: "Scarlet & Violet", ja: "スカーレット・バイオレット" },
    "sword-shield": { ko: "소드·실드", en: "Sword & Shield", ja: "ソード・シールド" },
    "legends-za": { ko: "포켓몬 레전드 Z-A", en: "Pokémon Legends: Z-A", ja: "Pokémon LEGENDS Z-A" },
    "brilliant-diamond-shining-pearl": {
        ko: "브릴리언트 다이아몬드·샤이닝 펄",
        en: "Brilliant Diamond & Shining Pearl",
        ja: "ブリリアントダイヤモンド・シャイニングパール",
    },
    "legends-arceus": { ko: "포켓몬스터 레전드 아르세우스", en: "Pokémon Legends: Arceus", ja: "Pokémon LEGENDS アルセウス" },
    "lets-go-pikachu-lets-go-eevee": { ko: "레츠고! 피카츄·레츠고! 이브이", en: "Let's Go, Pikachu! & Eevee!", ja: "Let's Go! ピカチュウ・Let's Go! イーブイ" },
    "ultra-sun-ultra-moon": { ko: "울트라썬·울트라문", en: "Ultra Sun & Ultra Moon", ja: "ウルトラサン・ウルトラムーン" },
    "sun-moon": { ko: "썬·문", en: "Sun & Moon", ja: "サン・ムーン" },
    "omega-ruby-alpha-sapphire": { ko: "오메가루비·알파사파이어", en: "Omega Ruby & Alpha Sapphire", ja: "オメガルビー・アルファサファイア" },
    "x-y": { ko: "X·Y", en: "X & Y", ja: "X・Y" },
}

function versionGroupName(slug: string, lang: Lang): string {
    return VERSION_GROUP_NAME[slug]?.[lang] ?? titleCaseSlug(slug)
}

/** 기준 작품 + 습득 방법 목록. 기준 작품에서 배울 수 없는 기술은 "이전 작품"으로 분류 */
function buildMoveRows(entries: readonly PokemonMoveEntry[]): { game: string | null; rows: MoveRow[] } {
    const withLevelUp = new Set<string>()
    for (const e of entries) {
        for (const d of e.version_group_details) if (d.move_learn_method.name === "level-up") withLevelUp.add(d.version_group.name)
    }
    const game = VERSION_GROUP_PRIORITY.find((g) => withLevelUp.has(g)) ?? null

    const rows: MoveRow[] = []
    for (const e of entries) {
        const inLatest = e.version_group_details.filter((d) => d.version_group.name === game)
        if (inLatest.length === 0) {
            rows.push({ slug: e.move.name, method: "legacy", level: null })
            continue
        }
        const seen = new Set<string>()
        for (const d of inLatest) {
            const m = d.move_learn_method.name
            const method: Method = m === "level-up" || m === "machine" || m === "egg" || m === "tutor" ? m : "other"
            const level = method === "level-up" ? d.level_learned_at : null
            const key = `${method}:${level ?? ""}`
            if (seen.has(key)) continue
            seen.add(key)
            rows.push({ slug: e.move.name, method, level })
        }
    }
    return { game, rows }
}

function PanelFrame({ t, children }: { t: T; children: ReactNode }) {
    return (
        <Card>
            <VStack gap={4}>
                <Heading level={2}>{t("tabMoves")}</Heading>
                {children}
            </VStack>
        </Card>
    )
}

export function MovesPanel({
    detail,
    loading,
    error,
    onRetry,
    fallbackMoves,
    lang,
    t,
    allLabel,
}: {
    detail: PokemonDetail | undefined
    loading: boolean
    error: boolean
    onRetry: () => void
    fallbackMoves: readonly string[] | undefined
    lang: Lang
    t: T
    allLabel: string
}) {
    const { game, rows } = useMemo<{ game: string | null; rows: MoveRow[] }>(() => {
        if (detail) return buildMoveRows(detail.moves)
        return { game: null, rows: (fallbackMoves ?? []).map((slug) => ({ slug, method: "other", level: null })) }
    }, [detail, fallbackMoves])

    const counts = useMemo(() => {
        const c = new Map<Method, number>()
        for (const r of rows) c.set(r.method, (c.get(r.method) ?? 0) + 1)
        return c
    }, [rows])
    const methods = METHOD_ORDER.filter((m) => counts.has(m))

    const [picked, setPicked] = useState<Method | "all" | null>(null)
    const method: Method | "all" = picked && (picked === "all" || counts.has(picked)) ? picked : counts.has("level-up") ? "level-up" : "all"
    const [query, setQuery] = useState("")

    const visible = useMemo(() => {
        const q = norm(query.trim())
        const coll = collator(lang)
        const name = (slug: string) => moveName(slug, lang)
        const matches = (slug: string) => {
            if (!q) return true
            const m = MOVE_BY_NAME.get(slug)
            return [slug, m?.nameEn, m?.hasKoreanName ? m.nameKo : null, m?.nameJa].some((s) => s != null && norm(s).includes(q))
        }
        return rows
            .filter((r) => (method === "all" || r.method === method) && matches(r.slug))
            .sort(
                (a, b) =>
                    METHOD_ORDER.indexOf(a.method) - METHOD_ORDER.indexOf(b.method) ||
                    (a.level ?? 0) - (b.level ?? 0) ||
                    coll.compare(name(a.slug), name(b.slug)),
            )
    }, [rows, method, query, lang])

    const retryButton = <Button size="sm" label={t("retry")} onClick={onRetry} />

    if (loading && !fallbackMoves) {
        return (
            <PanelFrame t={t}>
                <VStack gap={2} role="status" aria-live="polite">
                    {Array.from({ length: 8 }, (_, i) => (
                        <Skeleton key={i} height={28} index={i} />
                    ))}
                </VStack>
            </PanelFrame>
        )
    }
    if (error && rows.length === 0) {
        return (
            <PanelFrame t={t}>
                <Banner status="error" title={t("loadErrorTitle")} endContent={retryButton} />
            </PanelFrame>
        )
    }

    const showLevel = method === "level-up" || method === "all"
    const options: { value: Method | "all"; label: string; count: number }[] = [
        { value: "all", label: allLabel, count: rows.length },
        ...methods.map((m) => ({ value: m, label: t(METHOD_LABEL[m]), count: counts.get(m) ?? 0 })),
    ]

    return (
        <PanelFrame t={t}>
            {error && <Banner status="error" title={t("loadErrorTitle")} endContent={retryButton} />}
            <VStack gap={3}>
                <HStack gap={1.5} wrap="wrap" role="group" aria-label={t("methodFilter")}>
                    {options.map((o) => (
                        <ToggleButton
                            key={o.value}
                            size="sm"
                            label={`${o.label} ${o.count}`}
                            isPressed={method === o.value}
                            onPressedChange={() => setPicked(o.value)}
                        />
                    ))}
                </HStack>
                <span className="block max-w-sm">
                    <TextInput
                        type="search"
                        label={t("moveSearchLabel")}
                        isLabelHidden
                        value={query}
                        onChange={(v) => setQuery(v)}
                        placeholder={t("moveSearchPlaceholder")}
                        startIcon={<Icon icon="search" />}
                        hasClear
                        width="100%"
                    />
                </span>
                {game && (
                    <Text type="supporting" as="p">
                        {t("movesNote", { game: versionGroupName(game, lang) })}
                    </Text>
                )}
            </VStack>

            {visible.length === 0 ? (
                <EmptyState title={t("noMoves")} isCompact />
            ) : (
                <div className="overflow-x-auto">
                    <Table density="compact" hasHover aria-label={t("tabMoves")}>
                        <TableHeader>
                            <TableRow isHeaderRow>
                                {showLevel && <TableHeaderCell scope="col">{t("colLevel")}</TableHeaderCell>}
                                <TableHeaderCell scope="col">{t("colMove")}</TableHeaderCell>
                                <TableHeaderCell scope="col">{t("colType")}</TableHeaderCell>
                                <TableHeaderCell scope="col">{t("colClass")}</TableHeaderCell>
                                <TableHeaderCell scope="col" className="text-right">{t("colPower")}</TableHeaderCell>
                                <TableHeaderCell scope="col" className="text-right">{t("colAccuracy")}</TableHeaderCell>
                                <TableHeaderCell scope="col" className="text-right">{t("colPP")}</TableHeaderCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visible.map((r) => {
                                const m = MOVE_BY_NAME.get(r.slug)
                                return (
                                    <TableRow key={`${r.method}:${r.slug}:${r.level ?? ""}`}>
                                        {showLevel && (
                                            <TableCell>
                                                <Text color="secondary" hasTabularNumbers>
                                                    {r.method === "level-up" ? (r.level === 0 ? t("evoMoveLevel") : r.level) : "-"}
                                                </Text>
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            <span className="flex min-w-28 flex-col">
                                                {m ? (
                                                    <Link href={`/moves/${r.slug}`} weight="medium">
                                                        {moveName(r.slug, lang)}
                                                    </Link>
                                                ) : (
                                                    <Text weight="medium">{moveName(r.slug, lang)}</Text>
                                                )}
                                                {method === "all" && r.method !== "level-up" && (
                                                    <Text type="supporting">{t(METHOD_LABEL[r.method])}</Text>
                                                )}
                                            </span>
                                        </TableCell>
                                        <TableCell>{m && <TypeTag type={m.type} size="xs" />}</TableCell>
                                        <TableCell>
                                            <Text color="secondary">{m ? damageClassName(m.damageClass, lang) : "-"}</Text>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Text hasTabularNumbers>{m?.power ?? "-"}</Text>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Text color="secondary" hasTabularNumbers>{m?.accuracy ?? "-"}</Text>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Text color="secondary" hasTabularNumbers>{m?.pp ?? "-"}</Text>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </PanelFrame>
    )
}
