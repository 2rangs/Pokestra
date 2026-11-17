import { useId, useMemo, useState } from 'react'
import { battleReadyPokemon } from '../../lib/battle'
import { displayName, officialArtworkUrl, searchKey, type DexPokemon } from '../../lib/dex'
import { useLang, useT } from '../../i18n'
import { calcMessages } from '../../i18n/messages/calc'
import { commonMessages } from '../../i18n/messages/common'
import { inputCls } from './ui'

type Props = {
    current: DexPokemon | undefined
    /** 접근성 라벨에 쓰는 진영 이름 ("공격 측") */
    sideLabel: string
    onPick: (p: DexPokemon) => void
}

const MAX_RESULTS = 40

/** 한/영/일 이름·도감 번호로 검색하는 포켓몬 선택기 (배틀 가능한 포켓몬만) */
export function PokemonPicker({ current, sideLabel, onPick }: Props) {
    const lang = useLang()
    const t = useT(calcMessages)
    const tc = useT(commonMessages)
    const listId = useId()
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const [forms, setForms] = useState(false)
    const [active, setActive] = useState(0)

    const pool = useMemo(
        () => battleReadyPokemon(forms).map(p => ({ p, key: searchKey(p) })),
        [forms],
    )
    const results = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return pool.slice(0, MAX_RESULTS).map(x => x.p)
        const qSlug = q.replace(/\s+/g, '-')
        const prefix: DexPokemon[] = []
        const rest: DexPokemon[] = []
        for (const { p, key } of pool) {
            if (String(p.id) === q || key.split(' ').some(w => w.startsWith(q) || w.startsWith(qSlug))) prefix.push(p)
            else if (key.includes(q) || key.includes(qSlug)) rest.push(p)
            if (prefix.length >= MAX_RESULTS) break
        }
        return [...prefix, ...rest].slice(0, MAX_RESULTS)
    }, [pool, query])

    const pick = (p: DexPokemon) => {
        onPick(p)
        setQuery('')
        setOpen(false)
        setActive(0)
    }

    const activeIdx = Math.min(active, Math.max(0, results.length - 1))
    const optionId = (i: number) => `${listId}-opt-${i}`

    return (
        <div className="relative">
            <div className="flex items-center gap-2">
                <input
                    type="search"
                    role="combobox"
                    aria-label={t('pickerLabel', { side: sideLabel })}
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={open && results.length ? optionId(activeIdx) : undefined}
                    className={inputCls}
                    placeholder={current ? t('pickerPlaceholderCurrent', { name: displayName(current, lang) }) : t('pickerPlaceholder')}
                    value={query}
                    onChange={e => { setQuery(e.target.value); setOpen(true); setActive(0) }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    onKeyDown={e => {
                        if (e.key === 'ArrowDown') {
                            e.preventDefault()
                            setOpen(true)
                            setActive(Math.min(activeIdx + 1, results.length - 1))
                        } else if (e.key === 'ArrowUp') {
                            e.preventDefault()
                            setActive(Math.max(activeIdx - 1, 0))
                        } else if (e.key === 'Enter' && open && results[activeIdx]) {
                            e.preventDefault()
                            pick(results[activeIdx])
                        } else if (e.key === 'Escape') {
                            setOpen(false)
                        }
                    }}
                />
                <label className="flex shrink-0 cursor-pointer items-center gap-1 text-[11px] text-slate-500">
                    <input type="checkbox" checked={forms} onChange={e => setForms(e.target.checked)} className="accent-red-500" />
                    {t('includeForms')}
                </label>
            </div>
            {open && (
                <ul
                    id={listId} role="listbox" aria-label={t('pickerLabel', { side: sideLabel })}
                    className="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                >
                    {results.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">{tc('noResults')}</li>}
                    {results.map((p, i) => (
                        <li
                            key={p.id} id={optionId(i)} role="option" aria-selected={i === activeIdx}
                            onMouseDown={e => e.preventDefault()}
                            onMouseEnter={() => setActive(i)}
                            onClick={() => pick(p)}
                            className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm ${i === activeIdx ? 'bg-red-50' : 'hover:bg-slate-50'}`}
                        >
                            <img src={officialArtworkUrl(p.id)} alt="" loading="lazy" className="h-7 w-7 shrink-0 object-contain" />
                            <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{displayName(p, lang)}</span>
                            <span className="shrink-0 text-[11px] tabular-nums text-slate-400">{p.id < 10000 ? `#${p.id}` : p.name}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
