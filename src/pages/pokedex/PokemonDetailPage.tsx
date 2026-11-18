import { type ReactNode, useEffect, useMemo } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router"
import { Banner } from "@astryxdesign/core/Banner"
import { Button } from "@astryxdesign/core/Button"
import { Card } from "@astryxdesign/core/Card"
import { EmptyState } from "@astryxdesign/core/EmptyState"
import { Grid } from "@astryxdesign/core/Grid"
import { Heading } from "@astryxdesign/core/Heading"
import { HStack } from "@astryxdesign/core/HStack"
import { Icon } from "@astryxdesign/core/Icon"
import { Link } from "@astryxdesign/core/Link"
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList"
import { Skeleton } from "@astryxdesign/core/Skeleton"
import { Tab, TabList } from "@astryxdesign/core/TabList"
import { Table, TableBody, TableCell, TableFooter, TableHeader, TableHeaderCell, TableRow } from "@astryxdesign/core/Table"
import { Text } from "@astryxdesign/core/Text"
import { Token } from "@astryxdesign/core/Token"
import { VStack } from "@astryxdesign/core/VStack"
import BattleStatsPanel from "../../components/BattleStatsPanel"
import { TypeIcon } from "../../components/TypeIcon"
import { EvolutionTree } from "../../components/pokedex/EvolutionChain"
import { dexNumber, ROMAN } from "../../components/pokedex/format"
import { MovesPanel } from "../../components/pokedex/MovesPanel"
import { SpritesGallery } from "../../components/pokedex/SpritesGallery"
import { GenderToggle } from "../../components/pokedex/GenderToggle"
import { GenerationBar } from "../../components/pokedex/GenerationBar"
import { StatBar, TypeTag } from "../../components/ui/shared"
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


