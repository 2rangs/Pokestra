import { type ReactNode, Fragment, useEffect, useMemo } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router"
import { Button } from "@astryxdesign/core/Button"
import { Card } from "@astryxdesign/core/Card"
import { EmptyState } from "@astryxdesign/core/EmptyState"
import { Heading } from "@astryxdesign/core/Heading"
import { HStack } from "@astryxdesign/core/HStack"
import { Icon } from "@astryxdesign/core/Icon"
import { InfoTip } from "@astryxdesign/core/InfoTip"
import { Link } from "@astryxdesign/core/Link"
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList"
import { Skeleton } from "@astryxdesign/core/Skeleton"
import { Tab, TabList } from "@astryxdesign/core/TabList"
import { Text } from "@astryxdesign/core/Text"
import { Token } from "@astryxdesign/core/Token"
import { VStack } from "@astryxdesign/core/VStack"
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden"
import BattleStatsPanel from "../../components/BattleStatsPanel"
import { BaseStatsChart } from "../../components/pokedex/BaseStatsChart"
import { DefenseMatchups } from "../../components/pokedex/DefenseMatchups"
import { DetailHeader, NeighborNav, type StripItem } from "../../components/pokedex/DetailHeader"
import { type Fact, FactList, LoadError, Panel, SkeletonRows } from "../../components/pokedex/DetailPanel"
import { EvolutionTree } from "../../components/pokedex/EvolutionChain"
import { dexNumber, ROMAN } from "../../components/pokedex/format"
import { MovesPanel } from "../../components/pokedex/MovesPanel"
import { SpritesGallery } from "../../components/pokedex/SpritesGallery"
import { GenderToggle } from "../../components/pokedex/GenderToggle"
import { CryButtons, GenerationSelect } from "../../components/pokedex/GenerationBar"
import { TypeChip } from "../../components/ui/TypeChip"
import { getIdFromUrl } from "../../common/utils"
import {
    type PokemonSpecies,
    useEvolutionChain,
    usePokemonDetail,
    usePokemonSpecies,
} from "../../hooks/usePokemon"
import { LANGS, type Lang, formatNumber, useDocumentTitle, useLang, useT } from "../../i18n"
import { commonMessages } from "../../i18n/messages/common"
import { type PokedexKey, isPokedexKey, pokedexMessages } from "../../i18n/messages/pokedex"
import { itemName } from "../../lib/battle"
import { parseSex } from "../../lib/gender"
import { LATEST_GEN, type GenStatKey, abilitiesAt, clampGen, cryAt, femaleArtAt, spriteAt, statsAt, typesAt } from "../../lib/generation"
import { pokemonImageCandidates, preloadImages } from "../../lib/images"
import { PokeImage } from "../../components/ui/PokeImage"
import {
    ABILITY_BY_NAME,
    ALL_POKEMON,
    STAT_KEYS,
    type DexPokemon,
    type StatKey,
    abilityName,
    eggGroupName,
    API_STAT_KEY,
    findDexPokemonByName,
    formLabel,
    generationName,
    getDexPokemon,
    getGeneration,
    getSpeciesId,
    localText,
    officialArtworkUrl,
    pokemonName,
    statLabel,
    titleCaseSlug,
} from "../../lib/dex"

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** URL 파라미터(id 또는 slug)로 로컬 도감 데이터 찾기 */
function resolveLocal(param: string): DexPokemon | undefined {
    const s = param.trim()
    if (!s) return undefined
    if (/^\d+$/.test(s)) return getDexPokemon(Number(s))
    return findDexPokemonByName(s)
}

/** PokeAPI 언어 코드 우선순위 */
const API_LANG_CODES: Record<Lang, readonly string[]> = {
    ko: ["ko", "en"],
    en: ["en"],
    ja: ["ja", "ja-Hrkt", "en"],
}

/** 현재 언어에 맞는 항목 (last = 같은 언어 중 가장 최근 항목) */
function pickByLang<E extends { language: { name: string } }>(
    entries: readonly E[] | undefined,
    lang: Lang,
    last = false,
): E | undefined {
    if (!entries) return undefined
    for (const code of API_LANG_CODES[lang]) {
        const matches = entries.filter((e) => e.language.name === code)
        if (matches.length) return last ? matches[matches.length - 1] : matches[0]
    }
    return undefined
}

