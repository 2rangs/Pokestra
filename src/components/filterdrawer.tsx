import { useEffect } from 'react'
import { usePokedexStore } from '../stores/pokedexStore'
import { POKEMON_TYPES, GENERATIONS, EGG_GROUPS } from '../constants/pokemon'
import TypeBadge from './TypeBadge'

interface Props {
    open: boolean
    onClose: () => void
}

const FilterDrawer = ({ open, onClose }: Props) => {
    const {
        moveSearch,
        selectedType, selectedGenerations, selectedEggGroup,
        setMoveSearch,
        setSelectedType, toggleGeneration, setSelectedEggGroup,
        resetFilters,
    } = usePokedexStore()

    // ESC 키로 닫기
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (open) document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [open, onClose])

    // body 스크롤 잠금
    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [open])

    const hasAnyFilter = !!selectedType || selectedGenerations.length > 0 || !!selectedEggGroup || moveSearch.length > 0

    return (
        <>
            {/* 오버레이 */}
        <div
    className={`drawer-overlay ${open ? 'open' : ''}`}
    onClick={onClose}
    />

    {/* 패널 */}
    <div className={`drawer-panel ${open ? 'open' : ''}`}>
    <div className="drawer-header">
        <h2>필터</h2>
        <button className="drawer-close" onClick={onClose}>✕</button>
    </div>

    <div className="drawer-body">
        {/* 배우는 스킬 */}
        <div className="filter-section">
        <h3>배우는 기술</h3>
    <input
    type="text"
    value={moveSearch}
    onChange={(e) => setMoveSearch(e.target.value)}
    placeholder="thunderbolt"
    className="filter-input"
        />
        </div>

    {/* 타입 */}
    <div className="filter-section">
        <h3>
            타입
    {selectedType && (
        <button className="reset-btn" onClick={() => setSelectedType(null)}>
        초기화
        </button>
    )}
    </h3>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
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
    <div className="filter-section">
        <h3>세대</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    {GENERATIONS.map((gen) => (
        <label key={gen.id} className="filter-check">
    <input
        type="checkbox"
        checked={selectedGenerations.includes(gen.id)}
        onChange={() => toggleGeneration(gen.id)}
        />
        <span style={{ flex: 1 }}>{gen.label}</span>
    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
        {gen.min}–{gen.max}
        </span>
        </label>
    ))}
    </div>
    </div>

    {/* 알 그룹 */}
    <div className="filter-section">
        <h3>
            알 그룹
    {selectedEggGroup && (
        <button className="reset-btn" onClick={() => setSelectedEggGroup(null)}>
        초기화
        </button>
    )}
    </h3>
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
    </div>

    {/* 하단: 전체 초기화 */}
    {hasAnyFilter && (
        <div className="drawer-footer">
        <button onClick={() => { resetFilters(); onClose(); }}>
        전체 필터 초기화
    </button>
    </div>
    )}
    </div>
    </>
)
}

export default FilterDrawer