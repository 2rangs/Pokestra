import { type ReactNode, Fragment, useEffect, useMemo, useState } from "react"
import { Blockquote } from "@astryxdesign/core/Blockquote"
import { KNOWN_VERSIONS, gameTitle, versionGeneration, versionName } from "../../lib/gameNames"
import { type FlavorOption, NO_KOREAN_RELEASE, buildFlavorOptions, defaultFlavor, flavorMatch, groupFlavors, wikiEntries } from "../../lib/flavorEntries"
import { Selector } from "@astryxdesign/core/Selector"
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from "react-router"
import { Button } from "@astryxdesign/core/Button"
import { Card } from "@astryxdesign/core/Card"
import { EmptyState } from "@astryxdesign/core/EmptyState"
import { Heading } from "@astryxdesign/core/Heading"
import { HStack } from "@astryxdesign/core/HStack"
import { Icon } from "@astryxdesign/core/Icon"
import { InfoTip } from "@astryxdesign/core/InfoTip"
import { Link } from "@astryxdesign/core/Link"
import { Skeleton } from "@astryxdesign/core/Skeleton"
import { Tab, TabList } from "@astryxdesign/core/TabList"
import { Text } from "@astryxdesign/core/Text"
import { Token } from "@astryxdesign/core/Token"
import { VStack } from "@astryxdesign/core/VStack"
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden"
import RealStatsPanel from "../../components/RealStatsPanel"
import { BaseStatsChart } from "../../components/pokedex/BaseStatsChart"
import { DefenseMatchups } from "../../components/pokedex/DefenseMatchups"
import { DetailHeader, NeighborNav, type StripItem } from "../../components/pokedex/DetailHeader"
import { type Fact, FactList, LoadError, Panel, SkeletonRows } from "../../components/pokedex/DetailPanel"
import { EvolutionTree } from "../../components/pokedex/EvolutionChain"
import { dexNumber, ROMAN } from "../../components/pokedex/format"
import { MovesPanel } from "../../components/pokedex/MovesPanel"
import { SpritesGallery } from "../../components/pokedex/SpritesGallery"
import { GenderToggle, ShinyToggle } from "../../components/pokedex/GenderToggle"
import { CryButtons, GenerationSelect } from "../../components/pokedex/GenerationBar"
import { TypeChip } from "../../components/ui/TypeChip"
import { GameBadges } from "../../components/ui/GameBadge"
import { getIdFromUrl } from "../../common/utils"
import {
    type PokemonSpecies,
    useEvolutionChain,
    usePokemonDetail,
    usePokemonForms,
    useWikiFlavors,
    usePokemonSpecies,
} from "../../hooks/usePokemon"
import { LANGS, type Lang, formatNumber, useDocumentTitle, useLang, useT } from "../../i18n"
import { commonMessages } from "../../i18n/messages/common"
import { type PokedexKey, isPokedexKey, pokedexMessages } from "../../i18n/messages/pokedex"
import { itemLabel as itemName } from "../../lib/itemLabel"
import { parseSex } from "../../lib/gender"
import { artworkUrl } from "../../lib/spriteUrls"
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
    isAlternateForm,
    displayName,
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
                flavorLabel={"\u00a0"}
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
    // 메가 등 다른 폼(API id > 10000)은 세대별 기록이 없으므로 ?gen 을 무시한다
    const isAltForm = (local?.id ?? detail?.id ?? 0) > 10000
    // 첫 등장: 다른 폼은 종의 첫 세대가 폼의 첫 등장이 아니므로 비워 둔다
    const debutLabel = isAltForm || !generation ? "—" : generationName(generation, lang)
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

    // 이로치: ?shiny=1 (링크로 공유, 이전/다음으로 넘어가도 유지)
    const shiny = searchParams.get("shiny") === "1"
    const setShiny = (next: boolean) =>
        setSearchParams(
            (prevParams) => {
                const q = new URLSearchParams(prevParams)
                if (next) q.set("shiny", "1")
                else q.delete("shiny")
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

    // 도감 설명은 작품마다 다르다: 작품별 후보(최신부터, 같은 글은 묶음, 사용자 언어가 없는 작품은 영어로)
    const flavorPrimary = pickByLang(species?.flavor_text_entries, lang, true)?.language.name
    // 한국어: PokeAPI 에 없는 작품(1~5세대 등)·모습별 설명은 포켓몬 위키에서 모은 설명으로 채운다
    const wikiQ = useWikiFlavors(speciesId, lang === "ko")
    const apiKoVersions = useMemo(
        () => new Set((species?.flavor_text_entries ?? []).filter((e) => e.language.name === "ko").map((e) => e.version.name)),
        [species],
    )
    const flavorOptions = useMemo(() => {
        if (!flavorPrimary) return []
        const extra = lang === "ko" ? wikiEntries(wikiQ.data, apiKoVersions, "ko") : []
        const entries = [...(species?.flavor_text_entries ?? []), ...extra]
        return buildFlavorOptions(entries, flavorPrimary, flavorPrimary === "en" ? null : "en", cleanFlavor).map((o) =>
            o.lang === "ko" && !o.versions.some((v) => apiKoVersions.has(v)) ? { ...o, wiki: true } : o,
        )
    }, [species, flavorPrimary, lang, wikiQ.data, apiKoVersions])
    // 고른 작품은 세대 선택이 바뀌면 그 세대의 기본으로 돌아간다
    const [flavorPick, setFlavorPick] = useState<{ id: string; gen: number | null; species: number | null } | null>(null)
    // 메가진화·리전폼 등 모습별 도감 설명 (PokeAPI 에는 영어만). 위키처럼 세대 묶음 안에 모습별로 붙인다
    const altForms = useMemo(
        () => (speciesId ? ALL_POKEMON.filter((p) => getSpeciesId(p) === speciesId && isAlternateForm(p)) : []),
        [speciesId],
    )
    const formData = usePokemonForms(altForms.map((p) => p.name))
    const formFlavors = useMemo<FlavorOption[]>(
        () =>
            altForms.flatMap((p, i) => {
                const entries = formData[i]?.flavor_text_entries
                const wiki = lang === "ko" ? groupFlavors(wikiEntries(wikiQ.data, new Set(), "ko", p.id), "ko", cleanFlavor).map((o) => ({ ...o, wiki: true })) : []
                const own = wiki.length ? wiki : groupFlavors(entries, lang, cleanFlavor)
                return (own.length ? own : groupFlavors(entries, "en", cleanFlavor)).map((o) => ({ ...o, id: `form:${p.id}:${o.id}`, formId: p.id }))
            }),
        [altForms, formData, lang, wikiQ.data],
    )
    const allFlavors = useMemo(() => [...formFlavors, ...flavorOptions], [formFlavors, flavorOptions])
    const pickedFlavor =
        (flavorPick && flavorPick.gen === gen && flavorPick.species === (speciesId ?? null) && allFlavors.find((o) => o.id === flavorPick.id)) || undefined
    // 기본: 이 모습만의 설명이 사용자 언어로 있으면 그것, 아니면 종의 설명(사용자 언어 우선)
    const flavorShown = pickedFlavor ?? formFlavors.find((o) => o.formId === (local?.id ?? detail?.id ?? 0) && o.lang === lang) ?? defaultFlavor(flavorOptions, gen, flavorPrimary)
    // 도감 설명을 고르면 그 작품의 세대로(스프라이트·타입·종족값·울음소리가 함께 바뀐다). 최신 세대면 "현재"
    const chooseFlavor = (rowId: string) => {
        // 모두 보기의 행은 "설명 id@세대" (같은 글이 여러 세대에 있으면 세대마다 한 줄)
        const [optionId, rowGen] = rowId.split("@")
        const o = allFlavors.find((x) => x.id === optionId)
        const g = rowGen ? Number(rowGen) : o ? versionGeneration(o.versions[0]) : null
        const nextGen = isAltForm || o?.formId || g == null ? gen : g >= LATEST_GEN ? null : Math.max(g, debut ?? 1)
        if (nextGen !== gen) setGen(nextGen)
        setFlavorPick({ id: optionId, gen: nextGen, species: speciesId ?? null })
    }
    const [allEntries, setAllEntries] = useState(false)
    const versionList = (versions: readonly string[]) => versions.map((v) => versionName(v, lang)).join(" · ")
    const sourceTitle = (versions: readonly string[]) => [gameTitle(versions[0], lang), ...versions.slice(1).map((v) => versionName(v, lang))].join(" · ")
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
        if (shiny) q.set("shiny", "1")
        const str = q.toString()
        return str ? `?${str}` : ""
    }, [tab, gen, sex, shiny])

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
    const artwork = shiny
        ? id
            ? artworkUrl(id, true)
            : ""
        : local
          ? officialArtworkUrl(local.id)
          : (detail?.sprites.other?.["official-artwork"]?.front_default ?? "")
    const spriteFallback = shiny ? (local?.spriteShiny ?? detail?.sprites.front_shiny ?? null) : (local?.sprite ?? detail?.sprites.front_default ?? null)
    // 머리말 이미지 후보: 세대 도트(로딩 중엔 빈 칸, 실패하면 일러스트로) / 현재 일러스트. 암컷이면 암컷 그림부터, 이로치면 이로치 그림
    const headerSources =
        gen !== null
            ? genDetail
                ? [spriteAt(genDetail.sprites, gen, { female: sex === "f", shiny, version: pickedFlavor?.versions[0] }), artwork]
                : detailQ.isError
                  ? [artwork, spriteFallback]
                  : []
            : sex === "f" && detail
              ? [femaleArtAt(detail.sprites, shiny), artwork, spriteFallback]
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
    // 모두 보기 묶음: 세대별(최신부터). 세대 안에서는 종의 설명 → 모습별 설명(위키의 "폼" 칸처럼)
    const formNameOf = (fid: number) => {
        const f = altForms.find((p) => p.id === fid)
        return f ? displayName(f, lang) : ""
    }
    const flavorGroups = (() => {
        // 같은 글이 여러 세대 작품에 실렸으면 세대마다 그 세대 작품만 남긴 줄로 (위키처럼 세대별로 빠짐없이)
        const rows = allFlavors.flatMap((o) => {
            const gens = [...new Set(o.versions.map((v) => versionGeneration(v) ?? 0))]
            const order = (v: string) => KNOWN_VERSIONS.indexOf(v)
            return gens.map((g) => ({
                ...o,
                id: `${o.id}@${g}`,
                versions: o.versions.filter((v) => (versionGeneration(v) ?? 0) === g).sort((x, y) => order(x) - order(y)), // 발매 순서
                rowGen: g,
            }))
        })
        const gens = [...new Set(rows.map((r) => r.rowGen))].sort((a, b) => b - a)
        return gens.map((g) => {
            const inGen = rows.filter((r) => r.rowGen === g)
            const species = inGen.filter((o) => !o.formId)
            const byForm = altForms
                .map((f) => ({ formId: f.id, title: formNameOf(f.id), items: inGen.filter((o) => o.formId === f.id) }))
                .filter((x) => x.items.length > 0)
            return { key: `gen-${g}`, title: g ? generationName(g, lang) : "—", species, byForm }
        })
    })()
    // 출처 + (고른 세대와 다른 작품이면) 리메이크인지·가까운 작품인지
    const flavorCite = (o: NonNullable<typeof flavorShown>) => {
        // 세대를 골랐으면 그 세대 작품만 적고 나머지는 "외 N작품"
        const inGen = gen === null ? [] : o.versions.filter((v) => versionGeneration(v) === gen)
        const src = inGen.length ? `${sourceTitle(inGen)}${inGen.length < o.versions.length ? ` ${t("entryMoreGames", { n: o.versions.length - inGen.length })}` : ""}` : sourceTitle(o.versions)
        const notes = o.formId ? [formNameOf(o.formId), src] : [src]
        if (o.lang !== flavorPrimary) notes.push(t("entryFallbackLang"))
        if (o.wiki) notes.push(o.versions.every((v) => NO_KOREAN_RELEASE.has(v)) ? t("entryWikiTranslation") : t("entryWiki"))
        const match = gen !== null ? flavorMatch(o, gen) : "same"
        if (match === "remake") notes.push(t("entryRemake", { gen: gen ?? 0 }))
        if (match === "nearest") notes.push(t("entryNearest", { gen: gen ?? 0 }))
        return notes.join(" · ")
    }
    // 설명 행 묶음: 항목 사이 구분선, 작품은 색 배지 + 이름. 누르면 그 설명(종의 설명이면 그 세대로)
    const flavorRows = (items: readonly FlavorOption[]) => (
        <VStack as="ul" gap={0} className="divide-y divide-border border-y border-border">
            {items.map((o) => {
                // 지금 보이는 설명이면서, 세대를 골랐으면 그 세대 줄(안 골랐으면 첫 줄)
                const [baseId, rowGen] = o.id.split("@")
                const shownGen = gen ?? versionGeneration(flavorShown?.versions[0] ?? "") ?? 0
                const current = baseId === flavorShown?.id && Number(rowGen) === shownGen
                return (
                    <li key={o.id} lang={o.lang.split("-")[0]}>
                        <button
                            type="button"
                            aria-pressed={current}
                            onClick={() => chooseFlavor(o.id)}
                            className={`flex w-full gap-4 px-2 py-2.5 text-left transition-colors max-sm:flex-col max-sm:gap-1.5 ${current ? "bg-muted" : "hover:bg-muted"}`}
                        >
                            <VStack as="span" gap={1} className="w-44 shrink-0">
                                <GameBadges versions={o.versions} />
                                <Text type="supporting" weight={current ? "semibold" : "normal"} color="secondary">
                                    {versionList(o.versions)}
                                    {o.lang !== lang ? ` (${o.lang})` : ""}
                                    {o.wiki ? ` · ${o.versions.every((v) => NO_KOREAN_RELEASE.has(v)) ? t("entryWikiTranslation") : t("entryWiki")}` : ""}
                                </Text>
                            </VStack>
                            <Text className="break-keep">{o.text}</Text>
                        </button>
                    </li>
                )
            })}
        </VStack>
    )
    const flavorNode = flavorShown ? (
        allEntries ? (
            // 작품별 도감 설명 모두: (이 모습만의 설명) → 세대별 묶음. 항목 사이 구분선, 작품은 색 배지 + 이름. 누르면 그 설명·세대로
            <VStack gap={4} aria-label={t("entriesAll")}>
                {flavorGroups.map((group) => (
                    <VStack key={group.key} as="section" gap={1.5}>
                        <Text weight="bold">{group.title}</Text>
                        {group.species.length > 0 && flavorRows(group.species)}
                        {group.byForm.map((f) => (
                            <VStack key={f.formId} gap={1} className="ps-3">
                                <Text type="supporting" weight="semibold" color="secondary">
                                    {t("entriesFormGroup", { form: f.title })}
                                </Text>
                                {flavorRows(f.items)}
                            </VStack>
                        ))}
                    </VStack>
                ))}
                {allFlavors.some((o) => o.wiki) && (
                    <Text type="supporting" color="secondary">
                        {t("entryWikiCredit")}{" "}
                        <Link href="https://pokemon.fandom.com/ko/" target="_blank" rel="noreferrer">
                            {t("entryWikiName")}
                        </Link>{" "}
                        (CC BY-SA 3.0)
                    </Text>
                )}
            </VStack>
        ) : (
            // 도감 설명은 게임 속 도감 항목처럼 인용 블록 + 출처 작품
            <span lang={flavorShown.lang.split("-")[0]} className="block max-w-prose break-keep">
                <Blockquote cite={flavorCite(flavorShown)}>{flavorShown.text}</Blockquote>
            </span>
        )
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
    const statsChart = (footer?: ReactNode) => (
        <BaseStatsChart
            stats={stats}
            current={gen !== null ? currentStats : null}
            gen={gen}
            headingId="base-stats-title"
            footer={footer}
            lang={lang}
            t={t}
        />
    )
    const shownAbilities = abilitiesView?.at?.value ?? abilities
    const evYield = (detail?.stats ?? [])
        .filter((st) => st.effort > 0)
        .map((st) => {
            const key = API_STAT_KEY[st.stat.name]
            return { key: st.stat.name, label: key ? statLabel(key, lang) : st.stat.name, effort: st.effort }
        })
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
                nav={
                    <NeighborNav
                        prev={prev}
                        next={next}
                        lang={lang}
                        search={neighborSearch}
                        labels={{ nav: t("neighbors"), prev: t("prev"), next: t("next"), hint: t("keyboardHint") }}
                    />
                }
                imageFooter={forms.length > 1 ? <FormPicker forms={forms} id={id} lang={lang} label={t("forms")} search={shiny ? "?shiny=1" : ""} /> : undefined}
                image={{
                    key: id,
                    sources: headerSources,
                    alt: gen !== null ? t("spriteAltGen", { name, gen }) : t("artworkAlt", { name }),
                    priority: true,
                }}
                number={
                    // 도감 번호는 이 화면의 정체성: 강조색·고정폭 숫자
                    <Text type="large" weight="semibold" color="accent" hasTabularNumbers>
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
                            <Token size="sm" label={t("changedInGen", { gen: typesView.changedIn })} />
                        )}
                        {species?.is_legendary && <Token size="sm" label={t("legendary")} />}
                        {species?.is_mythical && <Token size="sm" label={t("mythical")} />}
                        {species?.is_baby && <Token size="sm" label={t("baby")} />}
                        {hasGenderDiff && <Token size="sm" label={t("genderDiffers")} />}
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
                        <ShinyToggle value={shiny} onChange={setShiny} t={t} />
                        <CryButtons cry={cry} debut={debut} legacyFirst={gen !== null && gen <= 5} loading={!detail} t={t} />
                    </>
                }
                flavor={flavorNode}
                flavorLabel={t("pokedexEntry")}
                flavorControl={
                    flavorShown && allFlavors.length > 1 ? (
                        <HStack gap={1} vAlign="center">
                            {!allEntries && (
                                <Selector
                                    label={t("entryGame")}
                                    isLabelHidden
                                    size="sm"
                                    variant="ghost"
                                    presentation="adaptive"
                                    options={allFlavors.map((o) => ({
                                        value: o.id,
                                        label: o.formId ? `${formNameOf(o.formId)} · ${versionList(o.versions)}` : versionList(o.versions),
                                        icon: <GameBadges versions={o.versions.slice(0, 1)} />,
                                    }))}
                                    value={flavorShown.id}
                                    onChange={chooseFlavor}
                                />
                            )}
                            <Button
                                size="sm"
                                variant="ghost"
                                label={
                                    allEntries
                                        ? t("entriesHide")
                                        : formFlavors.some((o) => o.formId === id) && !flavorShown.formId
                                          ? `${t("entriesShowAll")} · ${t("entriesFormHint", { n: formFlavors.filter((o) => o.formId === id).length })}`
                                          : `${t("entriesShowAll")} (${allFlavors.length})`
                                }
                                onClick={() => setAllEntries((v) => !v)}
                                aria-expanded={allEntries}
                            />
                        </HStack>
                    ) : undefined
                }
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
                                                        <Token size="sm" label={t("changedInGen", { gen: abilitiesView.at.changedIn })} />
                                                    ) : undefined
                                                }
                                            >
                                                {/* 특성마다 한 묶음: 사이에 구분선 */}
                                                <VStack as="ul" gap={0} className="divide-y divide-border">
                                                    {shownAbilities.map((a) => (
                                                        <VStack as="li" key={a.name} gap={0.5} paddingBlock={2} className="first:pt-0 last:pb-0">
                                                            <HStack gap={2} vAlign="center" wrap="wrap">
                                                                <Link href={`/abilities/${a.name}`} weight="semibold" color="primary">
                                                                    {abilityName(a.name, lang)}
                                                                </Link>
                                                                {a.hidden && <Token size="sm" label={t("hiddenAbility")} />}
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

                    </VStack>
                )}

                {tab === "stats" && (
                    <VStack gap={3}>
                        {statsChart(
                            /* 노력치: 같은 카드 맨 아래 한 줄 ("노력치 ⓘ  HP +2") */
                            <HStack gap={2} vAlign="center" wrap="wrap">
                                <Text weight="semibold">{t("evYield")}</Text>
                                <InfoTip content={t("evYieldHint")} label={t("infoAbout", { label: t("evYield") })} size="xsm" />
                                {detail ? (
                                    evYield.length > 0 ? (
                                        evYield.map((e) => <Token key={e.key} size="sm" label={`${e.label} +${e.effort}`} />)
                                    ) : (
                                        <Text color="secondary">{t("none")}</Text>
                                    )
                                ) : detailQ.isError ? (
                                    <Text color="secondary">-</Text>
                                ) : (
                                    <Skeleton width={72} height={20} />
                                )}
                                {currentNote}
                            </HStack>,
                        )}
                        <RealStatsPanel dexId={id} note={currentNote} />
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

/**
 * 그림 바로 아래 폼 선택: 폼마다 그림 타일(크게 눌리는 버튼). 지금 폼은 테두리로, 위 줄에는 올린(또는 지금) 폼 이름.
 * 글자 칩·드롭다운보다 모양으로 바로 고를 수 있고, 폼이 많아도(피카츄 17개) 한눈에 보인다.
 */
function FormPicker({ forms, id, lang, label, search }: { forms: readonly DexPokemon[]; id: number; lang: Lang; label: string; search: string }) {
    const [hover, setHover] = useState<number | null>(null)
    const formName = (f: DexPokemon) => formLabel(f, lang) ?? pokemonName(f, lang)
    const shown = forms.find((f) => f.id === (hover ?? id)) ?? forms[0]
    return (
        <VStack gap={1.5}>
            <HStack gap={1.5} vAlign="center">
                <Text type="supporting" color="secondary" hasTabularNumbers>
                    {label} {forms.length}
                </Text>
                <Text type="supporting" weight="semibold" maxLines={1} aria-live="polite">
                    {formName(shown)}
                </Text>
            </HStack>
            <ul aria-label={label} className="grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-1.5">
                {forms.map((f) => {
                    const current = f.id === id
                    return (
                        <li key={f.id}>
                            <RouterLink
                                to={`/pokemon/${f.id}${search}`}
                                aria-label={formName(f)}
                                aria-current={current ? "page" : undefined}
                                title={formName(f)}
                                onMouseEnter={() => setHover(f.id)}
                                onMouseLeave={() => setHover(null)}
                                onFocus={() => setHover(f.id)}
                                onBlur={() => setHover(null)}
                                className={`flex aspect-square items-center justify-center rounded-lg border transition-colors ${
                                    current ? "border-2 border-primary bg-muted" : "border-border bg-surface hover:border-border-emphasized hover:bg-muted"
                                }`}
                            >
                                <PokeImage sources={pokemonImageCandidates(f.id, 40, { sprite: f.sprite })} alt="" size={40} className="size-10" />
                            </RouterLink>
                        </li>
                    )
                })}
            </ul>
        </VStack>
    )
}
