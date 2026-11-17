import { memo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
    type DexPokemon,
    baseStatTotal,
    formLabelKo,
    getSpeciesId,
    getSpeciesSlug,
    officialArtworkUrl,
    TYPE_NAME_KO,
} from "../lib/dex"

type Props = {
    pokemon: DexPokemon
    /** 정렬 기준 능력치 등 카드 하단에 강조할 값 (없으면 종족값 합계) */
    highlight?: { label: string; value: number }
}

function TypeChip({ type }: { type: string }) {
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
            {TYPE_NAME_KO[type] ?? type}
        </span>
    )
}

function PokemonCardImpl({ pokemon: p, highlight }: Props) {
    const navigate = useNavigate()
    const [imgFailed, setImgFailed] = useState(false)
    const formLabel = formLabelKo(p)
    const dexNo = getSpeciesId(p)
    const stat = highlight ?? { label: "합계", value: baseStatTotal(p) }

    return (
        <button
            type="button"
            onClick={() => navigate(`/pokemon/${p.id}`)}
            className="group relative flex w-full flex-col items-center rounded-2xl border border-slate-200/80 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 sm:p-4"
        >
            <span className="absolute left-3 top-2.5 text-xs font-semibold tabular-nums text-slate-400">
                #{String(dexNo).padStart(4, "0")}
            </span>
            {formLabel && (
                <span className="absolute right-2.5 top-2 max-w-[55%] truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    {formLabel}
                </span>
            )}

            <div className="mt-4 flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24">
                {imgFailed && !p.sprite ? (
                    <span className="text-2xl text-slate-300" aria-hidden>?</span>
                ) : imgFailed && p.sprite ? (
                    <img src={p.sprite} alt={p.nameKo} className="h-16 w-16 object-contain [image-rendering:pixelated]" loading="lazy" />
                ) : (
                    <img
                        src={officialArtworkUrl(p.id)}
                        alt={p.nameKo}
                        loading="lazy"
                        decoding="async"
                        width={96}
                        height={96}
                        onError={() => setImgFailed(true)}
                        className="h-full w-full object-contain transition-transform group-hover:scale-105"
                    />
                )}
            </div>

            <h2 className="mt-2 w-full truncate text-center text-sm font-bold text-slate-900 sm:text-base">{p.nameKo}</h2>
            <p className="w-full truncate text-center text-[11px] capitalize text-slate-400">{(formLabel ? p.name : getSpeciesSlug(p)).replace(/-/g, " ")}</p>

            <div className="mt-2 flex min-h-[20px] flex-wrap justify-center gap-1">
                {p.types.map((t) => (
                    <TypeChip key={t} type={t} />
                ))}
            </div>

            <div className="mt-2.5 flex w-full items-center justify-center gap-1.5 border-t border-slate-100 pt-2 text-[11px] text-slate-400">
                <span>{stat.label}</span>
                <span className="font-bold tabular-nums text-slate-700">{stat.value}</span>
            </div>
        </button>
    )
}

export const PokemonCard = memo(PokemonCardImpl)
