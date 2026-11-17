import type { Terrain, Weather } from '@kyasi/pokebattle-engine'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Selector } from '@astryxdesign/core/Selector'
import { Switch } from '@astryxdesign/core/Switch'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { useT } from '../../i18n'
import { calcMessages } from '../../i18n/messages/calc'
import { SectionTitle } from '../ui/shared'
import { DEFAULT_FIELD, TERRAIN_IDS, WEATHER_IDS, type FieldState } from './calcState'

const NONE = 'none'

export function FieldPanel({ field, onChange }: { field: FieldState; onChange: (f: FieldState) => void }) {
    const t = useT(calcMessages)
    const set = <K extends keyof FieldState>(k: K, v: FieldState[K]) => onChange({ ...field, [k]: v })
    const dirty = (Object.keys(DEFAULT_FIELD) as (keyof FieldState)[]).some(k => field[k] !== DEFAULT_FIELD[k])

    const weatherOptions = [{ value: NONE, label: t('none') }, ...WEATHER_IDS.map(id => ({ value: id, label: t(`weather_${id}`) }))]
    const terrainOptions = [{ value: NONE, label: t('none') }, ...TERRAIN_IDS.map(id => ({ value: id, label: t(`terrain_${id}`) }))]

    return (
        <Card role="region" aria-labelledby="calc-field-title" className="min-w-0">
            <SectionTitle
                id="calc-field-title"
                aside={dirty ? <Button size="sm" variant="ghost" label={t('resetField')} onClick={() => onChange(DEFAULT_FIELD)} /> : undefined}
            >
                {t('fieldTitle')}
            </SectionTitle>
            <VStack gap={4}>
                <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-1">
                    <Selector
                        label={t('weather')} width="100%" options={weatherOptions}
                        value={field.weather ?? NONE}
                        onChange={v => set('weather', (v === NONE ? null : v) as Weather)}
                    />
                    <Selector
                        label={t('terrain')} width="100%" options={terrainOptions}
                        value={field.terrain ?? NONE}
                        onChange={v => set('terrain', (v === NONE ? null : v) as Terrain)}
                    />
                </div>
                <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
                    <legend className="mb-2 p-0"><Text type="label">{t('screens')}</Text></legend>
                    <Switch size="sm" label={t('reflect')} value={field.reflect} onChange={v => set('reflect', v)} />
                    <Switch size="sm" label={t('lightScreen')} value={field.lightScreen} onChange={v => set('lightScreen', v)} />
                    <Switch size="sm" label={t('auroraVeil')} value={field.auroraVeil} onChange={v => set('auroraVeil', v)} />
                </fieldset>
                <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
                    <legend className="mb-2 p-0"><Text type="label">{t('other')}</Text></legend>
                    <Switch size="sm" label={t('crit')} value={field.crit} onChange={v => set('crit', v)} />
                    <Switch size="sm" label={t('gravity')} value={field.gravity} onChange={v => set('gravity', v)} />
                </fieldset>
            </VStack>
        </Card>
    )
}
