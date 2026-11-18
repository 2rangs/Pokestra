import { useState, type ReactNode } from 'react'
import type { BattleConfig, PokemonSet } from '@kyasi/pokebattle-engine'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Grid } from '@astryxdesign/core/Grid'
import { HStack } from '@astryxdesign/core/HStack'
import { VStack } from '@astryxdesign/core/VStack'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { Text } from '@astryxdesign/core/Text'
import { useEngineReady, buildRandomTeam, dexIdOf } from '../../lib/battle'
import { pokemonImageCandidates } from '../../lib/images'
import { PokeImage } from '../../components/ui/PokeImage'
import { pokemonLabel } from '../../lib/battleLog'
import { useBattleStore, type BattleMode } from '../../stores/battleStore'
import { useDocumentTitle, useLang, useT } from '../../i18n'
import { battleMessages } from '../../i18n/messages/battle'
import { PageSkeleton, PageTitle, SectionTitle } from '../../components/ui/shared'
import { TeamBuilder } from './TeamBuilder'
import { BattleView } from './BattleView'
import { useBattleSession, type Difficulty } from './useBattleSession'
import { engineSideNames } from './frames'

const DIFFICULTIES = [
    { id: 'easy', label: 'diffEasy', desc: 'diffEasyDesc' },
    { id: 'normal', label: 'diffNormal', desc: 'diffNormalDesc' },
    { id: 'hard', label: 'diffHard', desc: 'diffHardDesc' },
] as const satisfies readonly { id: Difficulty; label: string; desc: string }[]

const MODES = [
    { id: 'vs-cpu', label: 'modeVsCpu' },
    { id: 'cpu-vs-cpu', label: 'modeSpectate' },
] as const satisfies readonly { id: BattleMode; label: string }[]

const SIZES = [1, 3, 6] as const

const newSeed = () => Math.floor(Math.random() * 1e9)

/** 상대 팀 미리보기: 작은 그림 + 이름 */
function TeamStrip({ team }: { team: PokemonSet[] }) {
    const lang = useLang()
    return (
        <ul className="flex flex-wrap gap-2">
            {team.map((s, i) => {
                const id = dexIdOf(s.species)
                const name = pokemonLabel(s.species, s.nickname, lang)
                return (
                    <li key={i} title={name} className="flex items-center gap-1.5 rounded-md border border-border bg-surface py-0.5 pr-2.5 pl-1">
                        <span className="flex h-8 w-8 items-center justify-center">
                            {id && <PokeImage sources={pokemonImageCandidates(id, 32)} alt="" size={32} className="h-8 w-8" />}
                        </span>
                        <span className="sr-only sm:not-sr-only"><Text type="supporting">{name}</Text></span>
                    </li>
                )
            })}
        </ul>
    )
}

