// 개발용 미리보기 (앱 빌드에 들어가지 않음): 18 타입 배지, 배수 칩, 박스 아이콘, 타입 색 유틸리티를 라이트/다크로.
import '../../src/styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Theme } from '@astryxdesign/core/theme'
import { Card } from '@astryxdesign/core/Card'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { themes, defaultThemeSlug } from '../../src/astryx-themes'
import { MultiplierChip, TypeChip } from '../../src/components/ui/TypeChip'
import { THEMED_TYPES } from '../../src/components/ui/typeChipModel'
import { PokeImage } from '../../src/components/ui/PokeImage'
import { pokemonImageCandidates } from '../../src/lib/images'
import { TYPE_COLOR_CLASSES } from '../../src/lib/typeColorClasses'

const mode = new URLSearchParams(location.search).get('mode') === 'dark' ? 'dark' : 'light'
// 25 피카츄, 6 리자몽, 445 한카리아스, 906 나오하, 1025 복숭악동, 10034 메가리자몽X(7세대 아이콘만)
const ICON_IDS = [25, 6, 445, 906, 1025, 10034]
const MULTIPLIERS = [4, 2, 1, 0.5, 0.25, 0]
const SAMPLE_TYPES = ['ground', 'rock', 'water', 'grass', 'ice', 'ghost']

// eslint-disable-next-line react-refresh/only-export-components -- 진입 파일(내보낼 것 없음)
function Preview() {
    return (
        <VStack gap={6} padding={6} className="min-h-screen bg-body">
            <Heading level={1}>비주얼 기반 · {mode}</Heading>

            <VStack gap={3}>
                <Heading level={2}>TypeChip md / sm / 아이콘만</Heading>
                <HStack gap={1.5} wrap="wrap">
                    {THEMED_TYPES.map((t) => <TypeChip key={t} type={t} />)}
                    <TypeChip type="typeless" />
                </HStack>
                <HStack gap={1} wrap="wrap">
                    {THEMED_TYPES.map((t) => <TypeChip key={t} type={t} size="sm" />)}
                </HStack>
                <HStack gap={1} wrap="wrap">
                    {THEMED_TYPES.map((t) => <TypeChip key={t} type={t} size="sm" iconOnly />)}
                </HStack>
            </VStack>

            <VStack gap={3}>
                <Heading level={2}>MultiplierChip (받는 쪽 / 때리는 쪽)</Heading>
                <HStack gap={1.5} wrap="wrap" vAlign="center">
                    {MULTIPLIERS.map((m, i) => <MultiplierChip key={m} multiplier={m} type={SAMPLE_TYPES[i]} />)}
                    <Text type="supporting">타입 없음:</Text>
                    {MULTIPLIERS.map((m) => <MultiplierChip key={m} multiplier={m} />)}
                </HStack>
                <HStack gap={1.5} wrap="wrap" vAlign="center">
                    {MULTIPLIERS.map((m, i) => <MultiplierChip key={m} multiplier={m} type={SAMPLE_TYPES[i]} perspective="attack" size="md" />)}
                </HStack>
            </VStack>

            <VStack gap={3}>
                <Heading level={2}>박스 아이콘 (≤40px) vs 도트 (64px)</Heading>
                <HStack gap={4} wrap="wrap" vAlign="end">
                    {ICON_IDS.map((id) => (
                        <VStack key={id} gap={1} vAlign="center">
                            <HStack gap={2} vAlign="end">
                                <PokeImage sources={pokemonImageCandidates(id, 40)} alt={`#${id} 박스 아이콘`} size={40} />
                                <PokeImage sources={pokemonImageCandidates(id, 24)} alt={`#${id} 24px`} size={24} />
                                <PokeImage sources={pokemonImageCandidates(id, 64)} alt={`#${id} 도트`} size={64} />
                            </HStack>
                            <Text type="supporting">#{id}</Text>
                        </VStack>
                    ))}
                </HStack>
            </VStack>

            <VStack gap={3}>
                <Heading level={2}>타입 색 유틸리티 (subtle 면 · border · text)</Heading>
                <HStack gap={2} wrap="wrap">
                    {THEMED_TYPES.map((t) => {
                        const c = TYPE_COLOR_CLASSES[t]
                        return (
                            <Card key={t} padding={2} className={`${c.subtle} border ${c.border}`}>
                                <VStack gap={0.5}>
                                    <Text weight="semibold" className={c.text}>{t}</Text>
                                    <Text type="supporting">본문 글자</Text>
                                </VStack>
                            </Card>
                        )
                    })}
                </HStack>
            </VStack>
        </VStack>
    )
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <Theme theme={themes[defaultThemeSlug]} mode={mode}>
            <Preview />
        </Theme>
    </StrictMode>,
)
