import { Link } from 'react-router-dom'
import { usePokemonDetail, usePokemonSpecies } from '../hooks/usePokemon'
import { getIdFromUrl, getArtwork } from '../common/utils'
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
            <div className="poke-row">
                <div className="skeleton" style={{ width: 32, height: 12 }} />
                <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 8 }} />
                <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ width: 72, height: 13, marginBottom: 4 }} />
                    <div className="skeleton" style={{ width: 48, height: 10 }} />
                </div>
            </div>
        )
    }

    if (!data) return null

    return (
        <Link
            to={`/pokemon/${data.id}`}
            className="poke-row fade-up"
            style={{ animationDelay: `${index * 25}ms` }}
        >
            <span className="num">#{String(speciesId ?? data.id).padStart(3, '0')}</span>
            <img src={getArtwork(data)} alt={data.name} className="sprite" />
            <div className="info">
                <div className="name">{koName ?? species?.name ?? data.name}</div>
                {koName && <div className="sub">{species?.name}</div>}
            </div>
            <div className="types">
                {data.types.map((t) => (
                    <TypeBadge key={t.type.name} type={t.type.name} />
                ))}
            </div>
        </Link>
    )
}

export default PokemonListItem