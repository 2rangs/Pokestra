import { useMemo, useRef, useState } from 'react'
import { displayNameKo, type DexPokemon } from '../../lib/dex'
import { battleReadyPokemon, spriteUrl } from '../../lib/battle'
import { TypeBadge } from './TypeBadge'

interface Props {
    onPick: (p: DexPokemon) => void
    placeholder?: string
    includeForms?: boolean
    autoFocus?: boolean
}

/** 배틀 가능한 포켓몬 검색 (한국어/영어/번호) */
export function PokemonSearch({ onPick, placeholder = '포켓몬 이름 또는 번호', includeForms = true, autoFocus }: Props) {
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const [cursor, setCursor] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const pool = useMemo(() => battleReadyPokemon(includeForms), [includeForms])

    const results = useMemo(() => {
        const q = query.trim().toLowerCase().replace(/\s+/g, '')
        if (!q) return []
        const num = Number(q.replace('#', ''))
        return pool.filter(p => {
            if (Number.isFinite(num) && num > 0) return p.id === num
            return p.nameKo.replace(/\s+/g, '').includes(q) || p.name.includes(q.replace(/\s/g, '-'))
        }).slice(0, 10)
    }, [query, pool])

    const pick = (p: DexPokemon) => {
        onPick(p)
        setQuery('')
        setOpen(false)
        inputRef.current?.blur()
    }

    return (
        <div className="relative">
            <input
                ref={inputRef}
                value={query}
                autoFocus={autoFocus}
                onChange={e => { setQuery(e.target.value); setOpen(true); setCursor(0) }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                onKeyDown={e => {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)) }
                    if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
                    if (e.key === 'Enter' && results[cursor]) { e.preventDefault(); pick(results[cursor]!) }
                    if (e.key === 'Escape') setOpen(false)
                }}
                placeholder={placeholder}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
            {open && results.length > 0 && (
                <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    {results.map((p, i) => (
                        <li key={p.id}>
                            <button
                                type="button"
                                onMouseDown={e => { e.preventDefault(); pick(p) }}
                                onMouseEnter={() => setCursor(i)}
                                className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm ${i === cursor ? 'bg-slate-100' : ''}`}
                            >
                                <img src={p.sprite ?? spriteUrl(p.id)} alt="" className="h-8 w-8 shrink-0 object-contain" loading="lazy" />
                                <span className="min-w-0 flex-1 truncate">
                                    <span className="font-semibold text-slate-800">{displayNameKo(p)}</span>
                                    <span className="ml-1 text-xs text-slate-400">{p.name}</span>
                                </span>
                                <span className="flex shrink-0 gap-1">{p.types.map(t => <TypeBadge key={t} type={t} size="xs" />)}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
