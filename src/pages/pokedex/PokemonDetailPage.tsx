import { type CSSProperties, type KeyboardEvent, type ReactNode, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router"
import BattleStatsPanel from "../../components/BattleStatsPanel"
import { TypeIcon } from "../../components/TypeIcon"
import { getIdFromUrl } from "../../common/utils"
import {
    type EvolutionChainLink,
    type EvolutionDetail,
    type PokemonDetail,
    type PokemonMoveEntry,
    type PokemonSpecies,
    type PokemonSprites,
    useEvolutionChain,
    usePokemonDetail,
    usePokemonSpecies,
} from "../../hooks/usePokemon"
import { LANGS, type Lang, type TFunction, collator, formatNumber, useDocumentTitle, useLang, useT } from "../../i18n"
import { commonMessages } from "../../i18n/messages/common"
import { type PokedexKey, isPokedexKey, pokedexMessages } from "../../i18n/messages/pokedex"
import { itemName } from "../../lib/battle"
import {
    ABILITY_BY_NAME,
    ALL_POKEMON,
    MOVE_BY_NAME,
    STAT_KEYS,
    type DexPokemon,
    type StatKey,
    abilityName,
    damageClassName,
    eggGroupName,
    findDexPokemonByName,
    formLabel,
    generationName,
    getDexPokemon,
    getGeneration,
    getSpeciesId,
    localText,
    moveName,
    officialArtworkUrl,
    pokemonName,
    statLabel,
    titleCaseSlug,
    typeName,
} from "../../lib/dex"

type T = TFunction<PokedexKey>

// ─── Type accent palette ──────────────────────────────────────────────────────
const TYPE_ACCENT: Record<string, string> = {
    fire: "#F97316",
    water: "#3B82F6",
    grass: "#22C55E",
    electric: "#EAB308",
    ice: "#06B6D4",
    fighting: "#EF4444",
    poison: "#A855F7",
    ground: "#F59E0B",
    flying: "#6366F1",
    psychic: "#EC4899",
    bug: "#84CC16",
    rock: "#92400E",
    ghost: "#7C3AED",
    dragon: "#4F46E5",
    dark: "#374151",
    steel: "#6B7280",
    fairy: "#F472B6",
    normal: "#9CA3AF",
}

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

function multLabel(m: number): string {
    if (m === 0.25) return "¼×"
    if (m === 0.5) return "½×"
    return `${m}×`
}

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

/** PokeAPI 스탯 이름 → 로컬 StatKey */
const API_STAT_KEY: Record<string, StatKey> = {
    hp: "hp",
    attack: "attack",
    defense: "defense",
    "special-attack": "spAtk",
    "special-defense": "spDef",
    speed: "speed",
}

const STAT_BAR_CLASS: Record<StatKey, string> = {
    hp: "bg-red-400",
    attack: "bg-orange-400",
    defense: "bg-amber-400",
    spAtk: "bg-indigo-400",
    spDef: "bg-emerald-400",
    speed: "bg-pink-400",
}

function dexNo(n: number): string {
    return `#${String(n).padStart(4, "0")}`
}

type Tab = "overview" | "stats" | "moves" | "sprites"
const TABS: readonly Tab[] = ["overview", "stats", "moves", "sprites"]
const TAB_LABEL: Record<Tab, PokedexKey> = {
    overview: "tabOverview",
    stats: "tabStats",
    moves: "tabMoves",
    sprites: "tabSprites",
}
function parseTab(v: string | null): Tab {
    return TABS.includes(v as Tab) ? (v as Tab) : "overview"
}

// ─── Small UI pieces ──────────────────────────────────────────────────────────

function Card({ title, children, className = "", aside }: { title?: ReactNode; children: ReactNode; className?: string; aside?: ReactNode }) {
    return (
        <section className={`min-w-0 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6 ${className}`}>
            {(title || aside) && (
                <div className="mb-4 flex items-center justify-between gap-2">
                    {title && <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">{title}</h2>}
                    {aside}
                </div>
            )}
            {children}
        </section>
    )
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-2.5 last:border-b-0">
            <dt className="shrink-0 text-sm text-slate-400">{label}</dt>
            <dd className="text-right text-sm font-semibold text-slate-800">{children}</dd>
        </div>
    )
}

function Skeleton({ className = "" }: { className?: string }) {
    return <div className={`animate-pulse rounded-xl bg-slate-100 ${className}`} aria-hidden />
}

function SkeletonRows({ n = 4 }: { n?: number }) {
    return (
        <div className="space-y-2.5">
            {Array.from({ length: n }, (_, i) => (
                <Skeleton key={i} className="h-6" />
            ))}
        </div>
    )
}

function InlineError({ message, onRetry, retryLabel }: { message: string; onRetry?: () => void; retryLabel: string }) {
    return (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600" role="alert">
            <span>{message}</span>
            {onRetry && (
                <button type="button" onClick={onRetry} className="ml-auto rounded-lg px-2 py-0.5 font-semibold underline-offset-2 hover:underline">
                    {retryLabel}
                </button>
            )}
        </div>
    )
}

function TypeChip({ type, lang, suffix }: { type: string; lang: Lang; suffix?: ReactNode }) {
    return (
        <span className={`${type} inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-bold leading-none text-white`}>
            <img src={`${import.meta.env.BASE_URL}assets/types/${type}.svg`} alt="" aria-hidden className="h-3.5 w-3.5 shrink-0" />
            {typeName(type, lang)}
            {suffix}
        </span>
    )
}

// ─── Artwork ──────────────────────────────────────────────────────────────────

function Artwork({ src, fallback, alt }: { src: string; fallback?: string | null; alt: string }) {
    const [stage, setStage] = useState<0 | 1 | 2>(src ? 0 : fallback ? 1 : 2)
    if (stage === 2) {
        return <div className="flex h-56 w-56 items-center justify-center rounded-full bg-slate-100 text-5xl font-black text-slate-200 sm:h-64 sm:w-64" aria-hidden>?</div>
    }
    const url = stage === 0 ? src : fallback ?? ""
    return (
        <img
            src={url}
            alt={alt}
            width={256}
            height={256}
            onError={() => setStage(stage === 0 && fallback ? 1 : 2)}
            className={`h-56 w-56 object-contain drop-shadow-[0_24px_32px_rgba(15,23,42,0.18)] sm:h-64 sm:w-64 ${stage === 1 ? "[image-rendering:pixelated]" : ""}`}
        />
    )
}

// ─── Prev / Next ──────────────────────────────────────────────────────────────

function NeighborLink({ p, dir, lang, label }: { p: DexPokemon | undefined; dir: "prev" | "next"; lang: Lang; label: string }) {
    const base = "flex min-w-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm shadow-sm transition"
    if (!p) {
        return (
            <span className={`${base} cursor-not-allowed opacity-40`} aria-disabled>
                <span aria-hidden>{dir === "prev" ? "←" : "→"}</span>
                <span className="sr-only">{label}</span>
            </span>
        )
    }
    const name = pokemonName(p, lang)
    return (
        <Link
            to={`/pokemon/${p.id}`}
            rel={dir}
            aria-label={`${label}: ${dexNo(p.id)} ${name}`}
            className={`${base} text-slate-700 hover:border-slate-300 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400`}
        >
            {dir === "prev" && <span aria-hidden>←</span>}
            <span className="hidden text-xs tabular-nums text-slate-400 sm:inline">{dexNo(p.id)}</span>
            <span className="max-w-[6.5rem] truncate font-semibold sm:max-w-[9rem]">{name}</span>
            {dir === "next" && <span aria-hidden>→</span>}
        </Link>
    )
}

// ─── Evolution chain ──────────────────────────────────────────────────────────

function evoConditions(d: EvolutionDetail | undefined, lang: Lang, t: T): string[] {
    if (!d) return []
    const parts: string[] = []
    if (d.min_level) parts.push(t("evoLevel", { n: d.min_level }))
    if (d.trigger?.name === "trade") parts.push(t("evoTrade"))
    if (d.item) parts.push(itemName(d.item.name, lang))
    if (d.held_item) parts.push(t("evoHolding", { item: itemName(d.held_item.name, lang) }))
    if (d.min_happiness) parts.push(t("evoFriendship"))
    if (d.min_affection) parts.push(t("evoAffection"))
    if (d.known_move) parts.push(t("evoKnowsMove", { move: moveName(d.known_move.name, lang) }))
    if (d.known_move_type) parts.push(t("evoKnowsMoveType", { type: typeName(d.known_move_type.name, lang) }))
    if (d.time_of_day === "day") parts.push(t("evoDay"))
    if (d.time_of_day === "night") parts.push(t("evoNight"))
    if (d.time_of_day === "dusk") parts.push(t("evoDusk"))
    if (d.gender === 1) parts.push(t("evoFemale"))
    if (d.gender === 2) parts.push(t("evoMale"))
    if (d.location) parts.push(t("evoLocation"))
    if (d.trade_species) {
        const p = findDexPokemonByName(d.trade_species.name)
        parts.push(t("evoTradeFor", { name: p ? pokemonName(p, lang) : titleCaseSlug(d.trade_species.name) }))
    }
    if (d.needs_overworld_rain) parts.push(t("evoRain"))
    if (d.turn_upside_down) parts.push(t("evoUpsideDown"))
    if (parts.length === 0) parts.push(d.trigger?.name === "level-up" ? t("evoLevelUp") : t("evoSpecial"))
    return parts
}

function EvoNode({ link, currentSpeciesId, lang }: { link: EvolutionChainLink; currentSpeciesId: number | undefined; lang: Lang }) {
    const id = getIdFromUrl(link.species.url) ?? 0
    const p = getDexPokemon(id)
    const name = p ? pokemonName(p, lang) : titleCaseSlug(link.species.name)
    const current = id === currentSpeciesId
    const inner = (
        <>
            <span
                className={`flex h-20 w-20 items-center justify-center rounded-2xl border bg-slate-50 transition ${
                    current ? "border-(--accent) ring-2 ring-(--accent)/30" : "border-slate-100 group-hover:border-slate-300"
                }`}
            >
                <img src={officialArtworkUrl(id)} alt="" loading="lazy" className="h-16 w-16 object-contain" />
            </span>
            <span className={`max-w-24 truncate text-center text-xs font-semibold ${current ? "text-slate-900" : "text-slate-600"}`}>{name}</span>
            <span className="text-[10px] tabular-nums text-slate-400">{dexNo(id)}</span>
        </>
    )
    return p && !current ? (
        <Link to={`/pokemon/${id}`} className="group flex shrink-0 flex-col items-center gap-1 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
            {inner}
        </Link>
    ) : (
        <span className="flex shrink-0 flex-col items-center gap-1" aria-current={current ? "page" : undefined}>
            {inner}
        </span>
    )
}

function EvoTree({ link, currentSpeciesId, lang, t }: { link: EvolutionChainLink; currentSpeciesId: number | undefined; lang: Lang; t: T }) {
    return (
        <div className="flex flex-col items-center gap-2 sm:flex-row">
            <EvoNode link={link} currentSpeciesId={currentSpeciesId} lang={lang} />
            {link.evolves_to.length > 0 && (
                <div className="flex flex-row flex-wrap justify-center gap-x-4 gap-y-3 sm:flex-col sm:items-start">
                    {link.evolves_to.map((child) => (
                        <div key={child.species.name} className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
                            <div className="flex w-24 flex-col items-center text-center sm:w-28">
                                <span className="text-lg leading-none text-slate-300" aria-hidden>
                                    <span className="sm:hidden">↓</span>
                                    <span className="hidden sm:inline">→</span>
                                </span>
                                {evoConditions(child.evolution_details[0], lang, t).map((c) => (
                                    <span key={c} className="mt-0.5 rounded-full bg-(--accent)/10 px-2 py-0.5 text-[10px] font-semibold leading-tight text-slate-700">
                                        {c}
                                    </span>
                                ))}
                            </div>
                            <EvoTree link={child} currentSpeciesId={currentSpeciesId} lang={lang} t={t} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Moves ────────────────────────────────────────────────────────────────────

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

const CLASS_STYLE: Record<string, string> = {
    physical: "bg-orange-50 text-orange-600",
    special: "bg-sky-50 text-sky-600",
    status: "bg-slate-100 text-slate-500",
}

function MovesPanel({
    detail,
    loading,
    error,
    onRetry,
    fallbackMoves,
    lang,
    t,
    retryLabel,
    allLabel,
}: {
    detail: PokemonDetail | undefined
    loading: boolean
    error: boolean
    onRetry: () => void
    fallbackMoves: readonly string[] | undefined
    lang: Lang
    t: T
    retryLabel: string
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
        const q = query.trim().toLowerCase()
        const coll = collator(lang)
        const name = (slug: string) => moveName(slug, lang)
        const matches = (slug: string) => {
            if (!q) return true
            const m = MOVE_BY_NAME.get(slug)
            return [slug, m?.nameEn, m?.hasKoreanName ? m.nameKo : null, m?.nameJa].some((s) => s?.toLowerCase().includes(q))
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

    if (loading && !fallbackMoves) return <Card title={t("tabMoves")}><SkeletonRows n={8} /></Card>
    if (error && rows.length === 0) {
        return (
            <Card title={t("tabMoves")}>
                <InlineError message={t("loadErrorTitle")} onRetry={onRetry} retryLabel={retryLabel} />
            </Card>
        )
    }

    const showLevel = method === "level-up" || method === "all"
    const chipCls = (active: boolean) =>
        `shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition ${
            active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
        }`

    return (
        <Card title={t("tabMoves")}>
            {error && <InlineError message={t("loadErrorTitle")} onRetry={onRetry} retryLabel={retryLabel} />}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label={t("methodFilter")}>
                    <button type="button" aria-pressed={method === "all"} onClick={() => setPicked("all")} className={chipCls(method === "all")}>
                        {allLabel} <span className="tabular-nums opacity-60">{rows.length}</span>
                    </button>
                    {methods.map((m) => (
                        <button key={m} type="button" aria-pressed={method === m} onClick={() => setPicked(m)} className={chipCls(method === m)}>
                            {t(METHOD_LABEL[m])} <span className="tabular-nums opacity-60">{counts.get(m)}</span>
                        </button>
                    ))}
                </div>
                <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("moveSearchPlaceholder")}
                    aria-label={t("moveSearchLabel")}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100 md:w-56"
                />
            </div>
            {game && <p className="mt-2 text-[11px] text-slate-400">{t("movesNote", { game: versionGroupName(game, lang) })}</p>}

            {visible.length === 0 ? (
                <p className="mt-4 rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">{t("noMoves")}</p>
            ) : (
                <div className="mt-3 overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 text-left text-[11px] font-semibold text-slate-400">
                                {showLevel && <th scope="col" className="w-12 py-2 pr-2 font-semibold">{t("colLevel")}</th>}
                                <th scope="col" className="py-2 pr-2 font-semibold">{t("colMove")}</th>
                                <th scope="col" className="py-2 pr-2 font-semibold">{t("colType")}</th>
                                <th scope="col" className="hidden py-2 pr-2 font-semibold sm:table-cell">{t("colClass")}</th>
                                <th scope="col" className="py-2 pr-1 text-right font-semibold">{t("colPower")}</th>
                                <th scope="col" className="hidden py-2 pr-1 text-right font-semibold sm:table-cell">{t("colAccuracy")}</th>
                                <th scope="col" className="hidden py-2 text-right font-semibold sm:table-cell">{t("colPP")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map((r) => {
                                const m = MOVE_BY_NAME.get(r.slug)
                                return (
                                    <tr key={`${r.method}:${r.slug}:${r.level ?? ""}`} className="border-b border-slate-50 hover:bg-slate-50/70">
                                        {showLevel && (
                                            <td className="py-2 pr-2 text-xs font-bold tabular-nums text-slate-500">
                                                {r.method === "level-up" ? (r.level === 0 ? t("evoMoveLevel") : r.level) : "—"}
                                            </td>
                                        )}
                                        <td className="py-2 pr-2">
                                            {m ? (
                                                <Link to={`/moves/${r.slug}`} className="font-semibold text-slate-800 hover:text-red-500 hover:underline">
                                                    {moveName(r.slug, lang)}
                                                </Link>
                                            ) : (
                                                <span className="font-semibold text-slate-800">{moveName(r.slug, lang)}</span>
                                            )}
                                            {method === "all" && r.method !== "level-up" && (
                                                <span className="ml-1.5 text-[10px] text-slate-400">{t(METHOD_LABEL[r.method])}</span>
                                            )}
                                        </td>
                                        <td className="py-2 pr-2">{m && <TypeChip type={m.type} lang={lang} />}</td>
                                        <td className="hidden py-2 pr-2 sm:table-cell">
                                            {m && (
                                                <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${CLASS_STYLE[m.damageClass] ?? CLASS_STYLE.status}`}>
                                                    {damageClassName(m.damageClass, lang)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-2 pr-1 text-right tabular-nums text-slate-700">{m?.power ?? "—"}</td>
                                        <td className="hidden py-2 pr-1 text-right tabular-nums text-slate-500 sm:table-cell">{m?.accuracy ?? "—"}</td>
                                        <td className="hidden py-2 text-right tabular-nums text-slate-500 sm:table-cell">{m?.pp ?? "—"}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    )
}

// ─── Sprites ──────────────────────────────────────────────────────────────────

const ROMAN: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9 }

function SpriteItem({ label, src, size, pixelated }: { label: string; src: string; size: "sm" | "md" | "lg"; pixelated?: boolean }) {
    const box = size === "lg" ? "h-28 w-28" : size === "md" ? "h-24 w-24" : "h-[72px] w-[72px]"
    return (
        <figure className="flex flex-col items-center gap-1.5">
            <div className={`${box} flex items-center justify-center rounded-2xl border border-slate-100 bg-slate-50`}>
                <img src={src} alt={label} loading="lazy" className={`h-[88%] w-[88%] object-contain ${pixelated ? "[image-rendering:pixelated]" : ""}`} />
            </div>
            <figcaption className="max-w-28 text-center text-[11px] leading-tight text-slate-400">{label}</figcaption>
        </figure>
    )
}

/** URL 이 있는 항목만 */
function present(list: [PokedexKey, string | null | undefined][]): [PokedexKey, string][] {
    return list.flatMap(([k, src]) => (src ? [[k, src] as [PokedexKey, string]] : []))
}

function SpritesGallery({ sprites, lang, t }: { sprites: PokemonSprites; lang: Lang; t: T }) {
    const main = present([
            ["spriteDefault", sprites.front_default],
            ["spriteBack", sprites.back_default],
            ["spriteShiny", sprites.front_shiny],
            ["spriteBackShiny", sprites.back_shiny],
            ["spriteFemale", sprites.front_female],
            ["spriteShinyFemale", sprites.front_shiny_female],
    ])

    const extra = present([
            ["spriteHome", sprites.other?.home?.front_default],
            ["spriteHomeShiny", sprites.other?.home?.front_shiny],
            ["spriteHomeFemale", sprites.other?.home?.front_female],
            ["spriteDreamWorld", sprites.other?.dream_world?.front_default],
    ])

    const gens: { gen: number; items: { label: string; src: string }[] }[] = []
    for (const [genKey, games] of Object.entries(sprites.versions ?? {})) {
        const gen = ROMAN[genKey.replace("generation-", "")] ?? 0
        const items: { label: string; src: string }[] = []
        for (const [game, data] of Object.entries(games)) {
            if (data?.front_default) items.push({ label: titleCaseSlug(game), src: data.front_default })
        }
        if (items.length) gens.push({ gen, items })
    }
    gens.sort((a, b) => a.gen - b.gen)

    if (!main.length && !extra.length && !gens.length) {
        return <p className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">{t("noSprites")}</p>
    }

    return (
        <div className="space-y-4">
            {main.length > 0 && (
                <Card title={t("spritesGame")}>
                    <div className="flex flex-wrap gap-3 sm:gap-4">
                        {main.map(([k, src]) => (
                            <SpriteItem key={k} label={t(k)} src={src} size="md" pixelated />
                        ))}
                    </div>
                </Card>
            )}
            {extra.length > 0 && (
                <Card title={t("spritesArtwork")}>
                    <div className="flex flex-wrap gap-3 sm:gap-4">
                        {extra.map(([k, src]) => (
                            <SpriteItem key={k} label={t(k)} src={src} size="lg" />
                        ))}
                    </div>
                </Card>
            )}
            {gens.length > 0 && (
                <Card title={t("spritesGenerations")}>
                    <div className="space-y-5">
                        {gens.map(({ gen, items }) => (
                            <div key={gen}>
                                <h3 className="mb-2 text-xs font-bold text-slate-500">{gen ? generationName(gen, lang) : "—"}</h3>
                                <div className="flex flex-wrap gap-3">
                                    {items.map((x) => (
                                        <SpriteItem key={x.label} label={x.label} src={x.src} size="sm" pixelated />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    )
}

// ─── Page states ──────────────────────────────────────────────────────────────

function DetailSkeleton({ label }: { label: string }) {
    return (
        <div className="space-y-5" role="status" aria-live="polite">
            <span className="sr-only">{label}</span>
            <div className="flex justify-between">
                <Skeleton className="h-9 w-28" />
                <Skeleton className="h-9 w-40" />
            </div>
            <div className="grid gap-6 rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-8 md:grid-cols-[1fr_256px]">
                <div className="space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-12 w-2/3" />
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-16 w-full" />
                </div>
                <Skeleton className="mx-auto h-56 w-56 rounded-full" />
            </div>
            <Skeleton className="h-40 rounded-3xl" />
        </div>
    )
}

function StatePanel({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
    return (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
            <svg viewBox="0 0 48 48" className="h-12 w-12 text-slate-200" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                <circle cx="24" cy="24" r="21" />
                <path d="M3 24h42" />
                <circle cx="24" cy="24" r="6" fill="white" />
            </svg>
            <h1 className="mt-3 text-lg font-bold text-slate-900">{title}</h1>
            <p className="mt-1 max-w-sm text-sm text-slate-500">{body}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>
        </div>
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
    const setTab = (next: Tab) => setSearchParams(next === "overview" ? {} : { tab: next }, { replace: true })

    const local = useMemo(() => resolveLocal(param), [param])
    const apiKey = local ? String(local.id) : param.trim().toLowerCase()
    const detailQ = usePokemonDetail(apiKey)
    const detail = detailQ.data

    const speciesId = local ? getSpeciesId(local) : getIdFromUrl(detail?.species.url)
    const speciesQ = usePokemonSpecies(speciesId)
    const species: PokemonSpecies | undefined = speciesQ.data
    const evoQ = useEvolutionChain(species?.evolution_chain?.url)

    const types = useMemo(
        () => local?.types ?? detail?.types.slice().sort((a, b) => a.slot - b.slot).map((x) => x.type.name) ?? [],
        [local, detail],
    )
    const accent = TYPE_ACCENT[types[0]] ?? TYPE_ACCENT.normal

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

    const stats = useMemo(() => {
        if (local) return STAT_KEYS.map((k) => ({ key: k, value: local.stats[k] }))
        return (detail?.stats ?? [])
            .map((s) => ({ key: API_STAT_KEY[s.stat.name], value: s.base_stat }))
            .filter((s): s is { key: StatKey; value: number } => !!s.key)
    }, [local, detail])
    const statTotal = stats.reduce((sum, s) => sum + s.value, 0)

    const matchups = useMemo(() => computeDefense(types), [types])
    const weaknesses = matchups.filter(([, v]) => v > 1).sort((a, b) => b[1] - a[1])
    const resistances = matchups.filter(([, v]) => v > 0 && v < 1).sort((a, b) => a[1] - b[1])
    const immunities = matchups.filter(([, v]) => v === 0)

    const forms = useMemo(() => (speciesId ? ALL_POKEMON.filter((p) => getSpeciesId(p) === speciesId) : []), [speciesId])

    // 이전/다음: 전국도감 번호 기준 (기본 폼)
    const prev = speciesId ? getDexPokemon(speciesId - 1) : undefined
    const next = speciesId ? getDexPokemon(speciesId + 1) : undefined

    // 다른 포켓몬으로 이동하면 맨 위로
    useEffect(() => {
        window.scrollTo({ top: 0 })
    }, [param])

    // ← → 키로 이전/다음 포켓몬
    useEffect(() => {
        const onKey = (e: globalThis.KeyboardEvent) => {
            if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
            const el = e.target as HTMLElement | null
            if (el?.closest("input, textarea, select, [contenteditable], [role=tablist]")) return
            const target = e.key === "ArrowLeft" ? prev : e.key === "ArrowRight" ? next : undefined
            if (target) navigate(`/pokemon/${target.id}${tab === "overview" ? "" : `?tab=${tab}`}`)
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [prev, next, navigate, tab])

    const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
        const i = TABS.indexOf(tab)
        let n = -1
        if (e.key === "ArrowRight") n = (i + 1) % TABS.length
        else if (e.key === "ArrowLeft") n = (i - 1 + TABS.length) % TABS.length
        else if (e.key === "Home") n = 0
        else if (e.key === "End") n = TABS.length - 1
        if (n < 0) return
        e.preventDefault()
        setTab(TABS[n])
        document.getElementById(`pokemon-tab-${TABS[n]}`)?.focus()
    }

    // ── Guards ──
    if (!local) {
        if (apiKey && detailQ.isPending) return <DetailSkeleton label={tc("loading")} />
        if (!detail) {
            const notFound = !apiKey || (detailQ.error instanceof Error && detailQ.error.message.endsWith("404"))
            return notFound ? (
                <StatePanel title={t("notFoundTitle")} body={t("notFoundBody", { id: param })}>
                    <Link to="/pokedex" className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500">
                        {t("backToDex")}
                    </Link>
                </StatePanel>
            ) : (
                <StatePanel title={t("loadErrorTitle")} body={t("loadErrorBody")}>
                    <button
                        type="button"
                        onClick={() => void detailQ.refetch()}
                        className="rounded-full bg-red-500 px-5 py-2 text-sm font-semibold text-white hover:bg-red-600"
                    >
                        {t("retry")}
                    </button>
                    <Link to="/pokedex" className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300">
                        {t("backToDex")}
                    </Link>
                </StatePanel>
            )
        }
    }

    const id = local?.id ?? detail?.id ?? 0
    const shownNo = speciesId ?? id
    const generation = local ? getGeneration(local) : ROMAN[species?.generation.name.replace("generation-", "") ?? ""]
    const artwork = local ? officialArtworkUrl(local.id) : (detail?.sprites.other?.["official-artwork"]?.front_default ?? "")
    const spriteFallback = local?.sprite ?? detail?.sprites.front_default ?? null
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

    const speciesRows: { label: string; value: ReactNode }[] = species
        ? [
              { label: t("generation"), value: generation ? generationName(generation, lang) : "—" },
              { label: t("growthRate"), value: isPokedexKey(growthKey) ? t(growthKey) : titleCaseSlug(species.growth_rate.name) },
              {
                  label: t("captureRate"),
                  value: `${species.capture_rate} (${formatNumber((species.capture_rate / 255) * 100, lang, { maximumFractionDigits: 1 })}%)`,
              },
              { label: t("baseHappiness"), value: species.base_happiness ?? "—" },
              { label: t("color"), value: isPokedexKey(colorKey) ? t(colorKey) : titleCaseSlug(species.color.name) },
          ]
        : []

    return (
        <div className="space-y-5" style={{ "--accent": accent } as CSSProperties}>
            {/* ── 상단 내비게이션 ── */}
            <nav className="flex items-center justify-between gap-2" aria-label={t("detailTabs")}>
                <Link
                    to="/pokedex"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                >
                    <span aria-hidden>←</span>
                    {t("backToDex")}
                </Link>
                <div className="flex min-w-0 items-center gap-1.5" title={t("keyboardHint")}>
                    <NeighborLink p={prev} dir="prev" lang={lang} label={t("prev")} />
                    <NeighborLink p={next} dir="next" lang={lang} label={t("next")} />
                </div>
            </nav>

            {/* ── HERO ── */}
            <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
                <div className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full bg-(--accent)/10" aria-hidden />
                <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-(--accent)/5" aria-hidden />

                <div className="relative grid gap-4 p-5 sm:p-8 md:grid-cols-[minmax(0,1fr)_256px] md:items-center md:gap-8">
                    <div className="order-2 min-w-0 md:order-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-extrabold tabular-nums text-slate-300">{dexNo(shownNo)}</span>
                            {generation ? (
                                <span className="rounded-full bg-(--accent)/10 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                                    {generationName(generation, lang)}
                                </span>
                            ) : null}
                            {species?.is_legendary && (
                                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">{t("legendary")}</span>
                            )}
                            {species?.is_mythical && (
                                <span className="rounded-full bg-pink-50 px-2.5 py-0.5 text-[11px] font-bold text-pink-700">{t("mythical")}</span>
                            )}
                            {species?.is_baby && (
                                <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold text-violet-700">{t("baby")}</span>
                            )}
                        </div>

                        <h1 className="mt-2 break-words text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">{name}</h1>
                        {form && <p className="mt-0.5 text-base font-semibold text-slate-500">{form}</p>}
                        {otherNames.length > 0 && (
                            <p className="mt-1 text-sm text-slate-400" aria-label={t("otherNames")}>
                                {otherNames.map((o, i) => (
                                    <span key={o.n} lang={o.lang}>
                                        {i > 0 && " · "}
                                        {o.n}
                                    </span>
                                ))}
                            </p>
                        )}
                        {genusEntry ? (
                            <p className="mt-1 text-sm italic text-slate-500">{genusEntry.genus}</p>
                        ) : speciesQ.isPending && speciesId ? (
                            <Skeleton className="mt-2 h-4 w-32" />
                        ) : null}

                        <TypeIcon types={types} className="mt-4" />

                        {flavor ? (
                            <blockquote
                                lang={flavorEntry?.language.name.split("-")[0]}
                                className="mt-4 max-w-prose border-l-4 border-(--accent)/40 pl-3 text-sm leading-relaxed text-slate-600"
                            >
                                {flavor}
                            </blockquote>
                        ) : speciesQ.isPending && speciesId ? (
                            <div className="mt-4 space-y-1.5">
                                <Skeleton className="h-3.5 w-full max-w-md" />
                                <Skeleton className="h-3.5 w-4/5 max-w-sm" />
                            </div>
                        ) : null}

                        {/* Quick metrics */}
                        <dl className="mt-5 grid max-w-md grid-cols-3 gap-2 sm:gap-3">
                            {[
                                { label: t("height"), value: detail ? `${formatNumber(detail.height / 10, lang, decimal)} m` : null },
                                { label: t("weight"), value: detail ? `${formatNumber(detail.weight / 10, lang, decimal)} kg` : null },
                                { label: t("baseExp"), value: detail ? (detail.base_experience ?? "—") : null },
                            ].map(({ label, value }) => (
                                <div key={label} className="min-w-0 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5 sm:px-4 sm:py-3">
                                    <dt className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
                                    <dd className="mt-1 text-base font-extrabold tabular-nums text-slate-900 sm:text-lg">
                                        {value ?? (detailQ.isError ? "—" : <Skeleton className="h-5 w-12" />)}
                                    </dd>
                                </div>
                            ))}
                        </dl>

                        {/* Abilities (compact) */}
                        {abilities.length > 0 && (
                            <div className="mt-5">
                                <div className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">{t("abilities")}</div>
                                <div className="flex flex-wrap gap-2">
                                    {abilities.map((a) => (
                                        <Link
                                            key={a.name}
                                            to={`/abilities/${a.name}`}
                                            className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition hover:shadow-sm ${
                                                a.hidden
                                                    ? "border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-300"
                                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                                            }`}
                                        >
                                            {abilityName(a.name, lang)}
                                            {a.hidden && <span className="ml-1.5 text-[10px] font-bold text-violet-500">{t("hiddenAbility")}</span>}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="order-1 flex justify-center md:order-2">
                        <Artwork key={id} src={artwork} fallback={spriteFallback} alt={t("artworkAlt", { name })} />
                    </div>
                </div>

                {/* Tab bar */}
                <div
                    role="tablist"
                    aria-label={t("detailTabs")}
                    onKeyDown={onTabKey}
                    className="relative flex overflow-x-auto border-t border-slate-100 px-2 sm:px-6"
                >
                    {TABS.map((key) => {
                        const active = tab === key
                        const count = key === "moves" ? (detail?.moves.length ?? local?.moves.length) : undefined
                        return (
                            <button
                                key={key}
                                id={`pokemon-tab-${key}`}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                aria-controls={`pokemon-panel-${key}`}
                                tabIndex={active ? 0 : -1}
                                onClick={() => setTab(key)}
                                className={`-mb-px shrink-0 border-b-2 px-4 py-3.5 text-sm font-bold transition focus:outline-none focus-visible:bg-slate-50 sm:px-5 ${
                                    active ? "border-(--accent) text-slate-900" : "border-transparent text-slate-400 hover:text-slate-700"
                                }`}
                            >
                                {t(TAB_LABEL[key])}
                                {count ? <span className="ml-1 text-xs font-semibold tabular-nums text-slate-400">{count}</span> : null}
                            </button>
                        )
                    })}
                </div>
            </section>

            {/* ── CONTENT ── */}
            <div role="tabpanel" id={`pokemon-panel-${tab}`} aria-labelledby={`pokemon-tab-${tab}`} tabIndex={-1} className="focus:outline-none">
                {tab === "overview" && (
                    <div className="grid gap-4 md:grid-cols-2">
                        {abilities.length > 0 && (
                            <Card title={t("abilities")} className="md:col-span-2">
                                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {abilities.map((a) => {
                                        const desc = localText(ABILITY_BY_NAME.get(a.name)?.desc, lang)
                                        return (
                                            <li key={a.name}>
                                                <Link
                                                    to={`/abilities/${a.name}`}
                                                    className={`block h-full rounded-2xl border p-3.5 transition hover:shadow-sm ${
                                                        a.hidden ? "border-violet-200 bg-violet-50/60 hover:border-violet-300" : "border-slate-200 hover:border-slate-300"
                                                    }`}
                                                >
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="font-bold text-slate-900">{abilityName(a.name, lang)}</span>
                                                        {a.hidden && (
                                                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                                                                {t("hiddenAbility")}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{desc ?? t("abilityNoDesc")}</p>
                                                </Link>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </Card>
                        )}

                        <Card title={t("species")}>
                            {speciesQ.isError ? (
                                <InlineError message={t("loadErrorTitle")} onRetry={() => void speciesQ.refetch()} retryLabel={retry} />
                            ) : !species ? (
                                <SkeletonRows n={5} />
                            ) : (
                                <dl>
                                    {speciesRows.map((r) => (
                                        <InfoRow key={r.label} label={r.label}>
                                            {r.value}
                                        </InfoRow>
                                    ))}
                                </dl>
                            )}
                        </Card>

                        <Card title={t("breeding")}>
                            {speciesQ.isError ? (
                                <InlineError message={t("loadErrorTitle")} onRetry={() => void speciesQ.refetch()} retryLabel={retry} />
                            ) : !species ? (
                                <SkeletonRows n={3} />
                            ) : (
                                <dl>
                                    <InfoRow label={t("gender")}>{genderText ?? "—"}</InfoRow>
                                    {species.hatch_counter != null && (
                                        <InfoRow label={t("eggCycles")}>
                                            {t("eggCyclesValue", { n: species.hatch_counter, steps: (species.hatch_counter + 1) * 255 })}
                                        </InfoRow>
                                    )}
                                    {species.egg_groups && species.egg_groups.length > 0 && (
                                        <InfoRow label={t("eggGroups")}>
                                            <span className="flex flex-wrap justify-end gap-1.5">
                                                {species.egg_groups.map((g) => (
                                                    <span key={g.name} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                                                        {eggGroupName(g.name, lang)}
                                                    </span>
                                                ))}
                                            </span>
                                        </InfoRow>
                                    )}
                                </dl>
                            )}
                        </Card>

                        <Card title={t("typeMatchup")} className="md:col-span-2">
                            {matchups.length === 0 ? (
                                <p className="text-sm text-slate-400">{t("noMatchups")}</p>
                            ) : (
                                <div className="grid gap-5 sm:grid-cols-3">
                                    {(
                                        [
                                            ["weakTo", weaknesses, "text-red-600"],
                                            ["resists", resistances, "text-sky-600"],
                                            ["immuneTo", immunities, "text-violet-600"],
                                        ] as const
                                    ).map(([label, list, color]) =>
                                        list.length > 0 ? (
                                            <div key={label}>
                                                <h3 className={`mb-2 text-xs font-bold ${color}`}>{t(label)}</h3>
                                                <ul className="flex flex-wrap gap-1.5">
                                                    {list.map(([type, mult]) => (
                                                        <li key={type}>
                                                            <TypeChip
                                                                type={type}
                                                                lang={lang}
                                                                suffix={<span className="ml-0.5 rounded bg-black/20 px-1 py-px text-[10px] tabular-nums">{multLabel(mult)}</span>}
                                                            />
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ) : null,
                                    )}
                                </div>
                            )}
                        </Card>

                        {detail && detail.held_items.length > 0 && (
                            <Card title={t("heldItems")} className="md:col-span-2">
                                <div className="flex flex-wrap gap-2">
                                    {detail.held_items.map((h) => (
                                        <span key={h.item.name} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700">
                                            {itemName(h.item.name, lang)}
                                        </span>
                                    ))}
                                </div>
                            </Card>
                        )}

                        <Card title={t("evolution")} className="md:col-span-2">
                            {evoQ.isError || speciesQ.isError ? (
                                <InlineError
                                    message={t("evoLoadError")}
                                    onRetry={() => void (speciesQ.isError ? speciesQ.refetch() : evoQ.refetch())}
                                    retryLabel={retry}
                                />
                            ) : !evoQ.data ? (
                                species && !species.evolution_chain?.url ? (
                                    <p className="text-sm text-slate-400">{t("noEvolution")}</p>
                                ) : (
                                    <div className="flex gap-4">
                                        <Skeleton className="h-28 w-24" />
                                        <Skeleton className="h-28 w-24" />
                                        <Skeleton className="h-28 w-24" />
                                    </div>
                                )
                            ) : evoQ.data.chain.evolves_to.length === 0 ? (
                                <p className="text-sm text-slate-400">{t("noEvolution")}</p>
                            ) : (
                                <div className="overflow-x-auto pb-1">
                                    <div className="flex justify-center sm:justify-start">
                                        <EvoTree link={evoQ.data.chain} currentSpeciesId={speciesId} lang={lang} t={t} />
                                    </div>
                                </div>
                            )}
                        </Card>

                        {forms.length > 1 && (
                            <Card title={t("forms")} className="md:col-span-2">
                                <ul className="flex flex-wrap gap-2">
                                    {forms.map((f) => {
                                        const current = f.id === id
                                        const label = formLabel(f, lang) ?? pokemonName(f, lang)
                                        return (
                                            <li key={f.id}>
                                                <Link
                                                    to={`/pokemon/${f.id}`}
                                                    aria-current={current ? "page" : undefined}
                                                    className={`flex items-center gap-2 rounded-2xl border py-1 pl-1 pr-3 text-sm font-semibold transition ${
                                                        current
                                                            ? "border-(--accent) bg-(--accent)/10 text-slate-900"
                                                            : "border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                                                    }`}
                                                >
                                                    {f.sprite ? (
                                                        <img src={f.sprite} alt="" loading="lazy" className="h-9 w-9 object-contain [image-rendering:pixelated]" />
                                                    ) : (
                                                        <span className="h-9 w-9" aria-hidden />
                                                    )}
                                                    {label}
                                                </Link>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </Card>
                        )}
                    </div>
                )}

                {tab === "stats" && (
                    <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card title={t("baseStats")} className="md:col-span-2">
                                <dl className="space-y-3">
                                    {stats.map((s) => (
                                        <div key={s.key} className="flex items-center gap-3">
                                            <dt className="w-16 shrink-0 text-xs font-bold text-slate-500 sm:w-20">{statLabel(s.key, lang)}</dt>
                                            <dd className="w-9 shrink-0 text-right text-sm font-extrabold tabular-nums text-slate-900">{s.value}</dd>
                                            <dd className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                                                <div
                                                    className={`h-full rounded-full ${STAT_BAR_CLASS[s.key]}`}
                                                    style={{ width: `${Math.min(100, Math.round((s.value / 255) * 100))}%` }}
                                                />
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                                <div className="mt-5 flex items-baseline justify-between border-t border-slate-100 pt-4">
                                    <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">{t("total")}</span>
                                    <span className="text-3xl font-extrabold tabular-nums text-slate-900">{statTotal}</span>
                                </div>
                            </Card>
                            <Card title={t("evYield")}>
                                {detail ? (
                                    detail.stats.some((s) => s.effort > 0) ? (
                                        <dl>
                                            {detail.stats
                                                .filter((s) => s.effort > 0)
                                                .map((s) => {
                                                    const key = API_STAT_KEY[s.stat.name]
                                                    return (
                                                        <InfoRow key={s.stat.name} label={key ? statLabel(key, lang) : s.stat.name}>
                                                            <span className="text-lg font-extrabold tabular-nums">+{s.effort}</span>
                                                        </InfoRow>
                                                    )
                                                })}
                                        </dl>
                                    ) : (
                                        <p className="text-sm text-slate-400">{t("none")}</p>
                                    )
                                ) : detailQ.isError ? (
                                    <InlineError message={t("loadErrorTitle")} onRetry={() => void detailQ.refetch()} retryLabel={retry} />
                                ) : (
                                    <SkeletonRows n={2} />
                                )}
                            </Card>
                        </div>
                        <BattleStatsPanel dexId={id} />
                    </div>
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
                        retryLabel={retry}
                        allLabel={tc("all")}
                    />
                )}

                {tab === "sprites" &&
                    (detail ? (
                        <SpritesGallery sprites={detail.sprites} lang={lang} t={t} />
                    ) : detailQ.isError ? (
                        <Card>
                            <InlineError message={t("loadErrorTitle")} onRetry={() => void detailQ.refetch()} retryLabel={retry} />
                        </Card>
                    ) : (
                        <Card>
                            <SkeletonRows n={4} />
                        </Card>
                    ))}
            </div>
        </div>
    )
}