/** 보이는 이름표 + 컨트롤 (SegmentedControl 의 label 은 화면에 그려지지 않는다) */
function Setting({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    return (
        <VStack gap={1.5} className="min-w-0">
            <Text type="label">{label}</Text>
            {children}
            {hint && <Text type="supporting" color="secondary">{hint}</Text>}
        </VStack>
    )
}

export default function BattlePage() {
    const t = useT(battleMessages)
    const { ready, error } = useEngineReady()
    const store = useBattleStore()
    const session = useBattleSession()
    const [inBattle, setInBattle] = useState(false)
    const [lastConfig, setLastConfig] = useState<BattleConfig | null>(null)

    useDocumentTitle(t('title'))

    if (error) {
        return (
            <span role="alert" className="block">
                <Banner
                    status="error"
                    title={t('loadError')}
                    description={error.message}
                    endContent={<Button label={t('retry')} size="sm" onClick={() => window.location.reload()} />}
                />
            </span>
        )
    }
    if (!ready) return <PageSkeleton label={t('loadingEngine')} heights={[112, 320, 320]} />

    const size = store.teamSize
    const myTeam = store.myTeam.slice(0, size)
    const foeTeam = store.foeTeam.length ? store.foeTeam.slice(0, size) : []
    const spectate = store.mode === 'cpu-vs-cpu'

    const rerollFoe = () => {
        const seed = newSeed()
        store.setFoeTeam(buildRandomTeam(seed, 6), seed)
    }
    const randomMine = () => store.setMyTeam(buildRandomTeam(newSeed(), 6))

    const begin = (config?: BattleConfig) => {
        let foe = foeTeam
        if (foe.length === 0) {
            const seed = newSeed()
            const team = buildRandomTeam(seed, 6)
            store.setFoeTeam(team, seed)
            foe = team.slice(0, size)
        }
        const p1 = spectate ? store.difficulty : 'human'
        const p2 = store.difficulty
        // 진영 이름은 화면에서 현재 언어로 다시 정하므로 여기서는 고정 식별자만 둔다 (리플레이와 같은 이름)
        const names = engineSideNames(p1, p2)
        const cfg: BattleConfig = config ?? {
            format: 'singles',
            seed: newSeed(),
            p1: { name: names.p1, team: myTeam },
            p2: { name: names.p2, team: foe },
        }
        setLastConfig(cfg)
        session.start(cfg, { p1, p2, speed: store.speed })
        setInBattle(true)
        window.scrollTo({ top: 0 })
    }

    if (inBattle && session.current) {
        return (
            <BattleView
                session={session}
                onExit={() => setInBattle(false)}
                onRematch={() => lastConfig && begin({ ...lastConfig, seed: newSeed() })}
            />
        )
    }

    const canStart = myTeam.length > 0
    const diff = DIFFICULTIES.find(d => d.id === store.difficulty) ?? DIFFICULTIES[1]

    return (
        <VStack gap={8}>
            <PageTitle title={t('title')} lead={t('intro')} className="mb-0" />

            <Card padding={4}>
                <Grid columns={{ minWidth: 220 }} gap={4}>
                    <Setting label={t('mode')}>
                        <SegmentedControl label={t('mode')} layout="fill" value={store.mode} onChange={v => store.setMode(v as BattleMode)}>
                            {MODES.map(m => <SegmentedControlItem key={m.id} value={m.id} label={t(m.label)} />)}
                        </SegmentedControl>
                    </Setting>
                    <Setting label={t('difficulty')} hint={t(diff.desc)}>
                        <SegmentedControl label={t('difficulty')} layout="fill" value={store.difficulty} onChange={v => store.setDifficulty(v as Difficulty)}>
                            {DIFFICULTIES.map(d => <SegmentedControlItem key={d.id} value={d.id} label={t(d.label)} />)}
                        </SegmentedControl>
                    </Setting>
                    <Setting label={t('teamSize')}>
                        <SegmentedControl label={t('teamSize')} layout="fill" value={String(size)} onChange={v => store.setTeamSize(Number(v))}>
                            {SIZES.map(n => <SegmentedControlItem key={n} value={String(n)} label={t('sizeOption', { n })} />)}
                        </SegmentedControl>
                    </Setting>
                </Grid>
            </Card>

            <section aria-labelledby="battle-my-team">
                <SectionTitle
                    id="battle-my-team"
                    aside={store.myTeam.length > size ? t('onlyFirstN', { n: size }) : undefined}
                >
                    {spectate ? t('cpuTeam', { name: t('cpu1') }) : t('myTeam')}
                </SectionTitle>
                <TeamBuilder team={store.myTeam} onChange={store.setMyTeam} onRandom={randomMine} activeCount={size} />
            </section>

            <section aria-labelledby="battle-foe-team">
                <SectionTitle
                    id="battle-foe-team"
                    aside={<Button size="sm" label={t('rerollFoe')} onClick={rerollFoe} />}
                >
                    {spectate ? t('cpuTeam', { name: t('cpu2') }) : t('foeTeam')}
                </SectionTitle>
                {foeTeam.length > 0
                    ? <TeamStrip team={foeTeam} />
                    : <Text as="p" color="secondary">{t('foeRandomHint')}</Text>}
            </section>

            <div className="sticky bottom-3 z-20">
                <Card padding={3} elevation="med">
                    <HStack gap={3} vAlign="center" hAlign="end" wrap="wrap">
                        <Button
                            variant="primary"
                            size="lg"
                            label={canStart ? (spectate ? t('startSpectate') : t('startBattle')) : t('addPokemonFirst')}
                            isDisabled={!canStart}
                            onClick={() => canStart && begin()}
                        />
                    </HStack>
                </Card>
            </div>
        </VStack>
    )
}