// ─── Defensive type chart ─────────────────────────────────────────────────────
const TYPE_CHART: Record<string, Record<string, number>> = {
    normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
    fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
    water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
    ice:      { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
    fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
    poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
    ground:   { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
    flying:   { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
    bug:      { fire: 0.5, grass: 2, fighting: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
    rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
    dragon:   { dragon: 2, steel: 0.5, fairy: 0 },
    dark:     { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
    steel:    { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
    fairy:    { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
}

/** 공격 타입 → 배율 (1배 제외) */
function computeDefense(types: readonly string[]): [string, number][] {
    const out: [string, number][] = []
    for (const atk of Object.keys(TYPE_CHART)) {
        let m = 1
        for (const def of types) m *= TYPE_CHART[atk]?.[def] ?? 1
        if (m !== 1) out.push([atk, m])
    }
    return out
}

/** 배율 묶음 (큰 배율부터) */
const MULTIPLIER_GROUPS: { mult: number; label: PokedexKey }[] = [
    { mult: 4, label: "weakTo" },
    { mult: 2, label: "weakTo" },
    { mult: 0.5, label: "resists" },
    { mult: 0.25, label: "resists" },
    { mult: 0, label: "immuneTo" },
]

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

// ─── Small UI pieces ──────────────────────────────────────────────────────────

function Panel({
    title,
    titleNote,
    children,
    className = "",
}: {
    title?: string
    titleNote?: ReactNode
    children: ReactNode
    className?: string
}) {
    return (
        <span className={`block min-w-0 ${className}`}>
            <Card height="100%">
                <section>
                    <VStack gap={3}>
                        {title && titleNote ? (
                            <HStack gap={3} vAlign="center" wrap="wrap">
                                <Heading level={2}>{title}</Heading>
                                {titleNote}
                            </HStack>
                        ) : (
                            title && <Heading level={2}>{title}</Heading>
                        )}
                        {children}
                    </VStack>
                </section>
            </Card>
        </span>
    )
}

function SkeletonRows({ n = 4 }: { n?: number }) {
    return (
        <VStack gap={2}>
            {Array.from({ length: n }, (_, i) => (
                <Skeleton key={i} height={24} index={i} />
            ))}
        </VStack>
    )
}

/** 한눈에 뜻을 알기 어려운 값 + 한 줄 설명 */
function Hinted({ hint, children }: { hint: string; children: ReactNode }) {
    return (
        <VStack gap={0.5}>
            {children}
            <Text type="supporting" color="secondary">
                {hint}
            </Text>
        </VStack>
    )
}

function LoadError({ message, onRetry, retryLabel }: { message: string; onRetry?: () => void; retryLabel: string }) {
    return (
        <Banner
            status="error"
            title={message}
            endContent={onRetry ? <Button size="sm" label={retryLabel} onClick={onRetry} /> : undefined}
        />
    )
}

// ─── Prev / Next ──────────────────────────────────────────────────────────────

function NeighborLink({
    p,
    dir,
    lang,
    label,
    search,
}: {
    p: DexPokemon | undefined
    dir: "prev" | "next"
    lang: Lang
    label: string
    search: string
}) {
    if (!p) return <span aria-hidden className="block" />
    const name = pokemonName(p, lang)
    const no = dexNumber(p.id)
    return (
        <Link href={`/pokemon/${p.id}${search}`} label={`${label}: ${no} ${name}`} hasUnderline={false} color="secondary">
            <span className={`inline-flex min-h-11 min-w-0 items-center gap-1.5 sm:min-h-0 ${dir === "next" ? "flex-row-reverse" : ""}`}>
                <Icon icon={dir === "prev" ? "chevronLeft" : "chevronRight"} size="sm" />
                <span className="hidden tabular-nums sm:inline">{no}</span>
                <span className="max-w-32 truncate font-medium text-primary sm:max-w-48">{name}</span>
            </span>
        </Link>
    )
}

// ─── Page states ──────────────────────────────────────────────────────────────

// ─── Header pieces (실제 머리말과 스켈레톤이 같은 틀을 쓴다) ───────────────────────────

/** 휴대폰에서 44px 터치 높이를 갖는 줄 */
function TapRow({ children, justify, as }: { children: ReactNode; justify?: "end"; as?: "span" }) {
    return (
        <HStack as={as} gap={1} justify={justify} vAlign="center" className="min-h-11 sm:min-h-0">
            {children}
        </HStack>
    )
}

/** 머리말 본문: 이미지 액자(md 이상 192px = 도트 원본 96px의 2배, 휴대폰 96px) | 신원 | 핵심 수치(lg 미만은 다음 줄) */
function HeaderBody({
    image,
    caption,
    identity,
    numbers,
}: {
    image: { key?: number; sources: (string | null | undefined)[]; alt: string; priority?: boolean }
    caption: ReactNode
    identity: ReactNode
    numbers: ReactNode
}) {
    return (
        <section className="flex flex-wrap items-start gap-4">
            <figure className="flex shrink-0 flex-col items-center gap-1">
                <span className="block rounded-lg border border-border bg-muted p-2">
                    <PokeImage key={image.key} sources={image.sources} alt={image.alt} size={192} className="h-24 w-24 md:h-48 md:w-48" priority={image.priority} />
                </span>
                {caption}
            </figure>
            <VStack as="span" gap={2} className="min-w-0 flex-1 basis-48">
                {identity}
            </VStack>
            <VStack as="span" gap={3} className="min-w-0 basis-full lg:min-w-64 lg:flex-1 lg:basis-0">
                {numbers}
            </VStack>
        </section>
    )
}

function DetailSkeleton({ label }: { label: string }) {
    // 실제 머리말과 같은 크기: 뒤로 링크 → 카드(이전/다음 → 이미지 액자 + 신원 + 핵심 수치) → 탭 줄.
    // 로컬 도감에 없는 항목은 다른 폼(세대 막대 없음)뿐이라 위 줄은 이전/다음 자리만 잡는다.
    return (
        <VStack gap={4} role="status" aria-live="polite">
            <span className="sr-only">{label}</span>
            <TapRow>
                <Skeleton width={112} height={20} />
            </TapRow>
            <Card>
                <VStack gap={3}>
                    <TapRow justify="end">
                        <Skeleton width={180} height={20} />
                    </TapRow>
                    <HeaderBody
                        image={{ sources: [], alt: "" }}
                        caption={<Skeleton width={64} height={20} />}
                        identity={
                            <>
                                <Skeleton width="60%" height={36} />
                                <Skeleton width={128} height={24} />
                                <Skeleton width={160} height={32} />
                                <Skeleton width={56} height={20} />
                            </>
                        }
                        numbers={
                            <>
                                <Skeleton height={48} />
                                <Skeleton width="70%" height={18} />
                                <VStack gap={1}>
                                    <Skeleton height={22} />
                                    <Skeleton width="60%" height={22} />
                                </VStack>
                            </>
                        }
                    />
                </VStack>
            </Card>
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
    const rowLabel = (key: GenStatKey) => (key === "special" ? t("specialStat") : statLabel(key, lang))
    const statTotal = stats.reduce((sum, s) => sum + s.value, 0)
    const statMax = stats.reduce((m, s) => Math.max(m, s.value), 0)

    const matchups = useMemo(() => computeDefense(currentTypes), [currentTypes])

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
    const pendingValue = detailQ.isError ? "-" : <Skeleton width={48} height={24} />
    const moveCount = detail?.moves.length ?? local?.moves.length

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

            {/* ── 머리말: 세대 선택 · 이전/다음 → 표본 ── */}
            <Card>
                <VStack gap={3}>
                    <HStack justify="between" vAlign="center" gap={3} wrap="wrap">
                        {/* 다른 폼은 세대 기록이 없어 막대를 빼고, 이전/다음은 오른쪽 위에 그대로 둔다 */}
                        {!isAltForm && (
                            <GenerationBar
                                debut={debut}
                                gen={gen}
                                onChange={setGen}
                                cry={cryAt(detail?.cries, gen ?? LATEST_GEN)}
                                loading={!detail}
                                lang={lang}
                                t={t}
                            />
                        )}
                        <nav aria-label={t("neighbors")} title={t("keyboardHint")} className="ms-auto">
                            <HStack gap={4} vAlign="center">
                                <NeighborLink p={prev} dir="prev" lang={lang} label={t("prev")} search={neighborSearch} />
                                <NeighborLink p={next} dir="next" lang={lang} label={t("next")} search={neighborSearch} />
                            </HStack>
                        </nav>
                    </HStack>

                    <HeaderBody
                        image={{
                            key: id,
                            sources: headerSources,
                            alt: gen !== null ? t("spriteAltGen", { name, gen }) : t("artworkAlt", { name }),
                            priority: true,
                        }}
                        caption={
                            <figcaption>
                                <Text type="supporting" hasTabularNumbers>
                                    {dexNumber(shownNo)}
                                </Text>
                            </figcaption>
                        }
                        /* 신원: 이름 → 분류 → 타입(·암수) → 세대/전설 */
                        identity={
                            <>
                                <VStack gap={1}>
                                    <Heading level={1}>{name}</Heading>
                                    {form && (
                                        <Text type="large" color="secondary">
                                            {form}
                                        </Text>
                                    )}
                                    {otherNames.length > 0 && (
                                        <span className="flex flex-wrap gap-x-3" aria-label={t("otherNames")}>
                                            {otherNames.map((o) => (
                                                <span key={o.n} lang={o.lang}>
                                                    <Text color="secondary">{o.n}</Text>
                                                </span>
                                            ))}
                                        </span>
                                    )}
                                    {genusEntry ? (
                                        <Text color="secondary">{genusEntry.genus}</Text>
                                    ) : speciesQ.isPending && speciesId ? (
                                        <Skeleton width={128} height={24} />
                                    ) : null}
                                </VStack>

                                <HStack gap={2} vAlign="center" wrap="wrap">
                                    <TypeIcon types={types} size="lg" />
                                    {typesView?.changedIn != null && (
                                        <Token size="sm" color="yellow" label={t("changedInGen", { gen: typesView.changedIn })} />
                                    )}
                                    {hasGenderDiff && <GenderToggle value={sex} onChange={setSex} t={t} />}
                                </HStack>

                                {(generation || species?.is_legendary || species?.is_mythical || species?.is_baby) && (
                                    <HStack gap={1.5} wrap="wrap">
                                        {generation ? <Token size="sm" label={generationName(generation, lang)} /> : null}
                                        {species?.is_legendary && <Token size="sm" color="yellow" label={t("legendary")} />}
                                        {species?.is_mythical && <Token size="sm" color="pink" label={t("mythical")} />}
                                        {species?.is_baby && <Token size="sm" color="purple" label={t("baby")} />}
                                    </HStack>
                                )}
                            </>
                        }
                        /* 핵심 수치 → 설명: lg 이상은 같은 줄 오른쪽, 그 아래는 다음 줄 */
                        numbers={
                            <>
                                {/* 짧은 값 넷은 한 줄로(휴대폰에서도), 뜻이 바로 안 보이는 기초 경험치만 아래에 한 줄 설명 */}
                                <MetadataList orientation="horizontal">
                                    <MetadataListItem label={t("height")}>
                                        {detail ? <Text hasTabularNumbers>{`${formatNumber(detail.height / 10, lang, decimal)} m`}</Text> : pendingValue}
                                    </MetadataListItem>
                                    <MetadataListItem label={t("weight")}>
                                        {detail ? <Text hasTabularNumbers>{`${formatNumber(detail.weight / 10, lang, decimal)} kg`}</Text> : pendingValue}
                                    </MetadataListItem>
                                    <MetadataListItem label={t("baseExp")}>
                                        {detail ? <Text hasTabularNumbers>{detail.base_experience ?? "-"}</Text> : pendingValue}
                                    </MetadataListItem>
                                    <MetadataListItem label={t("total")}>
                                        <Text hasTabularNumbers>{statTotal}</Text>
                                    </MetadataListItem>
                                </MetadataList>
                                <Text type="supporting" color="secondary">{`${t("baseExp")}: ${t("baseExpHint")}`}</Text>

                                {flavor ? (
                                    <span lang={flavorEntry?.language.name.split("-")[0]} className="block max-w-prose">
                                        <Text as="p">{flavor}</Text>
                                    </span>
                                ) : speciesQ.isPending && speciesId ? (
                                    <VStack gap={1}>
                                        <Skeleton height={20} />
                                        <Skeleton height={20} />
                                        <Skeleton width="60%" height={20} />
                                    </VStack>
                                ) : null}
                            </>
                        }
                    />
                </VStack>
            </Card>

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
                    <Grid columns={{ minWidth: 280, max: 3 }} gap={3}>
                        {abilitiesView && abilitiesView.at === null ? (
                            <Panel title={t("abilities")}>
                                <Text color="secondary">{t("noAbilitiesBeforeGen3")}</Text>
                            </Panel>
                        ) : (abilitiesView?.at?.value ?? abilities).length > 0 && (
                            <Panel
                                title={t("abilities")}
                                titleNote={
                                    abilitiesView?.at?.changedIn != null ? (
                                        <Token size="sm" color="yellow" label={t("changedInGen", { gen: abilitiesView.at.changedIn })} />
                                    ) : undefined
                                }
                            >
                                <ul className="flex flex-col divide-y divide-border">
                                    {(abilitiesView?.at?.value ?? abilities).map((a) => {
                                        const desc = localText(ABILITY_BY_NAME.get(a.name)?.desc, lang)
                                        return (
                                            <li key={a.name} className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0">
                                                <HStack gap={2} vAlign="center" wrap="wrap">
                                                    <Link href={`/abilities/${a.name}`} weight="semibold">
                                                        {abilityName(a.name, lang)}
                                                    </Link>
                                                    {a.hidden && <Token size="sm" color="purple" label={t("hiddenAbility")} />}
                                                </HStack>
                                                <Text color="secondary" as="p">
                                                    {desc ?? t("abilityNoDesc")}
                                                </Text>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </Panel>
                        )}

                        <Panel title={t("species")}>
                            {speciesQ.isError ? (
                                <LoadError message={t("loadErrorTitle")} onRetry={() => void speciesQ.refetch()} retryLabel={retry} />
                            ) : !species ? (
                                <SkeletonRows n={5} />
                            ) : (
                                <MetadataList>
                                    <MetadataListItem label={t("generation")}>
                                        {generation ? generationName(generation, lang) : "-"}
                                    </MetadataListItem>
                                    <MetadataListItem label={t("growthRate")}>
                                        <Hinted hint={t("growthRateHint")}>
                                            <Text>{isPokedexKey(growthKey) ? t(growthKey) : titleCaseSlug(species.growth_rate.name)}</Text>
                                        </Hinted>
                                    </MetadataListItem>
                                    <MetadataListItem label={t("captureRate")}>
                                        <Hinted hint={t("captureRateHint")}>
                                            <Text hasTabularNumbers>
                                                {`${species.capture_rate} (${formatNumber((species.capture_rate / 255) * 100, lang, { maximumFractionDigits: 1 })}%)`}
                                            </Text>
                                        </Hinted>
                                    </MetadataListItem>
                                    <MetadataListItem label={t("baseHappiness")}>
                                        <Hinted hint={t("baseHappinessHint")}>
                                            <Text hasTabularNumbers>{species.base_happiness ?? "-"}</Text>
                                        </Hinted>
                                    </MetadataListItem>
                                    <MetadataListItem label={t("color")}>
                                        {isPokedexKey(colorKey) ? t(colorKey) : titleCaseSlug(species.color.name)}
                                    </MetadataListItem>
                                </MetadataList>
                            )}
                        </Panel>

                        <Panel title={t("breeding")}>
                            {speciesQ.isError ? (
                                <LoadError message={t("loadErrorTitle")} onRetry={() => void speciesQ.refetch()} retryLabel={retry} />
                            ) : !species ? (
                                <SkeletonRows n={3} />
                            ) : (
                                <MetadataList>
                                    <MetadataListItem label={t("gender")}>{genderText ?? "-"}</MetadataListItem>
                                    {species.hatch_counter != null ? (
                                        <MetadataListItem label={t("eggCycles")}>
                                            <Hinted hint={t("eggCyclesHint")}>
                                                <Text hasTabularNumbers>
                                                    {t("eggCyclesValue", { n: species.hatch_counter, steps: (species.hatch_counter + 1) * 255 })}
                                                </Text>
                                            </Hinted>
                                        </MetadataListItem>
                                    ) : null}
                                    {species.egg_groups && species.egg_groups.length > 0 ? (
                                        <MetadataListItem label={t("eggGroups")}>
                                            <HStack gap={1} wrap="wrap">
                                                {species.egg_groups.map((g) => (
                                                    <Token key={g.name} size="sm" label={eggGroupName(g.name, lang)} />
                                                ))}
                                            </HStack>
                                        </MetadataListItem>
                                    ) : null}
                                </MetadataList>
                            )}
                        </Panel>

                        <Panel
                            title={t("typeMatchup")}
                            titleNote={gen !== null ? <Text type="supporting" color="secondary">{t("matchupCurrentNote")}</Text> : undefined}
                            className="col-span-full"
                        >
                            {matchups.length === 0 ? (
                                <Text color="secondary">{t("noMatchups")}</Text>
                            ) : (
                                <dl className="flex flex-col divide-y divide-border">
                                    {MULTIPLIER_GROUPS.map(({ mult, label }) => {
                                        const list = matchups.filter(([, m]) => m === mult)
                                        if (list.length === 0) return null
                                        return (
                                            <HStack key={mult} gap={3} className="items-baseline py-2 first:pt-0 last:pb-0">
                                                <dt className="flex w-28 shrink-0 items-baseline gap-2">
                                                    <Text type="label">{t(label)}</Text>
                                                    <Text type="supporting" hasTabularNumbers>{`x${mult}`}</Text>
                                                </dt>
                                                <dd className="flex flex-wrap gap-1.5">
                                                    {list.map(([type]) => (
                                                        <TypeTag key={type} type={type} size="sm" />
                                                    ))}
                                                </dd>
                                            </HStack>
                                        )
                                    })}
                                </dl>
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

                        <Panel title={t("evolution")} className="col-span-full">
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
                                <span className="block overflow-x-auto pb-1">
                                    <EvolutionTree link={evoQ.data.chain} currentSpeciesId={speciesId} lang={lang} t={t} />
                                </span>
                            )}
                        </Panel>

                        {forms.length > 1 && (
                            <Panel title={t("forms")} className="col-span-full">
                                <ul className="flex flex-wrap gap-2">
                                    {forms.map((f) => {
                                        const current = f.id === id
                                        const label = formLabel(f, lang) ?? pokemonName(f, lang)
                                        const icon = f.sprite ? (
                                            <PokeImage sources={pokemonImageCandidates(f.id, 24, { sprite: f.sprite })} alt="" size={24} className="h-6 w-6" />
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
                                </ul>
                            </Panel>
                        )}
                    </Grid>
                )}

                {tab === "stats" && (
                    <VStack gap={4}>
                        <Grid columns={{ minWidth: 300, repeat: "fit" }} gap={4}>
                            <Panel title={t("baseStats")}>
                                <Table density="compact" aria-label={t("baseStats")}>
                                    <TableHeader>
                                        <TableRow isHeaderRow>
                                            <TableHeaderCell scope="col">{t("tabStats")}</TableHeaderCell>
                                            <TableHeaderCell scope="col" className="text-right">{t("colBase")}</TableHeaderCell>
                                            <TableHeaderCell scope="col">
                                                <span className="sr-only">{t("baseStats")}</span>
                                            </TableHeaderCell>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {stats.map((s) => {
                                            const top = s.value === statMax && statMax > 0
                                            return (
                                                <TableRow key={s.key}>
                                                    <TableCell scope="row">
                                                        <HStack gap={2} vAlign="center" wrap="wrap">
                                                            <Text weight="medium">{rowLabel(s.key)}</Text>
                                                            {s.changedIn != null && (
                                                                <Token size="sm" color="yellow" label={t("changedInGen", { gen: s.changedIn })} />
                                                            )}
                                                        </HStack>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Text weight={top ? "bold" : "normal"} hasTabularNumbers>
                                                            {s.value}
                                                        </Text>
                                                    </TableCell>
                                                    <TableCell className="w-1/2">
                                                        <span className="flex items-center gap-2">
                                                            <StatBar value={s.value} highlight={top} label={rowLabel(s.key)} className="min-w-20 flex-1" />
                                                            {top && <Text type="supporting">{t("highestStat")}</Text>}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell scope="row">
                                                <Text weight="semibold">{t("total")}</Text>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Text weight="bold" hasTabularNumbers>
                                                    {statTotal}
                                                </Text>
                                            </TableCell>
                                            <TableCell>
                                                <span className="sr-only">{t("total")}</span>
                                            </TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </Panel>
                            <Panel title={t("evYield")} titleNote={currentNote}>
                                <Text type="supporting" color="secondary">
                                    {t("evYieldHint")}
                                </Text>
                                {detail ? (
                                    detail.stats.some((s) => s.effort > 0) ? (
                                        <MetadataList>
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
                            </Panel>
                        </Grid>
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
