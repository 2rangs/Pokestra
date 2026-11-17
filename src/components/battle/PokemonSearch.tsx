import { useId, useMemo, useRef, useState } from 'react'
import { displayName, searchKey, type DexPokemon } from '../../lib/dex'
import { battleReadyPokemon, spriteUrl } from '../../lib/battle'
import { useLang, useT } from '../../i18n'
import { battleMessages } from '../../i18n/messages/battle'
import { commonMessages } from '../../i18n/messages/common'
import { TypeBadge } from './TypeBadge'

interface Props {
    onPick: (p: DexPokemon) => void
    placeholder?: string
    includeForms?: boolean
    autoFocus?: boolean
}

const norm = (s: string) => s.toLowerCase().replace(/[\s\-_.'’:]/g, '')

/** 배틀 가능한 포켓몬 검색 (한국어/영어/일본어/번호) */
export function PokemonSearch({ onPick, placeholder, includeForms = true, autoFocus }: Props) {
    const lang = useLang()
    const t = useT(battleMessages)
    const tc = useT(commonMessages)
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const [cursor, setCursor] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const listId = useId()
    const pool = useMemo(
        () => battleReadyPokemon(includeForms).map(p => ({ p, key: norm(searchKey(p)) })),
        [includeForms],
    )

    const results = useMemo(() => {
        const q = norm(query.trim())
        if (!q) return []
        const num = Number(q.replace('#', ''))
        if (Number.isFinite(num) && num > 0) return pool.filter(x => x.p.id === num).map(x => x.p).slice(0, 10)
        // 앞부분 일치를 먼저
        const starts: DexPokemon[] = []
        const contains: DexPokemon[] = []
        for (const x of pool) {
            const i = x.key.indexOf(q)
            if (i < 0) continue
            const prefix = i === 0 || [x.p.name, x.p.nameKo, x.p.nameEn, x.p.nameJa].some(n => n && norm(n).startsWith(q))
            ;(prefix ? starts : contains).push(x.p)
            if (starts.length >= 10) break
        }
        return [...starts, ...contains].slice(0, 10)
    }, [query, pool])

    const pick = (p: DexPokemon) => {
        onPick(p)
        setQuery('')
        setOpen(false)
        inputRef.current?.blur()
    }

    const showList = open && query.trim().length > 0
    const label = placeholder ?? t('searchPlaceholder')

    return (
        <div className="relative">
            <input
                ref={inputRef}
                type="search"
                role="combobox"
                aria-label={t('searchLabel')}
                aria-expanded={showList && results.length > 0}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={showList && results[cursor] ? `${listId}-${results[cursor]!.id}` : undefined}
                value={query}
                autoFocus={autoFocus}
                autoComplete="off"
                onChange={e => { setQuery(e.target.value); setOpen(true); setCursor(0) }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                onKeyDown={e => {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)) }
                    if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
                    if (e.key === 'Enter' && results[cursor]) { e.preventDefault(); pick(results[cursor]!) }
                    if (e.key === 'Escape') setOpen(false)
                }}
                placeholder={label}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
            {showList && (
                <ul id={listId} role="listbox" className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    {results.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">{tc('noResults')}</li>}
                    {results.map((p, i) => (
                        <li key={p.id} id={`${listId}-${p.id}`} role="option" aria-selected={i === cursor}>
                            <button
                                type="button"
                                tabIndex={-1}
                                onMouseDown={e => { e.preventDefault(); pick(p) }}
                                onMouseEnter={() => setCursor(i)}
                                className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm ${i === cursor ? 'bg-slate-100' : ''}`}
                            >
                                <img src={p.sprite ?? spriteUrl(p.id)} alt="" className="h-8 w-8 shrink-0 object-contain" loading="lazy" />
                                <span className="min-w-0 flex-1 truncate">
                                    <span className="font-semibold text-slate-800">{displayName(p, lang)}</span>
                                    <span className="ml-1 text-xs tabular-nums text-slate-400">#{p.id}</span>
                                </span>
                                <span className="flex shrink-0 gap-1">{p.types.map(ty => <TypeBadge key={ty} type={ty} size="xs" />)}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