function cleanFlavor(text: string, code: string): string {
    // 한자 일본어 텍스트는 줄바꿈이 단어 경계가 아니므로 그냥 붙인다
    const joined = code === "ja" ? text.replace(/[\n\f\r]+/g, "") : text.replace(/­?[\n\f\r]+/g, " ")
    return joined.replace(/[ \t]+/g, " ").trim()
}

type DetailTab = "overview" | "stats" | "moves" | "sprites"
const TABS: readonly DetailTab[] = ["overview", "stats", "moves", "sprites"]
const TAB_LABEL: Record<DetailTab, PokedexKey> = {
    overview: "tabOverview",
    stats: "tabStats",
    moves: "tabMoves",
    sprites: "tabSprites",
}
function parseTab(v: string | null): DetailTab {
    return TABS.includes(v as DetailTab) ? (v as DetailTab) : "overview"
}

// ─── Page pieces ──────────────────────────────────────────────────────────────

/** 휴대폰에서 44px 터치 높이를 갖는 줄 */
function TapRow({ children, as }: { children: ReactNode; as?: "span" }) {
    return (
        <HStack as={as} gap={1} vAlign="center" className="min-h-11 sm:min-h-0">
            {children}
        </HStack>
    )
}

/**
 * 개요 탭: lg 이상 2열(왼쪽 넓게 2 : 오른쪽 1). 그 아래는 두 열이 display:contents 로 풀려 한 열이 되고,
 * order 로 순서를 정한다(진화처럼 긴 칸은 order-last 로 맨 뒤).
 */
function TwoColumns({ main, side }: { main: ReactNode; side: ReactNode }) {
    return (
        <VStack gap={3} className="lg:flex-row lg:items-start">
            <VStack gap={3} className="contents lg:flex lg:min-w-0 lg:flex-2">
                {main}
            </VStack>
            <VStack gap={3} className="contents lg:flex lg:min-w-0 lg:flex-1">
                {side}
            </VStack>
        </VStack>
    )
}

