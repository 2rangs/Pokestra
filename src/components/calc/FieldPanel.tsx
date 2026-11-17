import type { Terrain, Weather } from '@kyasi/pokebattle-engine'
import { useT } from '../../i18n'
import { calcMessages } from '../../i18n/messages/calc'
import { DEFAULT_FIELD, TERRAIN_IDS, WEATHER_IDS, type FieldState } from './calcState'
import { FieldLabel, Toggle, inputCls } from './ui'

export function FieldPanel({ field, onChange }: { field: FieldState; onChange: (f: FieldState) => void }) {
    const t = useT(calcMessages)
    const set = <K extends keyof FieldState>(k: K, v: FieldState[K]) => onChange({ ...field, [k]: v })
    const dirty = (Object.keys(DEFAULT_FIELD) as (keyof FieldState)[]).some(k => field[k] !== DEFAULT_FIELD[k])

    return (
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4" aria-labelledby="calc-field-title">
            <div className="mb-3 flex items-center justify-between gap-2">
                <h2 id="calc-field-title" className="text-sm font-bold text-slate-800">{t('fieldTitle')}</h2>
                {dirty && (
                    <button
                        type="button" onClick={() => onChange(DEFAULT_FIELD)}
                        className="rounded-md px-2 py-0.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    >
                        {t('resetField')}
                    </button>
                )}
            </div>
            <div className="grid grid-cols-2 gap-2">
                <FieldLabel label={t('weather')}>
                    <select className={inputCls} value={field.weather ?? ''} onChange={e => set('weather', (e.target.value || null) as Weather)}>
                        <option value="">{t('none')}</option>
                        {WEATHER_IDS.map(id => <option key={id} value={id}>{t(`weather_${id}`)}</option>)}
                    </select>
                </FieldLabel>
                <FieldLabel label={t('terrain')}>
                    <select className={inputCls} value={field.terrain ?? ''} onChange={e => set('terrain', (e.target.value || null) as Terrain)}>
                        <option value="">{t('none')}</option>
                        {TERRAIN_IDS.map(id => <option key={id} value={id}>{t(`terrain_${id}`)}</option>)}
                    </select>
                </FieldLabel>
            </div>
            <fieldset className="mt-3">
                <legend className="text-[11px] font-semibold text-slate-500">{t('screens')}</legend>
                <div className="mt-1 flex flex-wrap gap-1.5">
                    <Toggle label={t('reflect')} checked={field.reflect} onChange={v => set('reflect', v)} />
                    <Toggle label={t('lightScreen')} checked={field.lightScreen} onChange={v => set('lightScreen', v)} />
                    <Toggle label={t('auroraVeil')} checked={field.auroraVeil} onChange={v => set('auroraVeil', v)} />
                </div>
            </fieldset>
            <fieldset className="mt-3">
                <legend className="text-[11px] font-semibold text-slate-500">{t('other')}</legend>
                <div className="mt-1 flex flex-wrap gap-1.5">
                    <Toggle label={t('crit')} checked={field.crit} onChange={v => set('crit', v)} />
                    <Toggle label={t('gravity')} checked={field.gravity} onChange={v => set('gravity', v)} />
                </div>
            </fieldset>
        </section>
    )
}
