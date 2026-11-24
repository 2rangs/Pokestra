/**
 * 홈의 "이 포켓몬은 누구?" 실루엣 퀴즈.
 * - 오늘의 문제(날짜로 정해짐) → "다른 문제"로 무작위 문제.
 * - 이름(세 언어) 또는 한국어 이름의 초성을 정확히 입력하면 정답. 힌트로 타입·세대를 열 수 있다.
 * - 맞히거나 정답을 보면 실루엣이 그림으로 바뀌고 상세로 가는 버튼이 생긴다.
 * - 오늘의 문제를 맞힌 날이 이어지면 연속 정답(localStorage, 저장이 막혀도 퀴즈는 동작).
 */
import { type FormEvent, useMemo, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { HStack } from '@astryxdesign/core/HStack'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import { useLang, useT } from '../../i18n'
import { homeMessages } from '../../i18n/messages/home'
import { ALL_POKEMON, type DexPokemon, generationName, getGeneration, isAlternateForm, pokemonName } from '../../lib/dex'
import { pokemonImageCandidates } from '../../lib/images'
import { PokeImage } from '../ui/PokeImage'
import { TypeChip } from '../ui/TypeChip'
import { cx } from '../ui/utils'
import { type Streak, dailyPick, dateKey, isCorrect, liveStreak, nextStreak } from './quizModel'

const POOL: readonly DexPokemon[] = ALL_POKEMON.filter((p) => !isAlternateForm(p) && p.sprite)
const STREAK_KEY = 'pokestra-quiz-streak'

function readStreak(): Streak | null {
    try {
        const raw = localStorage.getItem(STREAK_KEY)
        return raw ? (JSON.parse(raw) as Streak) : null
    } catch {
        return null
    }
}

function writeStreak(s: Streak) {
    try {
        localStorage.setItem(STREAK_KEY, JSON.stringify(s))
    } catch {
        // 저장할 수 없어도 퀴즈는 계속된다
    }
}

type Status = 'playing' | 'wrong' | 'correct' | 'revealed'

export function SilhouetteQuiz() {
    const lang = useLang()
    const t = useT(homeMessages)
    const today = useMemo(() => dateKey(), [])
    const [p, setP] = useState<DexPokemon>(() => dailyPick(POOL, today))
    const [isDaily, setIsDaily] = useState(true)
    const [input, setInput] = useState('')
    const [status, setStatus] = useState<Status>('playing')
    const [hints, setHints] = useState({ type: false, gen: false })
    const [streak, setStreak] = useState(() => liveStreak(readStreak(), today))

    const done = status === 'correct' || status === 'revealed'
    const name = pokemonName(p, lang)

    const submit = (e: FormEvent) => {
        e.preventDefault()
        if (done || !input.trim()) return
        if (!isCorrect(p, input)) {
            setStatus('wrong')
            return
        }
        setStatus('correct')
        if (isDaily) {
            const next = nextStreak(readStreak(), today)
            writeStreak(next)
            setStreak(next.count)
        }
    }

    const another = () => {
        let next = p
        while (next.id === p.id) next = POOL[Math.floor(Math.random() * POOL.length)]
        setP(next)
        setIsDaily(false)
        setInput('')
        setStatus('playing')
        setHints({ type: false, gen: false })
    }

    return (
        <Card padding={5} className="h-full max-sm:p-4">
            <VStack gap={4} className="h-full">
                <HStack justify="center" vAlign="center" className="flex-1 rounded-xl bg-muted p-3">
                    <PokeImage
                        key={p.id}
                        sources={pokemonImageCandidates(p.id, 200, { sprite: p.sprite })}
                        alt={done ? name : t('quizSilhouette')}
                        size={200}
                        priority
                        className={cx('size-40 select-none transition-[filter] duration-500 sm:size-48', !done && 'brightness-0')}
                    />
                </HStack>
                <VStack gap={3}>
                    <VStack gap={1}>
                        <HStack gap={2} vAlign="center" justify="between" wrap="wrap">
                            <Text type="supporting" color="secondary">
                                {isDaily ? `${t('quizDaily')} · ${today}` : t('quizRandom')}
                            </Text>
                            {streak > 0 && (
                                <Text type="supporting" weight="semibold">
                                    {t('quizStreak', { n: streak })}
                                </Text>
                            )}
                        </HStack>
                        <Heading level={2} type="display-3">
                            {done ? name : t('quizTitle')}
                        </Heading>
                    </VStack>

                    {done ? (
                        <HStack gap={2} wrap="wrap">
                            <Button variant="primary" href={`/pokemon/${p.id}`} label={t('quizDetail')} />
                            <Button label={t('quizNext')} onClick={another} />
                        </HStack>
                    ) : (
                        <form onSubmit={submit}>
                            <HStack gap={2} vAlign="end">
                                <VStack className="min-w-0 flex-1">
                                    <TextInput
                                        label={t('quizInput')}
                                        isLabelHidden
                                        size="lg"
                                        width="100%"
                                        value={input}
                                        onChange={(v) => {
                                            setInput(v)
                                            if (status === 'wrong') setStatus('playing')
                                        }}
                                        placeholder={t('quizPlaceholder')}
                                        autoComplete="off"
                                    />
                                </VStack>
                                <Button type="submit" variant="primary" size="lg" label={t('quizSubmit')} />
                            </HStack>
                        </form>
                    )}

                    {/* 결과·힌트 (스크린리더가 바로 읽도록) */}
                    <VStack gap={2} aria-live="polite">
                        {status === 'wrong' && <Text color="secondary">{t('quizWrong')}</Text>}
                        {status === 'correct' && <Text weight="semibold">{t('quizCorrect', { name })}</Text>}
                        {status === 'revealed' && <Text color="secondary">{t('quizAnswer', { name })}</Text>}
                        {(hints.type || done) && (
                            <HStack gap={1.5} wrap="wrap">
                                {p.types.map((ty) => (
                                    <TypeChip key={ty} type={ty} size="sm" />
                                ))}
                            </HStack>
                        )}
                        {(hints.gen || done) && <Text color="secondary">{generationName(getGeneration(p), lang)}</Text>}
                    </VStack>

                    {!done && (
                        <HStack gap={2} wrap="wrap">
                            <Button size="sm" label={t('quizHintType')} onClick={() => setHints((h) => ({ ...h, type: true }))} isDisabled={hints.type} />
                            <Button size="sm" label={t('quizHintGen')} onClick={() => setHints((h) => ({ ...h, gen: true }))} isDisabled={hints.gen} />
                            <Button size="sm" variant="ghost" label={t('quizGiveUp')} onClick={() => setStatus('revealed')} />
                        </HStack>
                    )}
                </VStack>
            </VStack>
        </Card>
    )
}
