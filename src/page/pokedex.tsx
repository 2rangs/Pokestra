import { useMemo, useState } from 'react'
import { usePokedexStore } from '../stores/pokedexStore'
import {
    useAllPokemonList,
    usePokemonByType,
    usePokemonByEggGroup,
    usePokemonByMove,
} from '../hooks/usePokemon'
import { GENERATIONS } from '../constants/pokemon'
import { getIdFromUrl } from '../common/utils'
import PokemonListItem from '../components/PokemonListItem'
import Pagination from '../components/Pagination'
import FilterDrawer from '../components/FilterDrawer'

const PER_PAGE = 30

const Pokedex = () => {
    const [drawerOpen, setDrawerOpen] = useState(false)

    const {
        nameSearch, moveSearch,
        selectedType, selectedGenerations, selectedEggGroup,
        page,
        setNameSearch, setPage,
    } = usePokedexStore()

    const { data: allPokemon, isLoading } = useAllPokemonList()
    const { data: typeFilterSet } = usePokemonByType(selectedType)
    const { data: eggGroupFilterSet } = usePokemonByEggGroup(selectedEggGroup)
    const { data: moveData } = usePokemonByMove(moveSearch)

    const moveFilterSet = useMemo(() => {
        if (!moveData) return null
        return new Set(moveData.learned_by_pokemon.map((p) => p.name))
    }, [moveData])

    // 활성 필터 수 카운트
    const filterCount = [
        selectedType,
        selectedGenerations.length > 0,
        selectedEggGroup,
        moveSearch.length > 2,
    ].filter(Boolean).length

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
        <div className="app-shell">
            {/* ── 상단 바: 검색 + 필터 버튼 ── */}
            <div className="top-bar">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        value={nameSearch}
                        onChange={(e) => setNameSearch(e.target.value)}
                        placeholder="이름 또는 도감번호로 검색"
                    />
                </div>
                <button
                    className={`filter-toggle-btn ${filterCount > 0 ? 'has-filter' : ''}`}
                    onClick={() => setDrawerOpen(true)}
                >
                    필터
                    {filterCount > 0 && <span className="filter-count">{filterCount}</span>}
                </button>
            </div>

            {/* ── 결과 바 ── */}
            {!isLoading && (
                <div className="results-bar">
                    <span>{filtered.length}마리</span>
                    {totalPages > 1 && <span>{page} / {totalPages}</span>}
                </div>
            )}

            {/* ── 리스트 ── */}
            {isLoading ? (
                <div className="poke-list">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="poke-row">
                            <div className="skeleton" style={{ width: 32, height: 12 }} />
                            <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 8 }} />
                            <div style={{ flex: 1 }}>
                                <div className="skeleton" style={{ width: 72, height: 13, marginBottom: 4 }} />
                                <div className="skeleton" style={{ width: 48, height: 10 }} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    <div className="poke-list">
                        {paged.length > 0 ? (
                            paged.map(({ name }, i) => (
                                <PokemonListItem key={name} name={name} index={i} />
                            ))
                        ) : (
                            <div className="empty-state">검색 결과가 없습니다</div>
                        )}
                    </div>
                    {totalPages > 1 && (
                        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                    )}
                </>
            )}

            {/* ── 필터 드로어 ── */}
            <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        </div>
    )
}

export default Pokedex