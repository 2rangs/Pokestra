// ─── 필드 줄: N턴 + 날씨·필드·진영 효과 (남은 턴) ─────────────────
import type { PlayerID } from '@kyasi/pokebattle-engine'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { Token } from '@astryxdesign/core/Token'
import { fieldConditionName, sideConditionName, terrainName, weatherName } from '../../../lib/battleLog'
import { fieldItems, type FieldItem, type FieldItemKind } from '../../../lib/battleHud'
import { useLang, type Lang } from '../../../i18n'
import type { Frame } from '../useBattleSession'
import { TipChip } from './common'
import { useBattleT, type TokenColor } from './util'

const KIND_COLOR: Record<FieldItemKind, TokenColor> = {
    weather: 'blue', terrain: 'green', field: 'pink', side: 'orange',
}

function itemName(it: FieldItem, lang: Lang): string {
    switch (it.kind) {
        case 'weather': return weatherName(it.id, lang)
        case 'terrain': return terrainName(it.id, lang)
        case 'field': return fieldConditionName(it.id, lang)
        case 'side': return sideConditionName(it.id, lang)
    }
}

export function FieldBar({ frame, sideName }: {
    frame: Frame
    /** 관전 모드: 진영 이름 (없으면 우리/상대) */
    sideName?: (p: PlayerID) => string
}) {
    const lang = useLang()
    const t = useBattleT()
    const items = fieldItems(frame)
    const owner = (p: PlayerID) => sideName ? sideName(p) : p === 'p1' ? t('sideOurs') : t('sideFoe')
    return (
        <HStack gap={2} vAlign="center" wrap="wrap" className="min-w-0">
            <Heading level={2}>{t('turn', { n: frame.turn })}</Heading>
            {items.map(it => {
                const label = [
                    itemName(it, lang),
                    it.side && `(${owner(it.side)})`,
                    it.layers > 1 && `×${it.layers}`,
                ].filter(Boolean).join(' ')
                if (it.turns === null) return <Token key={it.key} size="sm" color={KIND_COLOR[it.kind]} label={label} />
                const tip = t(it.turns === 1 ? 'turnsLeftOne' : 'turnsLeft', { n: it.turns })
                return (
                    <TipChip key={it.key} tip={tip}>
                        <Token
                            size="sm"
                            color={KIND_COLOR[it.kind]}
                            label={label}
                            description={tip}
                            endContent={<Text type="supporting" color="inherit" weight="semibold" hasTabularNumbers>{it.turns}</Text>}
                        />
                    </TipChip>
                )
            })}
        </HStack>
    )
}
