import { useMemo, useState } from 'react'
import { CheckboxInput } from '@astryxdesign/core/CheckboxInput'
import { Typeahead, TypeaheadItem, type SearchSource, type SearchableItem } from '@astryxdesign/core/Typeahead'
import { battleReadyPokemon } from '../../lib/battle'
import { pokemonImageCandidates } from '../../lib/images'
import { PokeImage } from '../ui/PokeImage'
import { displayName, searchKey, type DexPokemon } from '../../lib/dex'
import { useLang, useT } from '../../i18n'
import { calcMessages } from '../../i18n/messages/calc'
import { commonMessages } from '../../i18n/messages/common'

type Props = {
    current: DexPokemon | undefined
    /** 접근성 라벨에 쓰는 진영 이름 ("공격 측") */
    sideLabel: string
    onPick: (p: DexPokemon) => void
}

type PokemonItem = SearchableItem<{ p: DexPokemon }>

const MAX_RESULTS = 40

const dexNo = (p: DexPokemon) => (p.id < 10000 ? `No. ${String(p.id).padStart(4, '0')}` : p.name)

/** 한/영/일 이름·도감 번호로 검색하는 포켓몬 선택기 (배틀 가능한 포켓몬만) */
export function PokemonPicker({ current, sideLabel, onPick }: Props) {
    const lang = useLang()
    const t = useT(calcMessages)
    const tc = useT(commonMessages)
    const [forms, setForms] = useState(false)

    const pool = useMemo(
        () => battleReadyPokemon(forms).map(p => ({ p, key: searchKey(p) })),
        [forms],
    )

    const source = useMemo<SearchSource<PokemonItem>>(() => {
        const toItem = (p: DexPokemon): PokemonItem => ({ id: String(p.id), label: displayName(p, lang), auxiliaryData: { p } })
        return {
            bootstrap: () => pool.slice(0, MAX_RESULTS).map(x => toItem(x.p)),
            search: (query: string) => {
                const q = query.trim().toLowerCase()
                if (!q) return pool.slice(0, MAX_RESULTS).map(x => toItem(x.p))
                const qSlug = q.replace(/\s+/g, '-')
                const prefix: DexPokemon[] = []
                const rest: DexPokemon[] = []
                for (const { p, key } of pool) {
                    if (String(p.id) === q || key.split(' ').some(w => w.startsWith(q) || w.startsWith(qSlug))) prefix.push(p)
                    else if (key.includes(q) || key.includes(qSlug)) rest.push(p)
                    if (prefix.length >= MAX_RESULTS) break
                }
                return [...prefix, ...rest].slice(0, MAX_RESULTS).map(toItem)
            },
        }
    }, [pool, lang])

    const value = useMemo<PokemonItem | null>(
        () => (current ? { id: String(current.id), label: displayName(current, lang), auxiliaryData: { p: current } } : null),
        [current, lang],
    )

    return (
        <div className="flex min-w-0 flex-col gap-2">
            <Typeahead<PokemonItem>
                label={t('pickerLabel', { side: sideLabel })}
                isLabelHidden
                width="100%"
                searchSource={source}
                value={value}
                onChange={item => { if (item?.auxiliaryData) onPick(item.auxiliaryData.p) }}
                hasClear={false}
                hasEntriesOnFocus
                debounceMs={0}
                maxMenuItems={MAX_RESULTS}
                placeholder={current ? t('pickerPlaceholderCurrent', { name: displayName(current, lang) }) : t('pickerPlaceholder')}
                emptySearchText={tc('noResults')}
                startIcon="search"
                renderItem={item => (
                    <TypeaheadItem
                        item={item}
                        description={item.auxiliaryData ? dexNo(item.auxiliaryData.p) : undefined}
                        icon={item.auxiliaryData && (
                            <PokeImage sources={pokemonImageCandidates(item.auxiliaryData.p.id, 28, { sprite: item.auxiliaryData.p.sprite })} alt="" size={28} className="h-7 w-7" />
                        )}
                    />
                )}
            />
            <CheckboxInput size="sm" label={t('includeForms')} value={forms} onChange={setForms} />
        </div>
    )
}
