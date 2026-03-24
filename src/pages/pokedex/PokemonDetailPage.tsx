import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useEvolutionChain, usePokemonDetail, usePokemonSpecies } from "../../hooks/usePokemon"

// ─── Google Fonts injection ───────────────────────────────────────────────────
const FONT_LINK = "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap"
function injectFont() {
    if (typeof document !== "undefined" && !document.getElementById("pokemon-fonts")) {
        const link = document.createElement("link")
        link.id = "pokemon-fonts"; link.rel = "stylesheet"; link.href = FONT_LINK
        document.head.appendChild(link)
    }
}

// ─── Type palette ─────────────────────────────────────────────────────────────
const TYPE_PALETTE: Record<string, { primary: string; light: string; dark: string }> = {
    fire:     { primary: "#F97316", light: "#FEF3E2", dark: "#C2410C" },
    water:    { primary: "#3B82F6", light: "#EFF6FF", dark: "#1D4ED8" },
    grass:    { primary: "#22C55E", light: "#F0FDF4", dark: "#15803D" },
    electric: { primary: "#EAB308", light: "#FEFCE8", dark: "#A16207" },
    ice:      { primary: "#06B6D4", light: "#ECFEFF", dark: "#0E7490" },
    fighting: { primary: "#EF4444", light: "#FEF2F2", dark: "#B91C1C" },
    poison:   { primary: "#A855F7", light: "#FAF5FF", dark: "#7E22CE" },
    ground:   { primary: "#F59E0B", light: "#FFFBEB", dark: "#B45309" },
    flying:   { primary: "#6366F1", light: "#EEF2FF", dark: "#4338CA" },
    psychic:  { primary: "#EC4899", light: "#FDF2F8", dark: "#BE185D" },
    bug:      { primary: "#84CC16", light: "#F7FEE7", dark: "#4D7C0F" },
    rock:     { primary: "#92400E", light: "#FEF3C7", dark: "#78350F" },
    ghost:    { primary: "#7C3AED", light: "#F5F3FF", dark: "#5B21B6" },
    dragon:   { primary: "#4F46E5", light: "#EEF2FF", dark: "#3730A3" },
    dark:     { primary: "#374151", light: "#F9FAFB", dark: "#111827" },
    steel:    { primary: "#6B7280", light: "#F9FAFB", dark: "#374151" },
    fairy:    { primary: "#F472B6", light: "#FDF2F8", dark: "#BE185D" },
    normal:   { primary: "#9CA3AF", light: "#F9FAFB", dark: "#4B5563" },
}
function getTheme(types: string[]) { return TYPE_PALETTE[types[0]] ?? TYPE_PALETTE["normal"] }

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
function computeDefense(types: string[]) {
    const out: Record<string, number> = {}
    Object.keys(TYPE_CHART).forEach(atk => {
        let m = 1
        types.forEach(def => { m *= TYPE_CHART[atk]?.[def] ?? 1 })
        if (m !== 1) out[atk] = m
    })
    return out
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function titleCase(s: string) { return s.replace(/-/g, " ") }
function getIdFromUrl(url?: string) {
    if (!url) return undefined
    const n = Number(url.split("/").filter(Boolean).at(-1))
    return Number.isFinite(n) ? n : undefined
}
function getPokemonSprite(id: number) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
}

const STAT_META: Record<string, { label: string; color: string }> = {
    hp:               { label: "HP",     color: "#F87171" },
    attack:           { label: "ATK",    color: "#FB923C" },
    defense:          { label: "DEF",    color: "#FBBF24" },
    "special-attack": { label: "Sp.ATK", color: "#818CF8" },
    "special-defense":{ label: "Sp.DEF", color: "#34D399" },
    speed:            { label: "SPD",    color: "#F472B6" },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatRow({ statName, value }: { statName: string; value: number }) {
    const meta = STAT_META[statName] ?? { label: statName.toUpperCase(), color: "#9CA3AF" }
    const pct = Math.min(100, Math.round((value / 255) * 100))
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ width: 56, fontSize: 11, fontWeight: 800, color: "#CBD5E1", fontFamily: "Syne, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", flexShrink: 0 }}>{meta.label}</span>
            <span style={{ width: 36, textAlign: "right", fontSize: 16, fontWeight: 700, color: "#0F172A", fontFamily: "Syne, sans-serif", flexShrink: 0 }}>{value}</span>
            <div style={{ flex: 1, height: 7, borderRadius: 999, background: "#F1F5F9", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: meta.color }} />
            </div>
        </div>
    )
}

