import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { battleReadyPokemon, useEngineReady } from '../lib/battle'
import { findDexPokemonByName, type DexPokemon } from '../lib/dex'
import {
    DEFAULT_FIELD, calcMove, damagingLearnset, initSide, initSideBySlug, toBattlePokemon,
    type FieldState, type MoveCalc, type SideState,
} from '../components/calc/calcState'
import { SidePanel } from '../components/calc/SidePanel'
import { MoveResults } from '../components/calc/MoveResults'
import { FieldPanel } from '../components/calc/FieldPanel'

export default function CalcPage() {
    const { ready, error } = useEngineReady()
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-8">
                <header className="mb-4 sm:mb-6">
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">데미지 계산기</h1>
                    <p className="mt-1 text-sm text-slate-500">9세대 배틀 엔진 기준 · 난수 16단계 데미지와 확정/난수 타수를 계산합니다.</p>
                </header>
                {error ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                        배틀 데이터를 불러오지 못했습니다: {error.message}
                    </div>
                ) : !ready ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-24 text-sm text-slate-500">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-red-500" />
                        배틀 데이터 불러오는 중…
                    </div>
                ) : (
                    <Calculator />
                )}
            </div>
        </div>
    )
}

function fallbackSide(): SideState {
    return initSide(battleReadyPokemon()[0])
}

function Calculator() {
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
            return calcMove(atkBp, defBp, slug, field)
        } catch {
            return null
        }
    }), [atk.moves, atkBp, defBp, field])

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
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                <SidePanel role="atk" state={atk} bp={atkBp} onChange={setAtk} onPick={pickAtk} />
                <div className="flex justify-center lg:pt-24">
                    <button
                        type="button" onClick={swap}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-red-300 hover:text-red-600"
                        title="공격 측과 방어 측 바꾸기"
                    >
                        <span className="lg:hidden">⇅</span><span className="hidden lg:inline">⇄</span> 공격↔방어
                    </button>
                </div>
                <SidePanel role="def" state={def} bp={defBp} onChange={setDef} onPick={pickDef} />
            </div>

            <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <MoveResults
                    moves={atk.moves} pool={pool} results={results} defenderHp={defBp.hp}
                    onChangeMove={changeMove}
                />
                <FieldPanel field={field} onChange={setField} />
            </div>
        </div>
    )
}
