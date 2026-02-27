import { useMemo } from 'react'
import { usePokedexStore } from '../stores/pokedexStore'
import {
    useAllPokemonList,
    usePokemonByType,
    usePokemonByEggGroup,
    usePokemonByMove,
} from '../hooks/usePokemon'
import { POKEMON_TYPES, GENERATIONS, EGG_GROUPS } from '../constants/pokemon'
import { getIdFromUrl } from '../common/utils'
import PokemonListItem from '../components/PokemonListItem'
import Pagination from '../components/Pagination'
import TypeBadge from '../components/TypeBadge'

const PER_PAGE = 30

const Pokedex = () => {
    const {
        nameSearch, moveSearch,
        selectedType, selectedGenerations, selectedEggGroup,
        page,
        setNameSearch, setMoveSearch,
        setSelectedType, toggleGeneration, setSelectedEggGroup,
        setPage,
    } = usePokedexStore()

    const { data: allPokemon, isLoading } = useAllPokemonList()
    const { data: typeFilterSet } = usePokemonByType(selectedType)
    const { data: eggGroupFilterSet } = usePokemonByEggGroup(selectedEggGroup)
    const { data: moveData } = usePokemonByMove(moveSearch)

    const moveFilterSet = useMemo(() => {
        if (!moveData) return null
        return new Set(moveData.learned_by_pokemon.map((p) => p.name))
    }, [moveData])

    const filtered = useMemo(() => {
        if (!allPokemon) return []

        return allPokemon.results.filter(({ name, url }) => {
            const id = getIdFromUrl(url)

            if (id > 1025) return false

            if (selectedGenerations.length > 0) {
                const inGen = GENERATIONS
                    .filter((g) => selectedGenerations.includes(g.id))
                    .some((g) => id >= g.min && id <= g.max)
                if (!inGen) return false
            }

            if (nameSearch) {
                const q = nameSearch.toLowerCase()
                if (!name.includes(q) && !String(id).includes(q)) return false
            }

            if (typeFilterSet && !typeFilterSet.has(name)) return false
            if (eggGroupFilterSet && !eggGroupFilterSet.has(name)) return false
            if (moveSearch.length > 2 && moveFilterSet && !moveFilterSet.has(name)) return false

            return true
        })
    }, [allPokemon, selectedGenerations, nameSearch, typeFilterSet, eggGroupFilterSet, moveFilterSet, moveSearch])

    const totalPages = Math.ceil(filtered.length / PER_PAGE)
    const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

    return (
        <div className="app-container">
            {/* Header */}
            <header style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>
                    Pokédex
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                    포켓몬 도감
                </p>
            </header>

            <div style={{ display: 'flex', gap: 28 }}>
                {/* 좌측 필터 사이드바 */}
                <aside style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>

                    {/* 이름 / 도감번호 */}
                    <div className="sidebar-section">
                        <h3>이름 / 도감번호</h3>
                        <input
                            type="text"
                            value={nameSearch}
                            onChange={(e) => setNameSearch(e.target.value)}
                            placeholder="pikachu, 25"
                            className="input-field"
                        />
                    </div>

                    {/* 배우는 스킬 */}
                    <div className="sidebar-section">
                        <h3>배우는 스킬</h3>
                        <input
                            type="text"
                            value={moveSearch}
                            onChange={(e) => setMoveSearch(e.target.value)}
                            placeholder="thunderbolt"
                            className="input-field"
                        />
                    </div>

                    {/* 타입 */}
                    <div className="sidebar-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <h3 style={{ margin: 0 }}>타입</h3>
                            {selectedType && (
                                <button className="reset-btn" onClick={() => setSelectedType(null)}>
                                    초기화
                                </button>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {POKEMON_TYPES.map((type) => (
                                <TypeBadge
                                    key={type}
                                    type={type}
                                    selectable
                                    selected={selectedType === type}
                                    dimmed={!!selectedType && selectedType !== type}
                                    onClick={() => setSelectedType(selectedType === type ? null : type)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* 세대 */}
                    <div className="sidebar-section">
                        <h3>세대</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {GENERATIONS.map((gen) => (
                                <label key={gen.id} className="filter-check">
                                    <input
                                        type="checkbox"
                                        checked={selectedGenerations.includes(gen.id)}
                                        onChange={() => toggleGeneration(gen.id)}
                                    />
                                    <span>{gen.label}</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 'auto' }}>
                                        {gen.min}–{gen.max}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* 알 그룹 */}
                    <div className="sidebar-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <h3 style={{ margin: 0 }}>알 그룹</h3>
                            {selectedEggGroup && (
                                <button className="reset-btn" onClick={() => setSelectedEggGroup(null)}>
                                    초기화
                                </button>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {EGG_GROUPS.map((group) => (
                                <label key={group} className="filter-check">
                                    <input
                                        type="radio"
                                        name="egg-group"
                                        checked={selectedEggGroup === group}
                                        onChange={() =>
                                            setSelectedEggGroup(selectedEggGroup === group ? null : group)
                                        }
                                    />
                                    {group}
                                </label>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* 우측 결과 리스트 */}
                <main style={{ flex: 1, minWidth: 0 }}>
                    {isLoading ? (
                        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>불러오는 중...</p>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-heading)' }}>
                                    {filtered.length}마리
                                </span>
                                {totalPages > 1 && (
                                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                        {page} / {totalPages}
                                    </span>
                                )}
                            </div>
                            <div className="card">
                                {paged.map(({ name }, i) => (
                                    <PokemonListItem key={name} name={name} index={i} />
                                ))}
                                {paged.length === 0 && (
                                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                                        검색 결과가 없습니다
                                    </div>
                                )}
                            </div>
                            {totalPages > 1 && (
                                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    )
}

export default Pokedex