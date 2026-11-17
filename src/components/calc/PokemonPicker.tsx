import { useMemo, useState } from 'react'
import { battleReadyPokemon } from '../../lib/battle'
import { displayNameKo, officialArtworkUrl, type DexPokemon } from '../../lib/dex'
import { inputCls } from './ui'

type Props = {
    current: DexPokemon | undefined
    onPick: (p: DexPokemon) => void
}

/** 한국어/영어 이름 검색 포켓몬 선택기 (배틀 가능한 포켓몬만) */
export function PokemonPicker({ current, onPick }: Props) {
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const [forms, setForms] = useState(false)

    const pool = useMemo(() => battleReadyPokemon(forms), [forms])
    const results = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return pool.slice(0, 40)
        const qSlug = q.replace(/\s+/g, '-')
        return pool
            .filter(p => displayNameKo(p).toLowerCase().includes(q) || p.name.includes(qSlug) || String(p.id) === q)
            .slice(0, 40)
    }, [pool, query])

    const pick = (p: DexPokemon) => {
        onPick(p)
        setQuery('')
        setOpen(false)
    }

    return (
        <div className="relative">
            <div className="flex items-center gap-2">
                <input
                    className={inputCls}
                    placeholder={current ? `${displayNameKo(current)} — 이름으로 검색` : '포켓몬 검색 (한/영)'}
                    value={query}
                    onChange={e => { setQuery(e.target.value); setOpen(true) }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && results[0]) pick(results[0])
                        if (e.key === 'Escape') setOpen(false)
                    }}
                />
                <label className="flex shrink-0 cursor-pointer items-center gap-1 text-[11px] text-slate-500">
                    <input type="checkbox" checked={forms} onChange={e => setForms(e.target.checked)} className="accent-red-500" />
                    폼 포함
                </label>
            </div>
            {open && (
                <ul className="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    {results.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">검색 결과 없음</li>}
                    {results.map(p => (
                        <li key={p.id}>
                            <button
                                type="button"
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => pick(p)}
                                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-50"
                            >
                                <img src={officialArtworkUrl(p.id)} alt="" loading="lazy" className="h-7 w-7 shrink-0 object-contain" />
                                <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{displayNameKo(p)}</span>
                                <span className="shrink-0 text-[11px] text-slate-400">{p.name}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
