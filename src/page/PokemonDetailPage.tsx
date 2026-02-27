import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
    usePokemonDetail,
    usePokemonSpecies,
    useEvolutionChain,
    useAbilityDetail,
    useMoveDetail,
    type EvolutionChain,
    type EvolutionDetail,
    type PokemonMoveEntry,
} from '../hooks/usePokemon'
import { getIdFromUrl, getArtwork } from '../common/utils'
import TypeBadge from '../components/TypeBadge'

// ── Constants ──

const EGG_GROUP_KO: Record<string, string> = {
    monster: '괴수', water1: '수중1', water2: '수중2', water3: '수중3',
    bug: '벌레', flying: '비행', ground: '육상', fairy: '요정',
    plant: '식물', humanshape: '인간형', mineral: '광물',
    indeterminate: '부정형', ditto: '메타몽', dragon: '드래곤', 'no-eggs': '미발견',
}

const LEARN_METHOD_KO: Record<string, string> = {
    'level-up': '레벨업', machine: '기술머신', egg: '유전', tutor: '가르침',
}

const STAT_META: Record<string, { label: string; color: string }> = {
    hp:                { label: 'HP',     color: 'var(--stat-hp)' },
    attack:            { label: '공격',   color: 'var(--stat-attack)' },
    defense:           { label: '방어',   color: 'var(--stat-defense)' },
    'special-attack':  { label: '특수공격', color: 'var(--stat-sp-atk)' },
    'special-defense': { label: '특수방어', color: 'var(--stat-sp-def)' },
    speed:             { label: '스피드', color: 'var(--stat-speed)' },
}

const DMG_CLASS_KO: Record<string, string> = {
    physical: '물리',
    special: '특수',
    status: '변화',
}

// ── Evolution helpers ──

interface EvoNode { name: string; details: EvolutionDetail[] }
type EvoPath = EvoNode[]

function collectPaths(chain: EvolutionChain['chain']): EvoPath[] {
    const paths: EvoPath[] = []
    function walk(node: EvolutionChain['chain'], cur: EvoPath) {
        const self: EvoNode = { name: node.species.name, details: node.evolution_details ?? [] }
        const path = [...cur, self]
        if (node.evolves_to.length === 0) paths.push(path)
        else node.evolves_to.forEach((n) => walk(n, path))
    }
    walk(chain, [])
    return paths
}

function evoConditionText(d: EvolutionDetail): string {
    const p: string[] = []
    switch (d.trigger.name) {
        case 'trade':
            p.push('통신교환')
            if (d.trade_species) p.push(`${d.trade_species.name}과 교환`)
            if (d.held_item) p.push(`${d.held_item.name} 소지`)
            break
        case 'use-item': p.push(d.item ? `${d.item.name} 사용` : '아이템 사용'); break
        case 'shed': p.push('빈 볼 + 파티 빈칸'); break
        case 'spin': p.push('회전'); break
        case 'tower-of-darkness': p.push('악의 탑 클리어'); break
        case 'tower-of-waters': p.push('물의 탑 클리어'); break
        case 'three-critical-hits': p.push('급소 3회'); break
        case 'take-damage': p.push('데미지 받고'); break
        case 'agile-style-move': p.push('속공 스타일 20회'); break
        case 'strong-style-move': p.push('강공 스타일 20회'); break
        case 'recoil-damage': p.push('반동 데미지'); break
        default: if (d.min_level) p.push(`Lv.${d.min_level}`); break
    }
    if (d.min_happiness) p.push(`친밀도 ${d.min_happiness}↑`)
    if (d.min_beauty) p.push(`아름다움 ${d.min_beauty}↑`)
    if (d.min_affection) p.push(`애정 ${d.min_affection}↑`)
    if (d.time_of_day === 'day') p.push('낮')
    if (d.time_of_day === 'night') p.push('밤')
    if (d.gender === 1) p.push('♀')
    if (d.gender === 2) p.push('♂')
    if (d.known_move) p.push(`${d.known_move.name} 습득`)
    if (d.known_move_type) p.push(`${d.known_move_type.name}타입 기술 습득`)
    if (d.location) p.push(`${d.location.name}`)
    if (d.held_item && d.trigger.name !== 'trade') p.push(`${d.held_item.name} 소지`)
    if (d.needs_overworld_rain) p.push('비 오는 날')
    if (d.party_species) p.push(`파티에 ${d.party_species.name}`)
    if (d.party_type) p.push(`파티에 ${d.party_type.name}타입`)
    if (d.relative_physical_stats === 1) p.push('공격 > 방어')
    if (d.relative_physical_stats === 0) p.push('공격 = 방어')
    if (d.relative_physical_stats === -1) p.push('공격 < 방어')
    if (d.turn_upside_down) p.push('기기 뒤집기')
    return p.join(' + ')
}

