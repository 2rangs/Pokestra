import { useAllPokemonList } from "../../hooks/usePokemon.ts"
import { PokemonCard } from "../../components/PokemonCard.tsx" // 경로 맞게

export default function PokedexPage() {
    const { data, isLoading, isError } = useAllPokemonList()

    if (isLoading) return <div className="p-8">Loading...</div>
    if (isError) return <div className="p-8">Error...</div>

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Pokedex</h1>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6">
                {data?.results.map((p) => (
                    <PokemonCard key={p.name} p={p} />
                ))}
            </div>
        </div>
    )
}