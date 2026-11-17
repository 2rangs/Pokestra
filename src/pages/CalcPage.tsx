import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Banner } from '@astryxdesign/core/Banner'
import { Icon } from '@astryxdesign/core/Icon'
import { IconButton } from '@astryxdesign/core/IconButton'
import { VStack } from '@astryxdesign/core/VStack'
import { battleReadyPokemon, useEngineReady } from '../lib/battle'
import { findDexPokemonByName, type DexPokemon } from '../lib/dex'
import {
    DEFAULT_FIELD, calcMove, damagingLearnset, initSide, initSideBySlug, toBattlePokemon,
    type FieldState, type MoveCalc, type SideState,
} from '../components/calc/calcState'
import { SidePanel } from '../components/calc/SidePanel'
import { MoveResults } from '../components/calc/MoveResults'
import { FieldPanel } from '../components/calc/FieldPanel'
import { useDocumentTitle, useT } from '../i18n'
import { PageTitle, Spinner } from '../components/ui/shared'
import { calcMessages } from '../i18n/messages/calc'

export default function CalcPage() {
    const { ready, error } = useEngineReady()
    const t = useT(calcMessages)
    useDocumentTitle(t('title'))
    return (
        <VStack gap={2}>
            <PageTitle title={t('title')} lead={t('subtitle')} />
            {error ? (
                <Banner status="error" title={t('loadError', { msg: error.message })} />
            ) : !ready ? (
                <Spinner label={t('loadingData')} className="py-24" />
            ) : (
                <Calculator />
            )}
        </VStack>
    )
}

function fallbackSide(): SideState {
    return initSide(battleReadyPokemon()[0])
}

function Calculator() {
    const t = useT(calcMessages)
    const [params, setParams] = useSearchParams()
    const [atk, setAtk] = useState<SideState>(() => initSideBySlug(params.get('atk'), 'garchomp') ?? fallbackSide())
    const [def, setDef] = useState<SideState>(() => initSideBySlug(params.get('def'), 'gholdengo') ?? fallbackSide())
    const [field, setField] = useState<FieldState>(DEFAULT_FIELD)

    const syncUrl = (a: SideState, d: SideState) =>
        setParams(prev => {
            const next = new URLSearchParams(prev)
            next.set('atk', a.slug)
            next.set('def', d.slug)
            return next
        }, { replace: true })

    const atkBp = useMemo(() => toBattlePokemon(atk, 'calc-atk'), [atk])
    const defBp = useMemo(() => toBattlePokemon(def, 'calc-def'), [def])

    const pool = useMemo(() => {
        const p = findDexPokemonByName(atk.slug)
        return p ? damagingLearnset(p) : []
    }, [atk.slug])

    const results = useMemo<(MoveCalc | null)[]>(() => [0, 1, 2, 3].map(i => {
        const slug = atk.moves[i]
        if (!slug) return null
        try {
            return calcMove(atk, def, slug, field)
        } catch {
            return null
        }
    }), [atk, def, field])

    const pickAtk = (p: DexPokemon) => {
        const next = initSide(p, atk.level)
        setAtk(next)
        syncUrl(next, def)
    }
    const pickDef = (p: DexPokemon) => {
        const next = initSide(p, def.level, def.hpPct)
        setDef(next)
        syncUrl(atk, next)
    }
    const swap = () => {
        setAtk(def)
        setDef(atk)
        syncUrl(def, atk)
    }
    const changeMove = (i: number, slug: string) => {
        const moves = [...atk.moves]
        while (moves.length < i) moves.push('')
        moves[i] = slug
        setAtk({ ...atk, moves })
    }

    return (
        <VStack gap={4}>
            <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                <SidePanel role="atk" state={atk} bp={atkBp} onChange={setAtk} onPick={pickAtk} />
                <div className="flex justify-center lg:pt-24">
                    <IconButton
                        label={t('swapTitle')} tooltip={t('swap')} variant="secondary" onClick={swap}
                        icon={<Icon icon="arrowsUpDown" className="lg:rotate-90" />}
                    />
                </div>
                <SidePanel role="def" state={def} bp={defBp} onChange={setDef} onPick={pickDef} />
            </div>

            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <MoveResults
                    attacker={atk.slug} defender={def.slug}
                    moves={atk.moves} pool={pool} results={results} defenderHp={defBp.hp}
                    onChangeMove={changeMove}
                />
                <FieldPanel field={field} onChange={setField} />
            </div>
        </VStack>
    )
}
