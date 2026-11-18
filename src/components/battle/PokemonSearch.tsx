import { useMemo } from 'react'
import { Typeahead, TypeaheadItem, type SearchableItem, type SearchSource } from '@astryxdesign/core/Typeahead'
import { displayName, searchKey, type DexPokemon } from '../../lib/dex'
import { battleReadyPokemon, typeNameL } from '../../lib/battle'
import { pokemonImageCandidates } from '../../lib/images'
import { PokeImage } from '../ui/PokeImage'
import { useLang, useT } from '../../i18n'
import { battleMessages } from '../../i18n/messages/battle'
import { commonMessages } from '../../i18n/messages/common'

interface Props {
    onPick: (p: DexPokemon) => void
    placeholder?: string
    includeForms?: boolean
    autoFocus?: boolean
}

type Hit = SearchableItem<DexPokemon>

const norm = (s: string) => s.toLowerCase().replace(/[\s\-_.'’:]/g, '')

/** 배틀 가능한 포켓몬 검색 (한국어/영어/일본어/번호). 고르면 입력칸은 비워진다 */
export function PokemonSearch({ onPick, placeholder, includeForms = true, autoFocus }: Props) {
    const lang = useLang()
    const t = useT(battleMessages)
    const tc = useT(commonMessages)
    const pool = useMemo(
        () => battleReadyPokemon(includeForms).map(p => ({ p, key: norm(searchKey(p)) })),
        [includeForms],
    )

    const source = useMemo<SearchSource<Hit>>(() => {
        const toHit = (p: DexPokemon): Hit => ({ id: String(p.id), label: displayName(p, lang), auxiliaryData: p })
        return {
            bootstrap: () => [],
            search: (query: string) => {
                const q = norm(query.trim())
                if (!q) return []
                const num = Number(q.replace('#', ''))
                if (Number.isFinite(num) && num > 0) return pool.filter(x => x.p.id === num).slice(0, 10).map(x => toHit(x.p))
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
                return [...starts, ...contains].slice(0, 10).map(toHit)
            },
        }
    }, [pool, lang])

    return (
        <Typeahead<Hit>
            label={t('searchLabel')}
            isLabelHidden
            placeholder={placeholder ?? t('searchPlaceholder')}
            searchSource={source}
            value={null}
            onChange={item => { if (item?.auxiliaryData) onPick(item.auxiliaryData) }}
            hasClear={false}
            hasAutoFocus={autoFocus}
            debounceMs={0}
            width="100%"
            emptySearchText={tc('noResults')}
            renderItem={item => {
                const p = item.auxiliaryData!
                return (
                    <TypeaheadItem
                        item={item}
                        icon={<PokeImage sources={pokemonImageCandidates(p.id, 32, { sprite: p.sprite })} alt="" size={32} className="h-8 w-8" />}
                        description={`#${p.id}, ${p.types.map(ty => typeNameL(ty, lang)).join(' / ')}`}
                    />
                )
            }}
        />
    )
}
