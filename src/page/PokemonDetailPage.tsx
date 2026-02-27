import { useParams, Link } from 'react-router-dom'
import {
    usePokemonDetail,
    usePokemonSpecies,
    useEvolutionChain,
    type EvolutionChain,
    type EvolutionDetail,
} from '../hooks/usePokemon'
import { getIdFromUrl } from '../common/utils'
import TypeBadge from '../components/TypeBadge'

// ── 진화 체인 ──

interface EvoNode {
    name: string
    details: EvolutionDetail[]
}

type EvoPath = EvoNode[]

function collectPaths(chain: EvolutionChain['chain']): EvoPath[] {
    const paths: EvoPath[] = []
    function walk(node: EvolutionChain['chain'], current: EvoPath) {
        const self: EvoNode = { name: node.species.name, details: node.evolution_details ?? [] }
        const path = [...current, self]
        if (node.evolves_to.length === 0) paths.push(path)
        else node.evolves_to.forEach((next) => walk(next, path))
    }
    walk(chain, [])
    return paths
}

// ── 스탯 ──

const STAT_META: Record<string, { label: string; color: string }> = {
    hp:              { label: 'HP',     color: 'var(--stat-hp)' },
    attack:          { label: '공격',   color: 'var(--stat-attack)' },
    defense:         { label: '방어',   color: 'var(--stat-defense)' },
    'special-attack':  { label: '특수공격', color: 'var(--stat-sp-atk)' },
    'special-defense': { label: '특수방어', color: 'var(--stat-sp-def)' },
    speed:           { label: '스피드', color: 'var(--stat-speed)' },
}

// ── 진화 조건 텍스트 ──

