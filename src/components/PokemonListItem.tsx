import { Link } from 'react-router-dom'
import { usePokemonDetail, usePokemonSpecies } from '../hooks/usePokemon'
import { getIdFromUrl } from '../common/utils'
import TypeBadge from './TypeBadge'

interface Props {
    name: string
    index: number
}

const PokemonListItem = ({ name, index }: Props) => {
    const { data, isLoading } = usePokemonDetail(name)
    const speciesId = data ? getIdFromUrl(data.species.url) : undefined
    const { data: species } = usePokemonSpecies(speciesId)

    const koName = species?.names.find((n) => n.language.name === 'ko')?.name

    if (isLoading) {
        return (
            <div className="pokemon-list-item" style={{ animationDelay: `${index * 30}ms` }}>
                <div className="skeleton" style={{ width: 36, height: 14 }} />
                <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 8 }} />
                <div className="skeleton" style={{ width: 80, height: 14 }} />
            </div>
        )
    }

    if (!data) return null

    return (
        <Link
            to={`/pokemon/${name}`}
            className="pokemon-list-item animate-fade-in-up"
            style={{ animationDelay: `${index * 30}ms` }}
        >
            <span style={{ width: 40, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', fontWeight: 500 }}>
                #{String(speciesId ?? data.id).padStart(3, '0')}
            </span>
            <img
                src={data.sprites.front_default}
                alt={data.name}
                className="poke-sprite"
            />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {koName ?? species?.name ?? data.name}
                </div>
                {koName && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {species?.name}
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
                {data.types.map((t) => (
                    <TypeBadge key={t.type.name} type={t.type.name} />
                ))}
            </div>
        </Link>
    )
}

export default PokemonListItem