// ── Move parsing ──

interface ParsedMove { name: string; method: string; level: number }

function parseMoves(moves: PokemonMoveEntry[]): ParsedMove[] {
    return moves.map((m) => {
        const latest = m.version_group_details[m.version_group_details.length - 1]
        return { name: m.move.name, method: latest?.move_learn_method.name ?? 'unknown', level: latest?.level_learned_at ?? 0 }
    })
}

// ── Sub-components ──

/** 특성 태그 — 한글 이름 자동 조회 */
const AbilityTag = ({ name, isHidden }: { name: string; isHidden: boolean }) => {
    const { data } = useAbilityDetail(name)
    const koName = data?.names.find((n) => n.language.name === 'ko')?.name

    return (
        <span className={`ability-tag ${isHidden ? 'hidden' : ''}`}>
            {koName ?? name}
            {isHidden ? ' (숨특)' : ''}
        </span>
    )
}

/** 기술 한 행 — 한글 이름 + 타입/위력/분류 */
const MoveRow = ({ moveName, level, showLevel }: { moveName: string; level: number; showLevel: boolean }) => {
    const { data } = useMoveDetail(moveName)
    const koName = data?.names.find((n) => n.language.name === 'ko')?.name

    return (
        <div style={{ display: 'contents' }}>
            {showLevel && (
                <div className={`move-cell move-lv ${level ? 'has' : 'no'}`}>
                    {level ? `Lv.${level}` : '—'}
                </div>
            )}
            <div className="move-cell move-name">
                {koName ?? moveName.replace(/-/g, ' ')}
            </div>
            <div className="move-cell move-type">
                {data ? <TypeBadge type={data.type.name} /> : null}
            </div>
            <div className="move-cell move-info">
                {data && (
                    <>
                        <span className="move-class">{DMG_CLASS_KO[data.damage_class.name] ?? data.damage_class.name}</span>
                        {data.power && <span className="move-pwr">위력 {data.power}</span>}
                        {data.accuracy && <span className="move-acc">명중 {data.accuracy}</span>}
                    </>
                )}
            </div>
        </div>
    )
}

const EvoStageItem = ({ speciesName, isActive }: { speciesName: string; isActive: boolean }) => {
    const { data } = usePokemonDetail(speciesName)
    const sid = data ? getIdFromUrl(data.species.url) : undefined
    const { data: sp } = usePokemonSpecies(sid)
    const ko = sp?.names.find((n) => n.language.name === 'ko')?.name

    return (
        <Link to={`/pokemon/${data?.id ?? speciesName}`} className={`evo-item ${isActive ? 'active' : ''}`}>
            {data && <img src={getArtwork(data)} alt={speciesName} />}
            <span className="evo-name" style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}>
                {ko ?? speciesName}
            </span>
        </Link>
    )
}

