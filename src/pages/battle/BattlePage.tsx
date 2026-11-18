// ─── 배틀 엔진 데모 ───────────────────────────────────────────
// 팀 빌더·배틀 화면 없이, 엔진 API 로 CPU 끼리 배틀을 돌려 로그만 보여준다.
// 로그 문장은 엔진의 다국어 포매터(createFormatter)가 만든다. 직접 플레이는 엔진 CLI(npx pokebattle play).
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    BattleEngine, HeuristicAI, PRNG, createFormatter, generateRandomTeam, loadNames,
    type BattleEvent, type BattleFormat, type PlayerID,
} from '@kyasi/pokebattle-engine'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { CodeBlock } from '@astryxdesign/core/CodeBlock'
import { HStack } from '@astryxdesign/core/HStack'
import { List, ListItem } from '@astryxdesign/core/List'
import { ScrollableArea } from '@astryxdesign/core/ScrollableArea'
import { VStack } from '@astryxdesign/core/VStack'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { useEngineReady } from '../../lib/battle'
import { useDocumentTitle, useLang, useT, type Lang } from '../../i18n'
import { battleMessages } from '../../i18n/messages/battle'
import { PageTitle, SectionTitle, Spinner } from '../../components/ui/shared'

const FORMATS = ['singles', 'rotation'] as const satisfies readonly BattleFormat[]
const ENGINE_URL = 'https://github.com/2rangs/pokebattle-engine'
const newSeed = () => Math.floor(Math.random() * 1e9)

interface Run {
    engine: BattleEngine
    events: BattleEvent[]
    ms: number
}

/** 같은 시드 → 같은 팀·같은 선택 → 같은 배틀 (CLI 의 watch 와 같은 방식) */
function runBattle(seed: number, format: BattleFormat): Run {
    const start = performance.now()
    const rng = new PRNG(seed)
    const engine = new BattleEngine({
        format, seed,
        p1: { name: 'CPU 1', team: generateRandomTeam({ seed: rng.int(0x7fffffff) }) },
        p2: { name: 'CPU 2', team: generateRandomTeam({ seed: rng.int(0x7fffffff) }) },
    }, { turnSnapshots: false })
    const events: BattleEvent[] = []
    engine.on('*', ev => events.push(ev))
    const ai = { p1: new HeuristicAI({ seed: seed + 1 }), p2: new HeuristicAI({ seed: seed + 2 }) }
    engine.start()
    for (let guard = 0; !engine.battle.ended && guard < 5000; guard++) {
        for (const p of ['p1', 'p2'] as const) {
            if (!engine.battle.ended && (engine.getRequest(p) || engine.getTeamPreview(p))) engine.submitAction(ai[p].chooseAction(engine, p)!)
        }
    }
    return { engine, events, ms: Math.round(performance.now() - start) }
}

/** ko·en 이름은 엔진에 들어 있고, 그 밖의 언어는 이름 팩을 불러온다 */
function useEngineNames(lang: Lang) {
    const q = useQuery({
        queryKey: ['engine-names', lang],
        queryFn: async () => {
            if (lang !== 'ko' && lang !== 'en') await loadNames(lang)
            return true
        },
        staleTime: Infinity,
    })
    return q.data === true
}

function apiSnippet(lang: Lang, seed: number, format: BattleFormat): string {
    return `import { BattleEngine, HeuristicAI, PRNG, createFormatter, generateRandomTeam, preloadData${lang === 'ko' || lang === 'en' ? '' : ', loadNames'} } from '@kyasi/pokebattle-engine'

await preloadData()${lang === 'ko' || lang === 'en' ? '' : `\nawait loadNames('${lang}')`}
const rng = new PRNG(${seed})
const engine = new BattleEngine({
  format: '${format}', seed: ${seed},
  p1: { name: 'CPU 1', team: generateRandomTeam({ seed: rng.int(0x7fffffff) }) },
  p2: { name: 'CPU 2', team: generateRandomTeam({ seed: rng.int(0x7fffffff) }) },
})
const log = createFormatter({ locale: '${lang}', getPokemon: id => engine.getPokemon(id) })
engine.on('*', ev => { const line = log.format(ev); if (line) console.log(line) })

const ai = { p1: new HeuristicAI({ seed: ${seed + 1} }), p2: new HeuristicAI({ seed: ${seed + 2} }) }
while (!engine.battle.ended) {
  for (const p of ['p1', 'p2'] as const) {
    if (!engine.battle.ended && engine.getRequest(p)) engine.submitAction(ai[p].chooseAction(engine, p)!)
  }
}`
}