function TypeBadge({ type }: { type: string }) {
    const p = TYPE_PALETTE[type] ?? TYPE_PALETTE["normal"]
    return (
        <span style={{ padding: "5px 14px", borderRadius: 999, fontSize: 11, fontWeight: 700, fontFamily: "Syne, sans-serif", letterSpacing: "0.1em", textTransform: "uppercase", background: p.light, color: p.dark, border: `1.5px solid ${p.primary}35` }}>
            {type}
        </span>
    )
}

function MatchupBadge({ type, mult }: { type: string; mult: number }) {
    const multColor = mult >= 4 ? "#DC2626" : mult === 2 ? "#EA580C" : mult === 0.5 ? "#2563EB" : mult === 0 ? "#7C3AED" : "#6B7280"
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 12, background: "#FAFAFA", border: "1px solid #E5E7EB" }}>
            <TypeBadge type={type} />
            <span style={{ fontSize: 13, fontWeight: 800, color: multColor, fontFamily: "Syne, sans-serif" }}>{mult}×</span>
        </div>
    )
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderBottom: "1px solid #F8FAFC" }}>
            <span style={{ fontSize: 14, color: "#94A3B8", fontFamily: "DM Sans, sans-serif", fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: 14, color: "#0F172A", fontFamily: "DM Sans, sans-serif", fontWeight: 600, textTransform: "capitalize" }}>{value}</span>
        </div>
    )
}

function SecLabel({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#CBD5E1", fontFamily: "Syne, sans-serif", marginBottom: 18 }}>
            {children}
        </div>
    )
}

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <div style={{ background: "#fff", borderRadius: 22, padding: "28px", border: "1px solid #F1F5F9", boxShadow: "0 1px 2px rgba(0,0,0,0.03), 0 8px 32px rgba(0,0,0,0.05)", ...style }}>
            {children}
        </div>
    )
}

// ─── Evolution chain ──────────────────────────────────────────────────────────
interface EvoNode { id: number; name: string; level?: number; trigger?: string; item?: string }
function flattenChain(chain: any): EvoNode[][] {
    const paths: EvoNode[][] = []
    function walk(node: any, path: EvoNode[]) {
        const id = getIdFromUrl(node.species.url) ?? 0
        const det = node.evolution_details?.[0]
        const next = [...path, { id, name: node.species.name, level: det?.min_level, trigger: det?.trigger?.name, item: det?.item?.name ?? det?.held_item?.name }]
        if (!node.evolves_to?.length) { paths.push(next); return }
        node.evolves_to.forEach((n: any) => walk(n, next))
    }
    walk(chain, [])
    return paths
}