const VarietyItem = ({ pokemonName, isActive }: { pokemonName: string; isActive: boolean }) => {
    const { data } = usePokemonDetail(pokemonName)
    if (!data) return null
    let label = pokemonName.replace(data.species.name, '').replace(/^-/, '')
    if (!label) label = '기본'
    label = label.charAt(0).toUpperCase() + label.slice(1)

    return (
        <Link to={`/pokemon/${data.id}`} className={`var-item ${isActive ? 'active' : ''}`}>
            <img src={getArtwork(data)} alt={pokemonName} />
            <span style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}>{label}</span>
        </Link>
    )
}

// ── Moves Section ──

const MOVE_TABS = ['level-up', 'machine', 'egg', 'tutor'] as const

const MovesSection = ({ moves }: { moves: PokemonMoveEntry[] }) => {
    const [tab, setTab] = useState<string>('level-up')
    const parsed = useMemo(() => parseMoves(moves), [moves])

    const grouped = useMemo(() => {
        const m: Record<string, ParsedMove[]> = {}
        parsed.forEach((mv) => {
            if (!m[mv.method]) m[mv.method] = []
            m[mv.method].push(mv)
        })
        if (m['level-up']) m['level-up'].sort((a, b) => a.level - b.level)
        return m
    }, [parsed])

    const tabs = MOVE_TABS.filter((t) => grouped[t]?.length)
    const list = grouped[tab] ?? []
    const isLv = tab === 'level-up'

    return (
        <>
            <div className="move-tabs">
                {tabs.map((t) => (
                    <button key={t} className={`move-tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
                        {LEARN_METHOD_KO[t] ?? t}
                        <span className="cnt">{grouped[t]?.length}</span>
                    </button>
                ))}
            </div>
            <div className={`move-grid ${isLv ? 'with-lv' : 'no-lv'}`}>
                {list.map((m) => (
                    <MoveRow key={m.name} moveName={m.name} level={m.level} showLevel={isLv} />
                ))}
            </div>
        </>
    )
}

// ── Main ──

const PokemonDetailPage = () => {
    const { id } = useParams<{ id: string }>()
    const { data: pokemon, isLoading } = usePokemonDetail(id!)
    const speciesId = pokemon ? getIdFromUrl(pokemon.species.url) : undefined
    const { data: species } = usePokemonSpecies(speciesId)
    const { data: evoChain } = useEvolutionChain(species?.evolution_chain.url)

    if (isLoading) {
        return <div className="app-shell" style={{ textAlign: 'center', paddingTop: 80 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>불러오는 중...</p>
        </div>
    }
    if (!pokemon) {
        return <div className="app-shell" style={{ textAlign: 'center', paddingTop: 80 }}>
            <p style={{ color: 'var(--text-muted)' }}>포켓몬을 찾을 수 없습니다</p>
        </div>
    }

    const koName = species?.names.find((n) => n.language.name === 'ko')?.name
    const jaName = species?.names.find((n) => n.language.name === 'ja-Hrkt')?.name
    const genus = species?.genera.find((g) => g.language.name === 'ko')?.genus
    const flavorText = species?.flavor_text_entries.find((f) => f.language.name === 'ko')?.flavor_text.replace(/\n|\f/g, ' ')

    const artwork = getArtwork(pokemon)
    const totalStats = pokemon.stats.reduce((s, v) => s + v.base_stat, 0)
    const evoPaths = evoChain ? collectPaths(evoChain.chain) : []
    const varieties = species?.varieties ?? []
    const eggGroups = species?.egg_groups ?? []

    return (
        <div className="app-shell" style={{ maxWidth: 700 }}>
            <Link to="/" className="detail-back">← 도감</Link>

            {/* ── Hero ── */}
            <div className="d-card fade-up" style={{ padding: 28, marginBottom: 16 }}>
                <div className="detail-hero">
                    <div className="detail-art-wrap">
                        <img src={artwork} alt={pokemon.name} />
                    </div>
                    <div className="detail-meta">
                        <div className="dex-num">#{String(speciesId ?? pokemon.id).padStart(3, '0')}</div>
                        <h1>{koName ?? species?.name ?? pokemon.name}</h1>
                        <div className="names">
                            {jaName && <span>{jaName}</span>}
                            <span style={{ textTransform: 'capitalize' }}>{species?.name ?? pokemon.name}</span>
                        </div>
                        {genus && <div className="genus">{genus}</div>}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                            {pokemon.types.map((t) => <TypeBadge key={t.type.name} type={t.type.name} />)}
                        </div>
                        <div className="measures">
                            <span>키 {pokemon.height / 10}m</span>
                            <span>몸무게 {pokemon.weight / 10}kg</span>
                        </div>
                        <div className="abilities">
                            {pokemon.abilities.map((a) => (
                                <AbilityTag key={a.ability.name} name={a.ability.name} isHidden={a.is_hidden} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 설명 ── */}
            {flavorText && (
                <div className="d-card fade-up" style={{ animationDelay: '0.04s' }}>
                    <p className="flavor">{flavorText}</p>
                </div>
            )}

            {/* ── 알 그룹 ── */}
            {eggGroups.length > 0 && (
                <div className="d-card fade-up" style={{ animationDelay: '0.06s', padding: '16px 22px' }}>
                    <div className="egg-row">
                        <span className="egg-label">알 그룹</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {eggGroups.map((g) => (
                                <span key={g.name} className="egg-tag">{EGG_GROUP_KO[g.name] ?? g.name}</span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── 종족값 ── */}
            <div className="d-card fade-up" style={{ animationDelay: '0.08s' }}>
                <div className="d-title">종족값 <span className="sub">합계 {totalStats}</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {pokemon.stats.map((s) => {
                        const m = STAT_META[s.stat.name]
                        return (
                            <div key={s.stat.name} className="stat-row">
                                <span className="stat-label">{m?.label ?? s.stat.name}</span>
                                <span className="stat-val" style={{ color: m?.color }}>{s.base_stat}</span>
                                <div className="stat-track">
                                    <div className="stat-fill" style={{ width: `${Math.min(100, (s.base_stat / 255) * 100)}%`, background: m?.color }} />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* ── 배우는 기술 ── */}
            {pokemon.moves.length > 0 && (
                <div className="d-card fade-up" style={{ animationDelay: '0.1s' }}>
                    <div className="d-title">배우는 기술 <span className="sub">{pokemon.moves.length}개</span></div>
                    <MovesSection moves={pokemon.moves} />
                </div>
            )}

            {/* ── 폼 변형 ── */}
            {varieties.length > 1 && (
                <div className="d-card fade-up" style={{ animationDelay: '0.12s' }}>
                    <div className="d-title">폼</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {varieties.map((v) => (
                            <VarietyItem key={v.pokemon.name} pokemonName={v.pokemon.name} isActive={v.pokemon.name === pokemon.name} />
                        ))}
                    </div>
                </div>
            )}

            {/* ── 진화 ── */}
            {evoPaths.length > 0 && evoPaths[0].length > 1 && (
                <div className="d-card fade-up" style={{ animationDelay: '0.14s' }}>
                    <div className="d-title">진화</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {evoPaths.map((path, pi) => (
                            <div key={pi} className="evo-row">
                                {path.map((node, ni) => (
                                    <div key={node.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        {ni > 0 && (
                                            <div className="evo-cond">
                                                <div className="evo-arrow">→</div>
                                                {node.details.map((d, di) => {
                                                    const t = evoConditionText(d)
                                                    return t ? (
                                                        <div key={di}>
                                                            {di > 0 && <span className="evo-or">또는 </span>}
                                                            {t}
                                                        </div>
                                                    ) : null
                                                })}
                                            </div>
                                        )}
                                        <EvoStageItem speciesName={node.name} isActive={node.name === pokemon.species.name} />
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default PokemonDetailPage