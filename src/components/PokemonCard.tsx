import { usePokemonDetail } from "../hooks/usePokemon"
import { useInView } from "../hooks/useInView"
import {TypeIcon} from "./TypeIcon.tsx";

type PokemonListItem = { name: string; url: string }

function getPokemonId(url: string) {
    const segments = url.split("/")
    return segments[segments.length - 2]
}

function BadgeSkeleton() {
    return <span className="h-6 w-14 rounded-full bg-gray-100 animate-pulse" />
}

export function PokemonCard({ p }: { p: PokemonListItem }) {
    const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: "200px" })
    const id = getPokemonId(p.url)
    const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`

    // ✅ 화면 근처에 오기 전엔 detail 요청 자체가 안 나감
    const { data: detail, isLoading, isError } = usePokemonDetail(p.name, inView)

    const types: string[] | undefined = detail?.types
        ?.slice()
        .sort((a: any, b: any) => a.slot - b.slot)
        .map((t: any) => t.type.name)

    return (
        <div
            ref={ref}
            className="bg-white rounded-2xl shadow-md hover:shadow-xl transition p-4 flex flex-col items-center"
        >
            {/* 이미지: inView 전엔 굳이 로드 안 시켜도 되지만, 브라우저 lazy로도 충분 */}
            <img
                src={imageUrl}
                alt={p.name}
                className="w-24 h-24 object-contain mb-3"
                loading="lazy"
            />

            <span className="text-gray-400 text-sm">#{id}</span>
            <h2 className="capitalize font-semibold text-lg mt-1">{p.name}</h2>

            {/* 타입 영역 */}
            <div className="mt-3 flex gap-2 flex-wrap justify-center min-h-[28px]">
                {!inView && (
                    <>
                        <BadgeSkeleton />
                        <BadgeSkeleton />
                    </>
                )}

                {inView && isLoading && (
                    <>
                        <BadgeSkeleton />
                        <BadgeSkeleton />
                    </>
                )}

                {inView && isError && (
                    <span className="text-xs text-gray-400">type unavailable</span>
                )}

                {types && <TypeIcon types={types} />}
            </div>
        </div>
    )
}