export default function BattlePage() {
    const t = useT(battleMessages)
    const lang = useLang()
    const { ready, error } = useEngineReady()
    const namesReady = useEngineNames(lang)
    const [seedText, setSeedText] = useState(() => String(newSeed()))
    const [format, setFormat] = useState<BattleFormat>('singles')
    const [run, setRun] = useState<Run | null>(null)

    useDocumentTitle(t('title'))

    const seed = Number.parseInt(seedText, 10)
    const validSeed = Number.isFinite(seed) && seed >= 0

    // 언어를 바꾸면 같은 이벤트를 새 언어로 다시 쓴다 (배틀을 다시 돌리지 않는다)
    const lines = useMemo(() => {
        if (!run || !namesReady) return []
        const fmt = createFormatter({ locale: lang, getPokemon: id => run.engine.getPokemon(id) })
        return run.events.flatMap(ev => {
            const text = fmt.format(ev)
            return text ? [{ text, turn: ev.type === 'turn_start' }] : []
        })
    }, [run, lang, namesReady])

    if (error) {
        return (
            <Banner
                role="alert"
                status="error"
                title={t('loadError')}
                description={error.message}
                endContent={<Button label={t('retry')} size="sm" onClick={() => window.location.reload()} />}
            />
        )
    }
    if (!ready) return <Spinner label={t('loadingEngine')} />

    const winner = run?.engine.getState().winner
    const winnerName = winner && winner !== 'draw' ? run!.engine.getSide(winner as PlayerID).name ?? winner : null

    return (
        <VStack gap={6}>
            <PageTitle title={t('title')} lead={t('intro')} />

            <Card>
                <HStack gap={3} wrap="wrap" align="end">
                    <TextInput
                        label={t('seed')}
                        value={seedText}
                        inputMode="numeric"
                        width={180}
                        onChange={v => setSeedText(v.replace(/[^0-9]/g, ''))}
                    />
                    <Button label={t('randomSeed')} variant="secondary" onClick={() => setSeedText(String(newSeed()))} />
                    <VStack gap={1.5}>
                        <Text type="label">{t('format')}</Text>
                        <SegmentedControl label={t('format')} value={format} onChange={v => setFormat(v as BattleFormat)}>
                            {FORMATS.map(f => <SegmentedControlItem key={f} value={f} label={t(f)} />)}
                        </SegmentedControl>
                    </VStack>
                    <Button label={t('run')} variant="primary" isDisabled={!validSeed} onClick={() => setRun(runBattle(seed, format))} />
                </HStack>
            </Card>

            <VStack gap={3}>
                <SectionTitle
                    aside={run && (
                        <Text type="supporting" color="secondary">
                            {t('summary', { turns: run.engine.battle.turn, events: run.events.length, ms: run.ms })}
                        </Text>
                    )}
                >
                    {t('logTitle')}
                </SectionTitle>
                <Card>
                    {!run ? (
                        <Text color="secondary">{t('empty')}</Text>
                    ) : (
                        <VStack gap={3}>
                            <Text type="label">{winnerName ? t('winner', { name: winnerName }) : t('draw')}</Text>
                            <ScrollableArea label={t('logTitle')} height={512}>
                                <List density="compact" edge="flush">
                                    {lines.map((l, i) => (
                                        <ListItem key={i} label={<Text type={l.turn ? 'label' : 'body'}>{l.text}</Text>} />
                                    ))}
                                </List>
                            </ScrollableArea>
                        </VStack>
                    )}
                </Card>
            </VStack>

            <VStack gap={3}>
                <SectionTitle>{t('apiTitle')}</SectionTitle>
                <CodeBlock code={apiSnippet(lang, validSeed ? seed : 0, format)} language="ts" />
            </VStack>

            <VStack gap={3}>
                <SectionTitle>{t('cliTitle')}</SectionTitle>
                <Text color="secondary">{t('cliLead')}</Text>
                <CodeBlock
                    language="bash"
                    code={[
                        `npx pokebattle play --lang ${lang}`,
                        `npx pokebattle watch --lang ${lang} --seed ${validSeed ? seed : 42}${format === 'rotation' ? ' --format rotation' : ''}`,
                        'npx pokebattle sim --battles 500 --json',
                    ].join('\n')}
                />
                <HStack>
                    <Button label={t('docs')} variant="secondary" href={ENGINE_URL} target="_blank" />
                </HStack>
            </VStack>
        </VStack>
    )
}