function EvoChain({ chain, theme }: { chain: any; theme: { primary: string; light: string; dark: string } }) {
    const paths = useMemo(() => flattenChain(chain), [chain])
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {paths.map((path, pi) => (
                <div key={pi} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                    {path.map((node, idx) => (
                        <div key={node.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 80, height: 80, borderRadius: 18, background: "#FAFAFA", border: "1px solid #F1F5F9", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <img src={getPokemonSprite(node.id)} alt={node.name} style={{ width: 72, height: 72, objectFit: "contain" }} loading="lazy" onError={e => { (e.target as HTMLImageElement).style.opacity = "0" }} />
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize", color: "#374151", fontFamily: "DM Sans, sans-serif" }}>{titleCase(node.name)}</span>
                                {node.level && (
                                    <span style={{ fontSize: 11, fontWeight: 700, color: theme.primary, background: theme.light, padding: "2px 10px", borderRadius: 999, fontFamily: "Syne, sans-serif" }}>Lv.{node.level}</span>
                                )}
                                {node.item && !node.level && (
                                    <span style={{ fontSize: 11, color: "#9CA3AF", textTransform: "capitalize", fontFamily: "DM Sans, sans-serif" }}>{titleCase(node.item)}</span>
                                )}
                            </div>
                            {idx < path.length - 1 && <span style={{ color: "#CBD5E1", fontSize: 20 }}>→</span>}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    )
}

// ─── Sprites ──────────────────────────────────────────────────────────────────
function SpritesGallery({ sprites }: { sprites: any }) {
    const main = [
        { label: "Default", src: sprites?.front_default, pixelated: true },
        { label: "Back", src: sprites?.back_default, pixelated: true },
        { label: "Shiny", src: sprites?.front_shiny, pixelated: true },
        { label: "Back Shiny", src: sprites?.back_shiny, pixelated: true },
        { label: "Female", src: sprites?.front_female, pixelated: true },
        { label: "Shiny ♀", src: sprites?.front_shiny_female, pixelated: true },
    ].filter(x => x.src)

    const extra = [
        { label: "Dream World", src: sprites?.other?.dream_world?.front_default, pixelated: false },
        { label: "Dream World ♀", src: sprites?.other?.dream_world?.front_female, pixelated: false },
        { label: "HOME", src: sprites?.other?.home?.front_default, pixelated: false },
        { label: "HOME Shiny", src: sprites?.other?.home?.front_shiny, pixelated: false },
        { label: "HOME ♀", src: sprites?.other?.home?.front_female, pixelated: false },
    ].filter(x => x.src)

    const genItems: { label: string; src: string }[] = []
    if (sprites?.versions) {
        Object.entries(sprites.versions).forEach(([, games]: [string, any]) => {
            Object.entries(games).forEach(([game, data]: [string, any]) => {
                if (data?.front_default) genItems.push({ label: game, src: data.front_default })
            })
        })
    }

    const SpriteItem = ({ label, src, size = 80, pixelated = false }: { label: string; src: string; size?: number; pixelated?: boolean }) => (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ width: size, height: size, background: "#FAFAFA", borderRadius: 14, border: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={src} alt={label} style={{ width: size - 10, height: size - 10, objectFit: "contain", imageRendering: pixelated ? "pixelated" : "auto" }} loading="lazy" />
            </div>
            <span style={{ fontSize: 11, color: "#94A3B8", fontFamily: "DM Sans, sans-serif", textAlign: "center", maxWidth: size }}>{label}</span>
        </div>
    )

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {main.length > 0 && (
                <div>
                    <SecLabel>Game Sprites</SecLabel>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                        {main.map(x => <SpriteItem key={x.label} {...x} size={90} />)}
                    </div>
                </div>
            )}
            {extra.length > 0 && (
                <div>
                    <SecLabel>HD Artwork</SecLabel>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
                        {extra.map(x => <SpriteItem key={x.label} {...x} size={110} />)}
                    </div>
                </div>
            )}
            {genItems.length > 0 && (
                <div>
                    <SecLabel>All Generations</SecLabel>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                        {genItems.map(x => <SpriteItem key={x.label} src={x.src} label={titleCase(x.label)} size={68} pixelated />)}
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
type Tab = "overview" | "stats" | "moves" | "sprites"

export default function PokemonDetailPage() {
    injectFont()

    const { id } = useParams()
    const navigate = useNavigate()
    const [tab, setTab] = useState<Tab>("overview")

    const pokemonKey = id ?? ""
    const { data: detail, isLoading, isError, error } = usePokemonDetail(pokemonKey, !!pokemonKey)

    const types: string[] = useMemo(() =>
            detail?.types?.slice().sort((a: any, b: any) => a.slot - b.slot).map((t: any) => t.type.name) ?? []
        , [detail])

    const theme = useMemo(() => getTheme(types), [types])

    const artwork =
        detail?.sprites?.other?.["official-artwork"]?.front_default ??
        detail?.sprites?.other?.["official-artwork"]?.front_shiny ??
        detail?.sprites?.front_default ?? ""

    const speciesId = useMemo(() => getIdFromUrl(detail?.species?.url), [detail?.species?.url])
    const { data: species, isLoading: speciesLoading } = usePokemonSpecies(speciesId)
    const { data: evo, isLoading: evoLoading } = useEvolutionChain(species?.evolution_chain?.url)

    const flavor = useMemo(() => {
        const e = species?.flavor_text_entries ?? []
        const en = e.find((x: any) => x.language?.name === "en")?.flavor_text ?? ""
        return en.replace(/\f/g, " ").replace(/\s+/g, " ").trim()
    }, [species?.flavor_text_entries])

    const genus = species?.genera?.find((g: any) => g.language?.name === "en")?.genus ?? ""

    const defensiveChart = useMemo(() => computeDefense(types), [types])
    const weaknesses  = Object.entries(defensiveChart).filter(([, v]) => v > 1).sort((a, b) => b[1] - a[1])
    const resistances = Object.entries(defensiveChart).filter(([, v]) => v < 1).sort((a, b) => a[1] - b[1])

    const statTotal = detail?.stats?.reduce((s: number, x: any) => s + x.base_stat, 0) ?? 0

    const sortedMoves = useMemo(() => {
        if (!detail?.moves) return []
        return [...detail.moves].sort((a: any, b: any) =>
            (a.version_group_details?.[0]?.level_learned_at ?? 0) - (b.version_group_details?.[0]?.level_learned_at ?? 0)
        )
    }, [detail?.moves])

    const heldItems = detail?.held_items?.map((h: any) => h.item.name) ?? []
    const genderRate = species?.gender_rate
    const genderText = genderRate === -1 ? "Genderless" : genderRate === 0 ? "Male only" : genderRate === 8 ? "Female only"
        : `${Math.round((1 - genderRate / 8) * 100)}% M / ${Math.round((genderRate / 8) * 100)}% F`
    const generation = species?.generation?.name?.replace("generation-", "Gen ")?.toUpperCase()

    // Guards
    if (!pokemonKey) return (
        <div style={{ minHeight: "100vh", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "DM Sans, sans-serif", color: "#94A3B8" }}>
            Invalid route.
        </div>
    )
    if (isLoading) return (
        <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: 40 }}>
            {[1, 0.6, 0.3].map((op, i) => (
                <div key={i} style={{ height: i === 0 ? 340 : 140, background: "#E2E8F0", borderRadius: 22, marginBottom: 20, opacity: op }} />
            ))}
        </div>
    )
    if (isError) return (
        <div style={{ minHeight: "100vh", background: "#F8FAFC", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, fontFamily: "DM Sans, sans-serif" }}>
            <button onClick={() => navigate(-1)} style={{ padding: "10px 20px", borderRadius: 12, background: "#0F172A", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "Syne, sans-serif" }}>← Back</button>
            <span style={{ color: "#94A3B8" }}>Failed: {String((error as any)?.message ?? "unknown")}</span>
        </div>
    )

    const tabs: { key: Tab; label: string }[] = [
        { key: "overview", label: "Overview" },
        { key: "stats", label: "Stats" },
        { key: "moves", label: `Moves (${detail.moves?.length ?? 0})` },
        { key: "sprites", label: "Sprites" },
    ]

    return (
        <div style={{ minHeight: "100vh", background: "#F8FAFC", fontFamily: "DM Sans, sans-serif" }}>

            {/* ── HERO PANEL ── */}
            <div style={{ background: "#fff", borderBottom: "1px solid #F1F5F9", position: "relative", overflow: "hidden" }}>
                {/* Accent blob */}
                <div style={{ position: "absolute", top: -120, right: -100, width: 500, height: 500, borderRadius: "50%", background: `${theme.primary}10`, pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: -60, left: -60, width: 240, height: 240, borderRadius: "50%", background: `${theme.primary}06`, pointerEvents: "none" }} />

                <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 36px 0" }}>

                    {/* Nav */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 36 }}>
                        <button
                            onClick={() => navigate(-1)}
                            style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 20px", borderRadius: 12, background: "#F8FAFC", border: "1px solid #E2E8F0", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#374151", fontFamily: "DM Sans, sans-serif" }}
                        >
                            ← Back
                        </button>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {species?.is_legendary && <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", color: theme.primary, background: theme.light, padding: "5px 12px", borderRadius: 999, fontFamily: "Syne, sans-serif", border: `1px solid ${theme.primary}25` }}>LEGENDARY</span>}
                            {species?.is_mythical  && <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", color: "#BE185D", background: "#FDF2F8", padding: "5px 12px", borderRadius: 999, fontFamily: "Syne, sans-serif" }}>MYTHICAL</span>}
                            {species?.is_baby      && <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", color: "#7C3AED", background: "#F5F3FF", padding: "5px 12px", borderRadius: 999, fontFamily: "Syne, sans-serif" }}>BABY</span>}
                            <span style={{ fontSize: 14, fontWeight: 800, color: "#CBD5E1", fontFamily: "Syne, sans-serif", letterSpacing: "0.05em" }}>#{String(detail.id).padStart(4, "0")}</span>
                        </div>
                    </div>

                    {/* Hero body */}
                    <div style={{ display: "flex", gap: 56, alignItems: "flex-start", flexWrap: "wrap" }}>

                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 280, paddingBottom: 44 }}>
                            {generation && (
                                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: theme.primary, fontFamily: "Syne, sans-serif", marginBottom: 12 }}>{generation}</div>
                            )}
                            <h1 style={{ fontSize: "clamp(2.8rem, 5vw, 4.2rem)", fontWeight: 800, fontFamily: "Syne, sans-serif", color: "#0F172A", lineHeight: 1.02, textTransform: "capitalize", margin: "0 0 6px" }}>
                                {titleCase(detail.name)}
                            </h1>
                            {genus && <div style={{ fontSize: 15, color: "#94A3B8", fontFamily: "DM Sans, sans-serif", fontStyle: "italic", marginBottom: 16 }}>{genus}</div>}

                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                                {types.map(t => <TypeBadge key={t} type={t} />)}
                            </div>

                            {flavor && (
                                <p style={{ fontSize: 15, lineHeight: 1.75, color: "#64748B", fontFamily: "DM Sans, sans-serif", maxWidth: 420, fontStyle: "italic", margin: "0 0 28px", fontWeight: 300 }}>
                                    "{flavor}"
                                </p>
                            )}

                            {/* Quick metrics */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, maxWidth: 420, marginBottom: 28 }}>
                                {[
                                    { label: "Height", value: `${(detail.height / 10).toFixed(1)} m` },
                                    { label: "Weight", value: `${(detail.weight / 10).toFixed(1)} kg` },
                                    { label: "Base EXP", value: detail.base_experience ?? "—" },
                                ].map(({ label, value }) => (
                                    <div key={label} style={{ background: "#F8FAFC", borderRadius: 14, padding: "16px 18px", border: "1px solid #F1F5F9" }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#CBD5E1", fontFamily: "Syne, sans-serif", marginBottom: 6 }}>{label}</div>
                                        <div style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", fontFamily: "Syne, sans-serif" }}>{value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Abilities */}
                            <div>
                                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#CBD5E1", fontFamily: "Syne, sans-serif", marginBottom: 10 }}>Abilities</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                    {detail.abilities?.map((a: any) => (
                                        <div key={a.ability.name} style={{
                                            padding: "8px 18px", borderRadius: 12, fontSize: 13, fontWeight: 600,
                                            fontFamily: "DM Sans, sans-serif", textTransform: "capitalize",
                                            ...(a.is_hidden
                                                ? { background: theme.light, color: theme.dark, border: `1.5px solid ${theme.primary}30` }
                                                : { background: "#F8FAFC", color: "#374151", border: "1px solid #E2E8F0" })
                                        }}>
                                            {titleCase(a.ability.name)}{a.is_hidden ? " ✦" : ""}
                                        </div>
                                    ))}
                                </div>
                                {detail.abilities?.some((a: any) => a.is_hidden) && (
                                    <div style={{ fontSize: 11, color: "#C4B5FD", marginTop: 6, fontFamily: "DM Sans, sans-serif" }}>✦ Hidden ability</div>
                                )}
                            </div>
                        </div>

                        {/* Artwork */}
                        <div style={{ width: 300, display: "flex", alignItems: "flex-end", justifyContent: "center", flexShrink: 0 }}>
                            {artwork ? (
                                <img src={artwork} alt={detail.name} style={{ width: 280, height: 280, objectFit: "contain", filter: `drop-shadow(0 24px 48px ${theme.primary}50)` }} />
                            ) : (
                                <div style={{ width: 280, height: 280, background: "#F1F5F9", borderRadius: 24 }} />
                            )}
                        </div>
                    </div>

                    {/* Tab bar */}
                    <div style={{ display: "flex", marginTop: 32, borderTop: "1px solid #F1F5F9" }}>
                        {tabs.map(({ key, label }) => (
                            <button key={key} onClick={() => setTab(key)} style={{
                                padding: "15px 26px",
                                fontSize: 13, fontWeight: 700,
                                fontFamily: "Syne, sans-serif",
                                background: "transparent", border: "none", cursor: "pointer",
                                color: tab === key ? theme.primary : "#94A3B8",
                                borderBottom: tab === key ? `2.5px solid ${theme.primary}` : "2.5px solid transparent",
                                marginBottom: -1,
                                letterSpacing: "0.04em",
                                transition: "color .15s",
                            }}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── CONTENT ── */}
            <div style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 36px 60px" }}>

                {/* OVERVIEW */}
                {tab === "overview" && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>

                        <Card>
                            <SecLabel>Species</SecLabel>
                            {[
                                { label: "Generation", value: generation },
                                { label: "Growth Rate", value: species?.growth_rate?.name ? titleCase(species.growth_rate.name) : undefined },
                                { label: "Capture Rate", value: (species?.capture_rate != null) ? `${species.capture_rate} (${Math.round((species.capture_rate / 255) * 100)}%)` : undefined },
                                { label: "Base Happiness", value: species?.base_happiness },
                                { label: "Color", value: species?.color?.name },
                                { label: "Shape", value: species?.shape?.name },
                                { label: "Habitat", value: species?.habitat?.name },
                            ].filter(x => x.value !== undefined && x.value !== null).map(({ label, value }) => (
                                <InfoRow key={label} label={label} value={String(value)} />
                            ))}
                        </Card>

                        <Card>
                            <SecLabel>Breeding</SecLabel>
                            <InfoRow label="Gender" value={genderText} />
                            {species?.hatch_counter != null && (
                                <InfoRow label="Hatch Steps" value={`${(species.hatch_counter + 1) * 255} steps`} />
                            )}
                            {species?.egg_groups?.length > 0 && (
                                <div style={{ paddingTop: 14 }}>
                                    <div style={{ fontSize: 14, color: "#94A3B8", marginBottom: 10, fontFamily: "DM Sans, sans-serif" }}>Egg Groups</div>
                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        {species.egg_groups.map((g: any) => (
                                            <span key={g.name} style={{ fontSize: 13, fontWeight: 600, padding: "5px 14px", borderRadius: 999, background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#374151", textTransform: "capitalize", fontFamily: "DM Sans, sans-serif" }}>
                                                {titleCase(g.name)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>

                        {(weaknesses.length > 0 || resistances.length > 0) && (
                            <Card style={{ gridColumn: "1 / -1" }}>
                                <SecLabel>Type Matchup — Defense</SecLabel>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
                                    {weaknesses.length > 0 && (
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: "#EF4444", fontFamily: "Syne, sans-serif", marginBottom: 12, letterSpacing: "0.06em" }}>Weak against</div>
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                                {weaknesses.map(([type, mult]) => <MatchupBadge key={type} type={type} mult={mult} />)}
                                            </div>
                                        </div>
                                    )}
                                    {resistances.length > 0 && (
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: "#3B82F6", fontFamily: "Syne, sans-serif", marginBottom: 12, letterSpacing: "0.06em" }}>Resists / Immune</div>
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                                {resistances.map(([type, mult]) => <MatchupBadge key={type} type={type} mult={mult} />)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        )}

                        {heldItems.length > 0 && (
                            <Card>
                                <SecLabel>Held Items (Wild)</SecLabel>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                    {heldItems.map((item: string) => (
                                        <span key={item} style={{ fontSize: 13, fontWeight: 600, padding: "6px 16px", borderRadius: 999, background: theme.light, color: theme.dark, border: `1px solid ${theme.primary}20`, textTransform: "capitalize", fontFamily: "DM Sans, sans-serif" }}>
                                            {titleCase(item)}
                                        </span>
                                    ))}
                                </div>
                            </Card>
                        )}

                        <Card style={{ gridColumn: "1 / -1" }}>
                            <SecLabel>Evolution Chain</SecLabel>
                            {evoLoading && <span style={{ fontSize: 14, color: "#94A3B8" }}>Loading…</span>}
                            {evo?.chain ? (
                                <EvoChain chain={evo.chain} theme={theme} />
                            ) : !evoLoading && (
                                <span style={{ fontSize: 14, color: "#94A3B8" }}>Does not evolve.</span>
                            )}
                        </Card>
                    </div>
                )}

                {/* STATS */}
                {tab === "stats" && (
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, alignItems: "start" }}>
                        <Card>
                            <SecLabel>Base Stats</SecLabel>
                            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                                {detail.stats?.map((s: any) => (
                                    <StatRow key={s.stat.name} statName={s.stat.name} value={s.base_stat} />
                                ))}
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 28, paddingTop: 20, borderTop: "2px solid #F1F5F9" }}>
                                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#CBD5E1", fontFamily: "Syne, sans-serif" }}>Total</span>
                                <span style={{ fontSize: 36, fontWeight: 800, fontFamily: "Syne, sans-serif", color: theme.primary }}>{statTotal}</span>
                            </div>
                        </Card>
                        <Card>
                            <SecLabel>EV Yield</SecLabel>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                {detail.stats?.filter((s: any) => s.effort > 0).map((s: any) => (
                                    <div key={s.stat.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid #F8FAFC" }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "Syne, sans-serif" }}>{STAT_META[s.stat.name]?.label ?? s.stat.name}</span>
                                        <span style={{ fontSize: 18, fontWeight: 800, color: theme.primary, fontFamily: "Syne, sans-serif" }}>+{s.effort}</span>
                                    </div>
                                ))}
                                {!detail.stats?.some((s: any) => s.effort > 0) && (
                                    <span style={{ fontSize: 14, color: "#94A3B8" }}>None</span>
                                )}
                            </div>
                        </Card>
                    </div>
                )}

                {/* MOVES */}
                {tab === "moves" && (
                    <Card>
                        <SecLabel>All Moves</SecLabel>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 8, maxHeight: "65vh", overflowY: "auto", paddingRight: 6 }}>
                            {sortedMoves.map((m: any) => {
                                const det0 = m.version_group_details?.[0]
                                const method = det0?.move_learn_method?.name
                                const level  = det0?.level_learned_at
                                return (
                                    <div key={m.move.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderRadius: 12, background: "#F8FAFC", border: "1px solid #F1F5F9", transition: "background .1s" }}
                                         onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#F1F5F9")}
                                         onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "#F8FAFC")}>
                                        <span style={{ fontSize: 14, fontWeight: 600, textTransform: "capitalize", color: "#1E293B", fontFamily: "DM Sans, sans-serif" }}>{titleCase(m.move.name)}</span>
                                        {level ? (
                                            <span style={{ fontSize: 11, fontWeight: 700, color: theme.primary, background: theme.light, padding: "2px 8px", borderRadius: 999, fontFamily: "Syne, sans-serif", flexShrink: 0 }}>Lv.{level}</span>
                                        ) : method ? (
                                            <span style={{ fontSize: 10, color: "#C4B5FD", fontFamily: "DM Sans, sans-serif", textTransform: "capitalize", flexShrink: 0 }}>{titleCase(method)}</span>
                                        ) : null}
                                    </div>
                                )
                            })}
                        </div>
                    </Card>
                )}

                {/* SPRITES */}
                {tab === "sprites" && (
                    <Card>
                        <SpritesGallery sprites={detail.sprites} />
                    </Card>
                )}
            </div>
        </div>
    )
}