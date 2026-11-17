import type { Terrain, Weather } from '@kyasi/pokebattle-engine'
import { TERRAIN_OPTIONS, WEATHER_OPTIONS, type FieldState } from './calcState'
import { FieldLabel, Toggle, inputCls } from './ui'

export function FieldPanel({ field, onChange }: { field: FieldState; onChange: (f: FieldState) => void }) {
    const set = <K extends keyof FieldState>(k: K, v: FieldState[K]) => onChange({ ...field, [k]: v })
    return (
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <h2 className="mb-3 text-sm font-bold text-slate-800">필드 조건</h2>
            <div className="grid grid-cols-2 gap-2">
                <FieldLabel label="날씨">
                    <select className={inputCls} value={field.weather ?? ''} onChange={e => set('weather', (e.target.value || null) as Weather)}>
                        {WEATHER_OPTIONS.map(o => <option key={o.id ?? 'none'} value={o.id ?? ''}>{o.ko}</option>)}
                    </select>
                </FieldLabel>
                <FieldLabel label="필드">
                    <select className={inputCls} value={field.terrain ?? ''} onChange={e => set('terrain', (e.target.value || null) as Terrain)}>
                        {TERRAIN_OPTIONS.map(o => <option key={o.id ?? 'none'} value={o.id ?? ''}>{o.ko}</option>)}
                    </select>
                </FieldLabel>
            </div>
            <div className="mt-3 text-[11px] font-semibold text-slate-500">방어 측 벽</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
                <Toggle label="리플렉터" checked={field.reflect} onChange={v => set('reflect', v)} />
                <Toggle label="빛의장막" checked={field.lightScreen} onChange={v => set('lightScreen', v)} />
                <Toggle label="오로라베일" checked={field.auroraVeil} onChange={v => set('auroraVeil', v)} />
            </div>
            <div className="mt-3 text-[11px] font-semibold text-slate-500">기타</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
                <Toggle label="급소" checked={field.crit} onChange={v => set('crit', v)} />
                <Toggle label="중력" checked={field.gravity} onChange={v => set('gravity', v)} />
            </div>
        </section>
    )
}
