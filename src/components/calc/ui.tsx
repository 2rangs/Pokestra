import type { ReactNode } from 'react'
import { typeNameKo } from '../../lib/battle'

export const inputCls =
    'w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 ' +
    'focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100 disabled:bg-slate-50 disabled:text-slate-400'

export function FieldLabel({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
    return (
        <label className={`flex min-w-0 flex-col gap-1 ${className}`}>
            <span className="text-[11px] font-semibold tracking-wide text-slate-500">{label}</span>
            {children}
        </label>
    )
}

export function TypeChip({ type, small = false }: { type: string; small?: boolean }) {
    return (
        <span
            className={`${type} inline-flex shrink-0 items-center gap-1 rounded-md font-bold leading-none text-white ${small ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'}`}
            style={type === 'stellar' ? { background: '#7c6cf0' } : undefined}
        >
            {type !== 'stellar' && (
                <img
                    src={`${import.meta.env.BASE_URL}assets/types/${type}.svg`}
                    alt=""
                    className={small ? 'h-3 w-3' : 'h-4 w-4'}
                />
            )}
            {typeNameKo(type)}
        </span>
    )
}

const CATEGORY_KO: Record<string, string> = { physical: '물리', special: '특수', status: '변화' }

export function CategoryBadge({ category }: { category: string }) {
    const cls = category === 'physical'
        ? 'bg-orange-100 text-orange-700'
        : category === 'special' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
    return <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${cls}`}>{CATEGORY_KO[category] ?? category}</span>
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label
            className={`inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                checked ? 'border-red-500 bg-red-500 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
        >
            <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
            {label}
        </label>
    )
}