function evoConditionText(d: EvolutionDetail): string {
    const p: string[] = []
    switch (d.trigger.name) {
        case 'trade':
            p.push('통신교환')
            if (d.trade_species) p.push(`${d.trade_species.name}과 교환`)
            if (d.held_item) p.push(`${d.held_item.name} 소지`)
            break
        case 'use-item':
            p.push(d.item ? `${d.item.name} 사용` : '아이템 사용')
            break
        case 'shed': p.push('빈 볼 + 파티 빈칸'); break
        case 'spin': p.push('회전'); break
        case 'tower-of-darkness': p.push('악의 탑 클리어'); break
        case 'tower-of-waters': p.push('물의 탑 클리어'); break
        case 'three-critical-hits': p.push('급소 3회'); break
        case 'take-damage': p.push('데미지 받고'); break
        case 'agile-style-move': p.push('속공 스타일 20회'); break
        case 'strong-style-move': p.push('강공 스타일 20회'); break
        case 'recoil-damage': p.push('반동 데미지'); break
        default:
            if (d.min_level) p.push(`Lv.${d.min_level}`)
            break
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

// ── 서브 컴포넌트 ──

const EvoStageItem = ({ speciesName, isActive }: { speciesName: string; isActive: boolean }) => {
    const { data } = usePokemonDetail(speciesName)
    const speciesId = data ? getIdFromUrl(data.species.url) : undefined
    const { data: species } = usePokemonSpecies(speciesId)
    const koName = species?.names.find((n) => n.language.name === 'ko')?.name

    return (
        <Link to={`/pokemon/${speciesName}`} className={`evo-item ${isActive ? 'active' : ''}`}>
            {data?.sprites.front_default && (
                <img src={data.sprites.front_default} alt={speciesName} />
            )}
            <span style={{ fontSize: 11, fontWeight: 500, color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}>
                {koName ?? speciesName}
            </span>
        </Link>
    )
}

const VarietyItem = ({ pokemonName, isActive }: { pokemonName: string; isActive: boolean }) => {
    const { data } = usePokemonDetail(pokemonName)
    if (!data) return null

    const speciesName = data.species.name
    let formLabel = pokemonName.replace(speciesName, '').replace(/^-/, '')
    if (!formLabel) formLabel = '기본'
    formLabel = formLabel.charAt(0).toUpperCase() + formLabel.slice(1)

    return (
        <Link to={`/pokemon/${pokemonName}`} className={`variant-item ${isActive ? 'active' : ''}`}>
            {data.sprites.front_default && (
                <img src={data.sprites.front_default} alt={pokemonName} />
            )}
            <span style={{ fontSize: 11, fontWeight: 500, color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}>
                {formLabel}
            </span>
        </Link>
    )
}

// ── 메인 ──

const PokemonDetailPage = () => {
    const { name } = useParams<{ name: string }>()
    const { data: pokemon, isLoading } = usePokemonDetail(name!)
    const speciesId = pokemon ? getIdFromUrl(pokemon.species.url) : undefined
    const { data: species } = usePokemonSpecies(speciesId)
    const { data: evoChain } = useEvolutionChain(species?.evolution_chain.url)

    if (isLoading) {
        return (
            <div className="app-container" style={{ textAlign: 'center', paddingTop: 80 }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>불러오는 중...</p>
            </div>
        )
    }
    if (!pokemon) {
        return (
            <div className="app-container" style={{ textAlign: 'center', paddingTop: 80 }}>
                <p style={{ color: 'var(--text-muted)' }}>포켓몬을 찾을 수 없습니다</p>
            </div>
        )
    }

    const koName = species?.names.find((n) => n.language.name === 'ko')?.name
    const jaName = species?.names.find((n) => n.language.name === 'ja-Hrkt')?.name
    const genus = species?.genera.find((g) => g.language.name === 'ko')?.genus
    const flavorText = species?.flavor_text_entries
        .find((f) => f.language.name === 'ko')
        ?.flavor_text.replace(/\n|\f/g, ' ')

    const artwork = pokemon.sprites.other['official-artwork'].front_default
    const totalStats = pokemon.stats.reduce((s, v) => s + v.base_stat, 0)
    const evoPaths = evoChain ? collectPaths(evoChain.chain) : []
    const varieties = species?.varieties ?? []
    const hasVarieties = varieties.length > 1

    return (
        <div className="app-container" style={{ maxWidth: 720 }}>
            <Link to="/" className="back-link">
                <span>←</span> 도감으로 돌아가기
            </Link>

            {/* ── 헤더 ── */}
            <div className="card animate-fade-in-up" style={{ padding: 28, marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
                    <div className="detail-artwork-bg">
                        <img
                            src={artwork || pokemon.sprites.front_default}
                            alt={pokemon.name}
                            className="detail-artwork"
                        />
                    </div>
                    <div style={{ flex: 1, paddingTop: 4 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', fontWeight: 500 }}>
                            #{String(speciesId ?? pokemon.id).padStart(3, '0')}
                        </div>
                        <h1 style={{ fontSize: 26, fontWeight: 700, margin: '4px 0 6px', letterSpacing: '-0.02em' }}>
                            {koName ?? species?.name ?? pokemon.name}
                        </h1>
                        <div style={{ display: 'flex', gap: 10, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                            {jaName && <span>{jaName}</span>}
                            <span style={{ textTransform: 'capitalize' }}>{species?.name ?? pokemon.name}</span>
                        </div>
                        {genus && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{genus}</div>
                        )}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                            {pokemon.types.map((t) => (
                                <TypeBadge key={t.type.name} type={t.type.name} />
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
                            <span>키 {pokemon.height / 10}m</span>
                            <span>몸무게 {pokemon.weight / 10}kg</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {pokemon.abilities.map((a) => (
                                <span
                                    key={a.ability.name}
                                    style={{
                                        fontSize: 11,
                                        padding: '3px 10px',
                                        borderRadius: 'var(--radius-full)',
                                        border: `1px ${a.is_hidden ? 'dashed' : 'solid'} var(--border)`,
                                        color: a.is_hidden ? 'var(--text-muted)' : 'var(--text-secondary)',
                                        textTransform: 'capitalize',
                                        fontFamily: 'var(--font-heading)',
                                    }}
                                >
                                    {a.ability.name}{a.is_hidden ? ' (숨특)' : ''}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 도감 설명 ── */}
            {flavorText && (
                <div
                    className="card animate-fade-in-up"
                    style={{ padding: '16px 20px', marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, animationDelay: '0.05s' }}
                >
                    {flavorText}
                </div>
            )}

            {/* ── 종족값 ── */}
            <div className="card animate-fade-in-up" style={{ padding: 24, marginBottom: 20, animationDelay: '0.1s' }}>
                <div className="section-label">
                    종족값 <span className="sub">합계 {totalStats}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {pokemon.stats.map((s) => {
                        const meta = STAT_META[s.stat.name]
                        return (
                            <div key={s.stat.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{
                                    width: 56, textAlign: 'right', fontSize: 11, fontWeight: 500,
                                    color: 'var(--text-muted)', fontFamily: 'var(--font-heading)',
                                }}>
                                    {meta?.label ?? s.stat.name}
                                </span>
                                <span style={{
                                    width: 32, textAlign: 'right', fontSize: 13, fontWeight: 600,
                                    fontFamily: 'var(--font-heading)', color: meta?.color,
                                }}>
                                    {s.base_stat}
                                </span>
                                <div className="stat-bar-track" style={{ flex: 1 }}>
                                    <div
                                        className="stat-bar-fill"
                                        style={{
                                            width: `${Math.min(100, (s.base_stat / 255) * 100)}%`,
                                            background: meta?.color ?? 'var(--text-muted)',
                                        }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* ── 폼 변형 ── */}
            {hasVarieties && (
                <div className="card animate-fade-in-up" style={{ padding: 24, marginBottom: 20, animationDelay: '0.15s' }}>
                    <div className="section-label">폼</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {varieties.map((v) => (
                            <VarietyItem
                                key={v.pokemon.name}
                                pokemonName={v.pokemon.name}
                                isActive={v.pokemon.name === name}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* ── 진화 트리 ── */}
            {evoPaths.length > 0 && evoPaths[0].length > 1 && (
                <div className="card animate-fade-in-up" style={{ padding: 24, marginBottom: 20, animationDelay: '0.2s' }}>
                    <div className="section-label">진화</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {evoPaths.map((path, pi) => (
                            <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                {path.map((node, ni) => (
                                    <div key={node.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        {ni > 0 && (
                                            <div style={{
                                                textAlign: 'center', padding: '0 4px', maxWidth: 140,
                                                fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4,
                                            }}>
                                                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 2 }}>→</div>
                                                {node.details.length > 0 ? (
                                                    node.details.map((d, di) => {
                                                        const text = evoConditionText(d)
                                                        return text ? (
                                                            <div key={di}>
                                                                {di > 0 && <span style={{ color: 'var(--border)', fontSize: 10 }}>또는 </span>}
                                                                {text}
                                                            </div>
                                                        ) : null
                                                    })
                                                ) : null}
                                            </div>
                                        )}
                                        <EvoStageItem
                                            speciesName={node.name}
                                            isActive={node.name === pokemon.species.name}
                                        />
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