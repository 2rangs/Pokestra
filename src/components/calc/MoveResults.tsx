import { useMemo, useState, type ReactNode } from 'react'
import type { MoveData } from '@kyasi/pokebattle-engine'
import { moveNameKo, typeNameKo } from '../../lib/battle'
import type { MoveCalc } from './calcState'
import { CategoryBadge, TypeChip, inputCls } from './ui'

type Props = {
    moves: string[]
    pool: MoveData[]
    results: (MoveCalc | null)[]
    defenderHp: number
    onChangeMove: (index: number, slug: string) => void
}

const pct = (r: number) => `${(r * 100).toFixed(1)}%`

function MoveSearch({ pool, exclude, onPick, onClose }: {
    pool: MoveData[]; exclude: string[]; onPick: (slug: string) => void; onClose: () => void
}) {
    const [q, setQ] = useState('')
    const list = useMemo(() => {
        const s = q.trim().toLowerCase()
        const slug = s.replace(/\s+/g, '-')
        return pool.filter(m => !exclude.includes(m.name) && (!s
            || moveNameKo(m.name).toLowerCase().includes(s) || m.name.includes(slug) || typeNameKo(m.type).includes(s)))
    }, [pool, q, exclude])

    return (
        <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
            <div className="mb-2 flex gap-2">
                <input
                    autoFocus className={inputCls} placeholder="기술 검색 (이름/타입)" value={q}
                    onChange={e => setQ(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Escape') onClose()
                        if (e.key === 'Enter' && list[0]) onPick(list[0].name)
                    }}
                />
                <button type="button" onClick={onClose} className="shrink-0 rounded-lg px-2 text-sm text-slate-500 hover:bg-slate-100">닫기</button>
            </div>
            <ul className="max-h-64 overflow-y-auto">
                {list.length === 0 && <li className="px-2 py-2 text-sm text-slate-400">배울 수 있는 공격기가 없습니다</li>}
                {list.map(m => (
                    <li key={m.name}>
                        <button
                            type="button" onClick={() => onPick(m.name)}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50"
                        >
                            <TypeChip type={m.type} small />
                            <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{moveNameKo(m.name)}</span>
                            <CategoryBadge category={m.category} />
                            <span className="w-8 shrink-0 text-right text-xs tabular-nums text-slate-500">{m.power ?? '—'}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    )
}

function HpBar({ min, max }: { min: number; max: number }) {
    const a = Math.min(100, min * 100)
    const b = Math.min(100, max * 100)
    const ko = min >= 1 ? 'bg-red-500' : 'bg-red-400'
    return (
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-emerald-100" title={`${pct(min)} – ${pct(max)}`}>
            <div className="absolute inset-y-0 left-0 bg-red-200" style={{ width: `${b}%` }} />
            <div className={`absolute inset-y-0 left-0 ${ko}`} style={{ width: `${a}%` }} />
        </div>
    )
}

export function MoveResults({ moves, pool, results, defenderHp, onChangeMove }: Props) {
    const [editing, setEditing] = useState<number | null>(null)
    const [selected, setSelected] = useState(0)
    const slots = [0, 1, 2, 3]
    const sel = results[selected] ?? null

    return (
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <h2 className="mb-3 text-sm font-bold text-slate-800">기술별 데미지</h2>
            <div className="flex flex-col gap-2">
                {slots.map(i => {
                    const slug = moves[i]
                    const r = results[i]
                    const isSel = selected === i && !!r
                    return (
                        <div key={i} className={`rounded-xl border p-2.5 transition-colors ${isSel ? 'border-red-300 bg-red-50/40' : 'border-slate-100 bg-slate-50/60'}`}>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditing(editing === i ? null : i)}
                                    className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-0.5 text-left hover:bg-white"
                                    title="기술 변경"
                                >
                                    {r ? <TypeChip type={r.detail.moveType ?? r.move.type} small /> : <span className="h-4 w-8 rounded bg-slate-200" />}
                                    <span className="min-w-0 truncate text-sm font-semibold text-slate-800">
                                        {slug ? moveNameKo(slug) : '기술 선택'}
                                    </span>
                                    {r && <CategoryBadge category={r.detail.category ?? r.move.category} />}
                                    {r && <span className="shrink-0 text-[11px] tabular-nums text-slate-400">위력 {r.detail.basePower || r.move.power || '—'}</span>}
                                    <span className="ml-auto shrink-0 text-xs text-slate-400">▾</span>
                                </button>
                                {r && (
                                    <button
                                        type="button" onClick={() => setSelected(i)}
                                        className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${isSel ? 'bg-red-500 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:text-slate-700'}`}
                                    >
                                        상세
                                    </button>
                                )}
                            </div>
                            {editing === i && (
                                <MoveSearch
                                    pool={pool} exclude={moves.filter((m, j) => j !== i && !!m)}
                                    onPick={s => { onChangeMove(i, s); setEditing(null); setSelected(i) }}
                                    onClose={() => setEditing(null)}
                                />
                            )}
                            {r && (
                                <div className="mt-2 cursor-pointer" onClick={() => setSelected(i)}>
                                    <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                                        <span className="text-sm font-bold tabular-nums text-slate-900">
                                            {pct(r.summary.minRatio)} – {pct(r.summary.maxRatio)}
                                        </span>
                                        <span className="text-xs tabular-nums text-slate-500">{r.summary.min} – {r.summary.max} / {defenderHp}</span>
                                        <span className={`text-xs font-bold ${r.summary.koChance === 'guaranteed' ? 'text-red-600' : r.summary.koChance === 'rng' ? 'text-orange-600' : 'text-slate-600'}`}>
                                            {r.summary.koText}
                                        </span>
                                    </div>
                                    <HpBar min={r.summary.minRatio} max={r.summary.maxRatio} />
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {sel && (
                <div className="mt-3 rounded-xl border border-slate-100 p-3 text-xs text-slate-600">
                    <div className="mb-2 font-bold text-slate-800">{moveNameKo(sel.slug)} 상세</div>
                    <div className="mb-2 flex flex-wrap gap-1.5">
                        <Tag>상성 ×{sel.detail.effectiveness}</Tag>
                        <Tag>자속 {sel.detail.isSTAB ? '있음' : '없음'}</Tag>
                        <Tag>위력 {sel.detail.basePower}</Tag>
                    </div>
                    <div className="mb-2 break-words rounded-lg bg-white px-2 py-1.5 font-mono text-[11px] leading-relaxed text-slate-600" title="Showdown 데미지 계산기 형식">
                        {sel.detail.desc}
                    </div>
                    <div className="mb-1 text-[11px] font-semibold text-slate-500">난수 16단계</div>
                    <div className="break-words font-mono text-[11px] leading-relaxed text-slate-700">{sel.summary.range.join(', ')}</div>
                </div>
            )}
        </section>
    )
}

function Tag({ children }: { children: ReactNode }) {
    return <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">{children}</span>
}
