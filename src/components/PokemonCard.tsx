import { memo, useState } from "react"
import { Link } from "react-router"
import { type Lang, useLang, useT } from "../i18n"
import { pokedexMessages } from "../i18n/messages/pokedex"
import {
    type DexPokemon,
    baseStatTotal,
    formLabel as getFormLabel,
    getSpeciesId,
    officialArtworkUrl,
    pokemonName,
    typeName,
} from "../lib/dex"

type Props = {
    pokemon: DexPokemon
    /** 정렬 기준 능력치 등 카드 하단에 강조할 값 (없으면 종족값 합계) */
    highlight?: { label: string; value: number }
}

function TypeChip({ type, lang }: { type: string; lang: Lang }) {
    return (
        <span
            className={`${type} inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold leading-none text-white`}
        >
            <img
                src={`${import.meta.env.BASE_URL}assets/types/${type}.svg`}
                alt=""
                aria-hidden
                className="h-3.5 w-3.5 shrink-0"
            />
            {typeName(type, lang)}
        </span>
    )
}

/** 보조 이름: 한국어/일본어 화면에서는 영어 이름, 영어 화면에서는 일본어 이름 */
function secondaryName(p: DexPokemon, lang: Lang): string {
    return (lang === "en" ? p.nameJa : p.nameEn) ?? ""
}

function PokemonCardImpl({ pokemon: p, highlight }: Props) {
    const lang = useLang()
    const t = useT(pokedexMessages)
    const [imgFailed, setImgFailed] = useState(false)
    const formLabel = getFormLabel(p, lang)
    const name = pokemonName(p, lang)
    const dexNo = String(getSpeciesId(p)).padStart(4, "0")
    const stat = highlight ?? { label: t("total"), value: baseStatTotal(p) }
    const sub = secondaryName(p, lang)

    return (
        <Link
            to={`/pokemon/${p.id}`}
            className="group relative flex w-full flex-col items-center rounded-2xl border border-slate-200/80 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 sm:p-4"
        >
            <span className="absolute left-3 top-2.5 text-xs font-semibold tabular-nums text-slate-400">
                #{dexNo}
            </span>
            {formLabel && (
                <span
                    className="absolute right-2.5 top-2 max-w-[55%] truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500"
                    title={formLabel}
                >
                    {formLabel}
                </span>
            )}

            <div className="mt-4 flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24">
                {imgFailed && !p.sprite ? (
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold text-slate-300" aria-hidden>
                        ?
                    </span>
                ) : imgFailed && p.sprite ? (
                    <img src={p.sprite} alt="" className="h-16 w-16 object-contain [image-rendering:pixelated]" loading="lazy" />
                ) : (
                    <img
                        src={officialArtworkUrl(p.id)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        width={96}
                        height={96}
                        onError={() => setImgFailed(true)}
                        className="h-full w-full object-contain transition-transform group-hover:scale-105"
                    />
                )}
            </div>

            <h2 className="mt-2 w-full truncate text-center text-sm font-bold text-slate-900 sm:text-base">
                {name}
            </h2>
            <p className="min-h-4 w-full truncate text-center text-[11px] text-slate-400" lang={lang === "en" ? "ja" : "en"}>
                {sub}
            </p>

            <div className="mt-2 flex min-h-[20px] flex-wrap justify-center gap-1">
                {p.types.map((type) => (
                    <TypeChip key={type} type={type} lang={lang} />
                ))}
            </div>

            <div className="mt-2.5 flex w-full items-center justify-center gap-1.5 border-t border-slate-100 pt-2 text-[11px] text-slate-400">
                <span>{stat.label}</span>
                <span className="font-bold tabular-nums text-slate-700">{stat.value}</span>
            </div>
        </Link>
    )
}

export const PokemonCard = memo(PokemonCardImpl)
