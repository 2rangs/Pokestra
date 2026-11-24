import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden'
import { useLang } from '../../i18n'
import { GAME_BADGES } from '../../lib/gameColorClasses'
import { versionName } from '../../lib/gameNames'
import { cx } from './utils'

/**
 * 작품 배지: 작품 고유 색 + 약칭(R, B, Ru, Sw …). 위키의 버전 표기처럼 작품을 색으로 바로 알아보게 한다.
 * 공식 로고는 쓰지 않는다(출처·저작권). 이름은 옆에 글자로 함께 쓰고, 스크린리더는 이름을 읽는다.
 */
export function GameBadge({ version, className }: { version: string; className?: string }) {
    const lang = useLang()
    const b = GAME_BADGES[version]
    const name = versionName(version, lang)
    return (
        <HStack
            as="span"
            justify="center"
            vAlign="center"
            className={cx('h-5 min-w-6 shrink-0 rounded px-1', b?.cls ?? 'bg-muted text-primary', className)}
        >
            <Text type="supporting" weight="bold" color="inherit" hasTabularNumbers className="text-[11px] leading-none">
                {b?.abbr ?? name.slice(0, 2)}
            </Text>
            <VisuallyHidden>{name}</VisuallyHidden>
        </HStack>
    )
}

/** 여러 작품 배지 한 줄 */
export function GameBadges({ versions }: { versions: readonly string[] }) {
    return (
        <HStack as="span" gap={0.5} vAlign="center" wrap="wrap" aria-hidden>
            {versions.map((v) => (
                <GameBadge key={v} version={v} />
            ))}
        </HStack>
    )
}