function DetailSkeleton({ label }: { label: string }) {
    // 실제 머리말과 같은 틀: 뒤로 링크 → 머리말(이전/다음 → 이미지 + 신원 + 수치 줄 + 조작 줄 + 설명) → 탭 줄.
    // 로컬 도감에 없는 항목은 다른 폼(세대 선택 없음)뿐이라 조작 줄은 울음소리 자리만 잡는다.
    const strip: StripItem[] = [0, 1, 2, 3].map(() => ({ label: "\u00a0", value: <Skeleton width={56} height={28} /> }))
    return (
        <VStack gap={4} role="status" aria-live="polite">
            <VisuallyHidden>{label}</VisuallyHidden>
            <TapRow>
                <Skeleton width={112} height={20} />
            </TapRow>
            <DetailHeader
                nav={
                    <HStack justify="end" className="min-h-11 sm:min-h-8">
                        <Skeleton width={180} height={20} />
                    </HStack>
                }
                image={{ sources: [], alt: "" }}
                number={<Skeleton width={64} height={20} />}
                name={<Skeleton width={160} height={36} />}
                badges={<Skeleton width={72} height={24} />}
                subline={<Skeleton width={200} height={24} />}
                strip={strip}
                controls={<Skeleton width={96} height={28} />}
                flavor={
                    <VStack gap={1}>
                        <Skeleton height={20} />
                        <Skeleton width="60%" height={20} />
                    </VStack>
                }
            />
            <Skeleton height={37} />
        </VStack>
    )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PokemonDetailPage() {
    const { id: param = "" } = useParams()
    const navigate = useNavigate()
    const lang = useLang()
    const t = useT(pokedexMessages)
    const tc = useT(commonMessages)
    const [searchParams, setSearchParams] = useSearchParams()
    const tab = parseTab(searchParams.get("tab"))
    const setTab = (next: DetailTab) =>
        setSearchParams(
            (prevParams) => {
                const q = new URLSearchParams(prevParams)
                if (next === "overview") q.delete("tab")
                else q.set("tab", next)
                return q
            },
            { replace: true },
        )

    const local = useMemo(() => resolveLocal(param), [param])
    const apiKey = local ? String(local.id) : param.trim().toLowerCase()
    const detailQ = usePokemonDetail(apiKey)
    const detail = detailQ.data

    const speciesId = local ? getSpeciesId(local) : getIdFromUrl(detail?.species.url)
    const speciesQ = usePokemonSpecies(speciesId)
    const species: PokemonSpecies | undefined = speciesQ.data
    const evoQ = useEvolutionChain(species?.evolution_chain?.url)

    // 세대 타임라인: 등장 세대 미만·최신 세대는 null(현재 값)
    const generation = local ? getGeneration(local) : ROMAN[species?.generation.name.replace("generation-", "") ?? ""]
    const debut = generation ?? 1
    const debutLabel = generation ? generationName(generation, lang) : "-"
    // 메가 등 다른 폼(API id > 10000)은 세대별 기록이 없으므로 ?gen 을 무시한다
    const isAltForm = (local?.id ?? detail?.id ?? 0) > 10000
    const gen = isAltForm ? null : clampGen(Number(searchParams.get("gen")) || null, debut)
    // 세대 값은 PokeAPI 응답이 필요하다. 아직 없거나 실패하면 현재 값을 그대로 보여 준다.
    const genDetail = gen !== null && detail ? detail : null
    const setGen = (next: number | null) =>
        setSearchParams(
            (prevParams) => {
                const q = new URLSearchParams(prevParams)
                if (next === null) q.delete("gen")
                else q.set("gen", String(next))
                return q
            },
            { replace: true },
        )

    // 암수 모습: 기본(수컷)은 파라미터 없음, ?sex=f 만 기록. 로컬 도감에 있으면 처음부터 알 수 있어 토글이 늦게 끼어들지 않는다
    const hasGenderDiff = !isAltForm && (local ? local.genderDiff : species?.has_gender_differences === true)
    const sex = hasGenderDiff ? parseSex(searchParams.get("sex")) : "m"
    const setSex = (next: "m" | "f") =>
        setSearchParams(
            (prevParams) => {
                const q = new URLSearchParams(prevParams)
                if (next === "m") q.delete("sex")
                else q.set("sex", next)
                return q
            },
            { replace: true },
        )

    const typesView = useMemo(
        () => (genDetail && gen !== null ? typesAt(genDetail, gen) : null),
        [genDetail, gen],
    )
    // 상성표는 세대와 상관없이 현재 타입 기준
    const currentTypes = useMemo(
        () => local?.types ?? detail?.types.slice().sort((a, b) => a.slot - b.slot).map((x) => x.type.name) ?? [],
        [local, detail],
    )
    const types = useMemo(() => typesView?.value ?? currentTypes, [typesView, currentTypes])

    const name = local
        ? pokemonName(local, lang)
        : (pickByLang(species?.names, lang)?.name ?? (detail ? titleCaseSlug(detail.name) : ""))
    const form = local ? formLabel(local, lang) : null
    useDocumentTitle(name ? (form ? `${name} (${form})` : name) : t("title"))

    const otherNames = useMemo(() => {
        if (!local) return []
        const seen = new Set([pokemonName(local, lang)])
        const out: { n: string; lang: Lang }[] = []
        for (const l of LANGS) {
            const n = pokemonName(local, l)
            if (seen.has(n)) continue
            seen.add(n)
            out.push({ n, lang: l })
        }
        return out
    }, [local, lang])

    const flavorEntry = pickByLang(species?.flavor_text_entries, lang, true)
    const flavor = flavorEntry ? cleanFlavor(flavorEntry.flavor_text, flavorEntry.language.name) : ""
    const genusEntry = pickByLang(species?.genera, lang)

    const abilities = useMemo(
        () => local?.abilities ?? detail?.abilities.map((a) => ({ name: a.ability.name, hidden: a.is_hidden })) ?? [],
        [local, detail],
    )

    const abilitiesView = useMemo(
        () => (genDetail && gen !== null ? { at: abilitiesAt(genDetail, gen) } : null),
        [genDetail, gen],
    )

    const stats = useMemo((): { key: GenStatKey; value: number; changedIn?: number | null }[] => {
        if (genDetail && gen !== null) return statsAt(genDetail, gen)
        if (local) return STAT_KEYS.map((k) => ({ key: k, value: local.stats[k] }))
        return (detail?.stats ?? [])
            .map((s) => ({ key: API_STAT_KEY[s.stat.name], value: s.base_stat }))
            .filter((s): s is { key: StatKey; value: number } => !!s.key)
    }, [local, detail, genDetail, gen])
    // 세대를 골랐을 때 비교할 현재 값
    const currentStats = useMemo((): { key: GenStatKey; value: number }[] => {
        if (local) return STAT_KEYS.map((k) => ({ key: k, value: local.stats[k] }))
        return (detail?.stats ?? [])
            .map((s) => ({ key: API_STAT_KEY[s.stat.name], value: s.base_stat }))
            .filter((s): s is { key: StatKey; value: number } => !!s.key)
    }, [local, detail])
    const statTotal = stats.reduce((sum, s) => sum + s.value, 0)

    const forms = useMemo(() => (speciesId ? ALL_POKEMON.filter((p) => getSpeciesId(p) === speciesId) : []), [speciesId])

    // 이전/다음: 전국도감 번호 기준 (기본 폼)
    const prev = speciesId ? getDexPokemon(speciesId - 1) : undefined
    const next = speciesId ? getDexPokemon(speciesId + 1) : undefined

    // 이전/다음 이동 시 탭·세대·암수 선택을 유지 (이웃에 없던 세대면 그쪽에서 현재 값으로 보정, 암수 차이가 없으면 무시)
    const neighborSearch = useMemo(() => {
        const q = new URLSearchParams()
        if (tab !== "overview") q.set("tab", tab)
        if (gen !== null) q.set("gen", String(gen))
        if (sex === "f") q.set("sex", "f")
        const str = q.toString()
        return str ? `?${str}` : ""
    }, [tab, gen, sex])

    // 다른 포켓몬으로 이동하면 맨 위로
    useEffect(() => {
        window.scrollTo({ top: 0 })
    }, [param])

    // 왼쪽/오른쪽 방향키로 이전/다음 포켓몬
    useEffect(() => {
        const onKey = (e: globalThis.KeyboardEvent) => {
            if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
            const el = e.target as HTMLElement | null
            if (el?.closest("input, textarea, select, [contenteditable], [role=tablist], [role=radiogroup], [role=listbox]")) return
            const target = e.key === "ArrowLeft" ? prev : e.key === "ArrowRight" ? next : undefined
            if (target) navigate(`/pokemon/${target.id}${neighborSearch}`)
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [prev, next, navigate, neighborSearch])

    // 이전/다음 아트워크를 한가할 때 미리 받아 둔다
    const prevId = prev?.id
    const nextId = next?.id
    useEffect(() => {
        const urls = [prevId, nextId].filter((n): n is number => n != null).map(officialArtworkUrl)
        preloadImages(urls)
    }, [prevId, nextId])

    // ── Guards ──
    if (!local) {
        if (apiKey && detailQ.isPending) return <DetailSkeleton label={tc("loading")} />
        if (!detail) {
            const notFound = !apiKey || (detailQ.error instanceof Error && detailQ.error.message.endsWith("404"))
            return notFound ? (
                <EmptyState
                    headingLevel={1}
                    title={t("notFoundTitle")}
                    description={t("notFoundBody", { id: param })}
                    actions={<Button href="/pokedex" variant="primary" label={t("backToDex")} />}
                />
            ) : (
                <EmptyState
                    headingLevel={1}
                    title={t("loadErrorTitle")}
                    description={t("loadErrorBody")}
                    actions={
                        <>
                            <Button variant="primary" label={t("retry")} onClick={() => void detailQ.refetch()} />
                            <Button href="/pokedex" label={t("backToDex")} />
                        </>
                    }
                />
            )
        }
    }

    const id = local?.id ?? detail?.id ?? 0
    const shownNo = speciesId ?? id
    const currentNote = gen !== null ? <Text type="supporting" color="secondary">{t("currentValuesNote")}</Text> : undefined
    const artwork = local ? officialArtworkUrl(local.id) : (detail?.sprites.other?.["official-artwork"]?.front_default ?? "")
    const spriteFallback = local?.sprite ?? detail?.sprites.front_default ?? null
    // 머리말 이미지 후보: 세대 도트(로딩 중엔 빈 칸, 실패하면 일러스트로) / 현재 일러스트. 암컷이면 암컷 그림부터
    const headerSources =
        gen !== null
            ? genDetail
                ? [spriteAt(genDetail.sprites, gen, { female: sex === "f" }), artwork]
                : detailQ.isError
                  ? [artwork, spriteFallback]
                  : []
            : sex === "f" && detail
              ? [femaleArtAt(detail.sprites), artwork, spriteFallback]
              : [artwork, spriteFallback]
    const decimal = { minimumFractionDigits: 1, maximumFractionDigits: 1 }

    const genderRate = species?.gender_rate
    const genderText =
        genderRate == null
            ? null
            : genderRate === -1
              ? t("genderless")
              : genderRate === 0
                ? t("maleOnly")
                : genderRate === 8
                  ? t("femaleOnly")
                  : t("genderRatio", {
                        m: formatNumber((1 - genderRate / 8) * 100, lang, { maximumFractionDigits: 1 }),
                        f: formatNumber((genderRate / 8) * 100, lang, { maximumFractionDigits: 1 }),
                    })

    const growthKey = species ? `growth_${species.growth_rate.name}` : ""
    const colorKey = species ? `color_${species.color.name}` : ""
    const retry = t("retry")
    const pendingValue = detailQ.isError ? "-" : <Skeleton width={56} height={28} />
    const moveCount = detail?.moves.length ?? local?.moves.length
    const hint = (label: string, content: string) => ({ label: t("infoAbout", { label }), content })

    // ── 머리말 ──
    const subline = (
        <Text color="secondary" className="break-keep">
            {otherNames.map((o, i) => (
                <Fragment key={o.n}>
                    {i > 0 && " · "}
                    <span lang={o.lang}>{o.n}</span>
                </Fragment>
            ))}
            {genusEntry ? `${otherNames.length > 0 ? " · " : ""}${genusEntry.genus}` : null}
        </Text>
    )
    const flavorNode = flavor ? (
        <span lang={flavorEntry?.language.name.split("-")[0]} className="block max-w-prose break-keep">
            <Text as="p">{flavor}</Text>
        </span>
    ) : speciesQ.isPending && speciesId ? (
        <VStack gap={1}>
            <Skeleton height={20} />
            <Skeleton width="60%" height={20} />
        </VStack>
    ) : null

    // ── 개요 오른쪽 열: 종 정보 · 교배 ──
    const speciesFacts: Fact[] = species
        ? [
              {
                  label: t("growthRate"),
                  value: isPokedexKey(growthKey) ? t(growthKey) : titleCaseSlug(species.growth_rate.name),
                  hint: hint(t("growthRate"), t("growthRateHint")),
              },
              {
                  label: t("captureRate"),
                  value: `${species.capture_rate} (${formatNumber((species.capture_rate / 255) * 100, lang, { maximumFractionDigits: 1 })}%)`,
                  hint: hint(t("captureRate"), t("captureRateHint")),
              },
              { label: t("baseHappiness"), value: species.base_happiness ?? "-", hint: hint(t("baseHappiness"), t("baseHappinessHint")) },
              { label: t("baseExp"), value: detail ? (detail.base_experience ?? "-") : "-", hint: hint(t("baseExp"), t("baseExpHint")) },
              { label: t("color"), value: isPokedexKey(colorKey) ? t(colorKey) : titleCaseSlug(species.color.name) },
          ]
        : []
    const breedingFacts: Fact[] = species
        ? [
              { label: t("gender"), value: genderText ?? "-" },
              ...(species.hatch_counter != null
                  ? [
                        {
                            label: t("eggCycles"),
                            value: t("eggCyclesValue", { n: species.hatch_counter, steps: (species.hatch_counter + 1) * 255 }),
                            hint: hint(t("eggCycles"), t("eggCyclesHint")),
                        },
                    ]
                  : []),
              ...(species.egg_groups && species.egg_groups.length > 0
                  ? [
                        {
                            label: t("eggGroups"),
                            value: (
                                <>
                                    {species.egg_groups.map((g) => (
                                        <Token key={g.name} size="sm" label={eggGroupName(g.name, lang)} />
                                    ))}
                                </>
                            ),
                        },
                    ]
                  : []),
          ]
        : []

    // 개요(왼쪽 열 맨 위)와 능력치 탭(오른쪽에 노력치)이 같은 차트를 쓴다
    const statsChart = (aside?: ReactNode) => (
        <BaseStatsChart
            stats={stats}
            current={gen !== null ? currentStats : null}
            gen={gen}
            type={types[0]}
            headingId="base-stats-title"
            aside={aside}
            lang={lang}
            t={t}
        />
    )
    const shownAbilities = abilitiesView?.at?.value ?? abilities
    const cry = cryAt(detail?.cries, gen ?? LATEST_GEN)

    return (
        <VStack gap={4}>
            <HStack>
                <Link href="/pokedex" hasUnderline={false}>
                    <TapRow as="span">
                        <Icon icon="chevronLeft" size="sm" />
                        {t("backToDex")}
                    </TapRow>
                </Link>
            </HStack>

            {/* ── 머리말: 이전/다음 → 이미지 → 번호·이름·타입 → 수치 줄 → 조작 줄 → 설명 ── */}
            <DetailHeader
                type={types[0]}
                nav={
                    <NeighborNav
                        prev={prev}
                        next={next}
                        lang={lang}
                        search={neighborSearch}
                        labels={{ nav: t("neighbors"), prev: t("prev"), next: t("next"), hint: t("keyboardHint") }}
                    />
                }
                image={{
                    key: id,
                    sources: headerSources,
                    alt: gen !== null ? t("spriteAltGen", { name, gen }) : t("artworkAlt", { name }),
                    priority: true,
                }}
                number={
                    <Text type="supporting" hasTabularNumbers>
                        {dexNumber(shownNo)}
                    </Text>
                }
                name={
                    <VStack gap={0.5} className="min-w-0">
                        <Heading level={1}>{name}</Heading>
                        {form && (
                            <Text type="large" color="secondary">
                                {form}
                            </Text>
                        )}
                    </VStack>
                }
                badges={
                    <>
                        {types.map((ty) => (
                            <TypeChip key={ty} type={ty} />
                        ))}
                        {typesView?.changedIn != null && (
                            <Token size="sm" color="yellow" label={t("changedInGen", { gen: typesView.changedIn })} />
                        )}
                        {species?.is_legendary && <Token size="sm" color="yellow" label={t("legendary")} />}
                        {species?.is_mythical && <Token size="sm" color="pink" label={t("mythical")} />}
                        {species?.is_baby && <Token size="sm" color="purple" label={t("baby")} />}
                    </>
                }
                subline={otherNames.length > 0 || genusEntry ? subline : speciesQ.isPending && speciesId ? <Skeleton width={200} height={24} /> : null}
                strip={[
                    { label: t("height"), value: detail ? `${formatNumber(detail.height / 10, lang, decimal)} m` : pendingValue },
                    { label: t("weight"), value: detail ? `${formatNumber(detail.weight / 10, lang, decimal)} kg` : pendingValue },
                    { label: t("statTotal"), value: statTotal },
                    { label: t("debut"), value: debutLabel },
                ]}
                controls={
                    <>
                        {/* 다른 폼은 세대 기록이 없어 세대 선택을 뺀다 */}
                        {!isAltForm && <GenerationSelect debut={debut} gen={gen} onChange={setGen} lang={lang} t={t} />}
                        {hasGenderDiff && <GenderToggle value={sex} onChange={setSex} t={t} />}
                        <CryButtons cry={cry} debut={debut} legacyFirst={gen !== null && gen <= 5} loading={!detail} t={t} />
                    </>
                }
                flavor={flavorNode}
            />

            {/* ── 탭 ── */}
            <TabList value={tab} onChange={(v) => setTab(parseTab(v))} role="tablist" aria-label={t("detailTabs")} hasDivider>
                {TABS.map((key) => (
                    <Tab
                        key={key}
                        id={`pokemon-tab-${key}`}
                        value={key}
                        label={t(TAB_LABEL[key])}
                        panelId={`pokemon-panel-${key}`}
                        endContent={
                            key === "moves" && moveCount ? (
                                <Text type="supporting" hasTabularNumbers>
                                    {moveCount}
                                </Text>
                            ) : undefined
                        }
                    />
                ))}
            </TabList>

            <div role="tabpanel" id={`pokemon-panel-${tab}`} aria-labelledby={`pokemon-tab-${tab}`} tabIndex={-1} className="focus:outline-none">
                {tab === "overview" && (
                    <VStack gap={3}>
                        <TwoColumns
                            main={
                                <>
                                    {statsChart()}
                                    <Panel
                                        title={t("typeMatchup")}
                                        titleNote={gen !== null ? <Text type="supporting" color="secondary">{t("matchupCurrentNote")}</Text> : undefined}
                                    >
                                        <DefenseMatchups types={currentTypes} t={t} />
                                    </Panel>
                                    <Panel title={t("evolution")} className="order-last lg:order-none">
                                        {evoQ.isError || speciesQ.isError ? (
                                            <LoadError
                                                message={t("evoLoadError")}
                                                onRetry={() => void (speciesQ.isError ? speciesQ.refetch() : evoQ.refetch())}
                                                retryLabel={retry}
                                            />
                                        ) : !evoQ.data ? (
                                            species && !species.evolution_chain?.url ? (
                                                <Text color="secondary">{t("noEvolution")}</Text>
                                            ) : (
                                                <HStack gap={4}>
                                                    {[0, 1, 2].map((i) => (
                                                        <Skeleton key={i} width={120} height={128} index={i} />
                                                    ))}
                                                </HStack>
                                            )
                                        ) : evoQ.data.chain.evolves_to.length === 0 ? (
                                            <Text color="secondary">{t("noEvolution")}</Text>
                                        ) : (
                                            <HStack isScrollable paddingBlockEnd={1}>
                                                <EvolutionTree link={evoQ.data.chain} currentSpeciesId={speciesId} lang={lang} t={t} />
                                            </HStack>
                                        )}
                                    </Panel>
                                </>
                            }
                            side={
                                <>
                                    {abilitiesView && abilitiesView.at === null ? (
                                        <Panel title={t("abilities")}>
                                            <Text color="secondary">{t("noAbilitiesBeforeGen3")}</Text>
                                        </Panel>
                                    ) : (
                                        shownAbilities.length > 0 && (
                                            <Panel
                                                title={t("abilities")}
                                                titleNote={
                                                    abilitiesView?.at?.changedIn != null ? (
                                                        <Token size="sm" color="yellow" label={t("changedInGen", { gen: abilitiesView.at.changedIn })} />
                                                    ) : undefined
                                                }
                                            >
                                                <VStack as="ul" gap={2}>
                                                    {shownAbilities.map((a) => (
                                                        <VStack as="li" key={a.name} gap={0.5}>
                                                            <HStack gap={2} vAlign="center" wrap="wrap">
                                                                <Link href={`/abilities/${a.name}`} weight="semibold">
                                                                    {abilityName(a.name, lang)}
                                                                </Link>
                                                                {a.hidden && <Token size="sm" color="purple" label={t("hiddenAbility")} />}
                                                            </HStack>
                                                            <Text type="supporting" as="p">
                                                                {localText(ABILITY_BY_NAME.get(a.name)?.desc, lang) ?? t("abilityNoDesc")}
                                                            </Text>
                                                        </VStack>
                                                    ))}
                                                </VStack>
                                            </Panel>
                                        )
                                    )}

                                    <Panel title={t("species")}>
                                        {speciesQ.isError ? (
                                            <LoadError message={t("loadErrorTitle")} onRetry={() => void speciesQ.refetch()} retryLabel={retry} />
                                        ) : !species ? (
                                            <SkeletonRows n={5} />
                                        ) : (
                                            <FactList facts={speciesFacts} />
                                        )}
                                    </Panel>

                                    <Panel title={t("breeding")}>
                                        {speciesQ.isError ? (
                                            <LoadError message={t("loadErrorTitle")} onRetry={() => void speciesQ.refetch()} retryLabel={retry} />
                                        ) : !species ? (
                                            <SkeletonRows n={3} />
                                        ) : (
                                            <FactList facts={breedingFacts} />
                                        )}
                                    </Panel>

                                    {detail && detail.held_items.length > 0 && (
                                        <Panel title={t("heldItems")}>
                                            <HStack gap={1.5} wrap="wrap">
                                                {detail.held_items.map((h) => (
                                                    <Token key={h.item.name} label={itemName(h.item.name, lang)} />
                                                ))}
                                            </HStack>
                                        </Panel>
                                    )}
                                </>
                            }
                        />

                        {forms.length > 1 && (
                            <Panel title={t("forms")}>
                                <HStack as="ul" gap={2} wrap="wrap">
                                    {forms.map((f) => {
                                        const current = f.id === id
                                        const label = formLabel(f, lang) ?? pokemonName(f, lang)
                                        const icon = f.sprite ? (
                                            <PokeImage sources={pokemonImageCandidates(f.id, 24, { sprite: f.sprite })} alt="" size={24} className="size-6" />
                                        ) : undefined
                                        return (
                                            <li key={f.id} aria-current={current ? "page" : undefined}>
                                                {current ? (
                                                    <Token label={label} icon={icon} color="blue" />
                                                ) : (
                                                    <Token label={label} icon={icon} href={`/pokemon/${f.id}`} />
                                                )}
                                            </li>
                                        )
                                    })}
                                </HStack>
                            </Panel>
                        )}
                    </VStack>
                )}

                {tab === "stats" && (
                    <VStack gap={3}>
                        {statsChart(
                            <>
                                <HStack gap={1.5} vAlign="center" wrap="wrap">
                                    <Heading level={3}>{t("evYield")}</Heading>
                                    <InfoTip content={t("evYieldHint")} label={t("infoAbout", { label: t("evYield") })} />
                                    {currentNote}
                                </HStack>
                                {detail ? (
                                    detail.stats.some((s) => s.effort > 0) ? (
                                        <MetadataList label={{ width: 96 }}>
                                            {detail.stats
                                                .filter((s) => s.effort > 0)
                                                .map((s) => {
                                                    const key = API_STAT_KEY[s.stat.name]
                                                    return (
                                                        <MetadataListItem key={s.stat.name} label={key ? statLabel(key, lang) : s.stat.name}>
                                                            <Text weight="semibold" hasTabularNumbers>{`+${s.effort}`}</Text>
                                                        </MetadataListItem>
                                                    )
                                                })}
                                        </MetadataList>
                                    ) : (
                                        <Text color="secondary">{t("none")}</Text>
                                    )
                                ) : detailQ.isError ? (
                                    <LoadError message={t("loadErrorTitle")} onRetry={() => void detailQ.refetch()} retryLabel={retry} />
                                ) : (
                                    <SkeletonRows n={2} />
                                )}
                            </>,
                        )}
                        <BattleStatsPanel dexId={id} note={currentNote} />
                    </VStack>
                )}

                {tab === "moves" && (
                    <MovesPanel
                        key={id}
                        detail={detail}
                        loading={detailQ.isPending}
                        error={detailQ.isError}
                        onRetry={() => void detailQ.refetch()}
                        fallbackMoves={detailQ.isError ? local?.moves : undefined}
                        lang={lang}
                        t={t}
                        allLabel={tc("all")}
                    />
                )}

                {tab === "sprites" &&
                    (detail ? (
                        <SpritesGallery sprites={detail.sprites} lang={lang} t={t} />
                    ) : detailQ.isError ? (
                        <LoadError message={t("loadErrorTitle")} onRetry={() => void detailQ.refetch()} retryLabel={retry} />
                    ) : (
                        <Card>
                            <SkeletonRows n={4} />
                        </Card>
                    ))}
            </div>
        </VStack>
    )
}
