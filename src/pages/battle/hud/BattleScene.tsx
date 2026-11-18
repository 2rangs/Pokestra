// ─── 배틀 필드 (게임 화면처럼) ───────────────────────────────
// 하늘→땅 그라데이션 위에 타원 플랫폼 두 개: 상대는 위·오른쪽(앞모습), 우리는 아래·왼쪽(뒷모습).
// HUD 는 장면 위에 겹친다 (상대: 왼쪽 위, 우리: 오른쪽 아래). 색은 전부 테마 토큰이라 라이트·다크 모두 따라간다.
// 프레임만 받는다 (리플레이 화면에서도 같은 장면을 쓴다).
import type { ReactNode } from 'react'
import { cx } from '../../../components/ui/utils'
import type { Frame } from '../useBattleSession'
import { BattleSprite } from './BattleSprite'
import { Combatant } from './Combatant'
import { useBattleT } from './util'

// 날씨: 장면 전체에 옅은 색
const WEATHER_TINT: Record<string, string> = {
    rain: 'bg-blue-ring/30',
    heavy_rain: 'bg-blue-ring/45',
    sun: 'bg-yellow-subtle/45',
    harsh_sun: 'bg-orange-subtle/50',
    sandstorm: 'bg-orange-subtle/55',
    snow: 'bg-surface/45',
    strong_winds: 'bg-gray-subtle/40',
}
// 필드: 땅에 색 띠
const TERRAIN_TINT: Record<string, string> = {
    electric: 'bg-yellow-ring/55',
    grassy: 'bg-green-ring/70',
    misty: 'bg-pink-subtle/70',
    psychic: 'bg-purple-subtle/70',
}

const PLATFORM = 'rounded-ellipse border border-green-vivid/25 bg-radial from-green-subtle from-30% to-green-vivid/35 shadow-md'

export function BattleScene({ frame, foeHpMode, showFoeTera, children }: {
    frame: Frame
    foeHpMode: 'toggle' | 'percent'
    showFoeTera: boolean
    /** 결과 화면 등 장면 위 덮개 */
    children?: ReactNode
}) {
    const t = useBattleT()
    const foe = frame.p2.active
    const ours = frame.p1.active
    const weather = frame.weather ? WEATHER_TINT[frame.weather] : undefined
    const terrain = frame.terrain ? TERRAIN_TINT[frame.terrain] : undefined

    return (
        <section
            aria-label={t('battleScene')}
            className="relative isolate h-72 overflow-hidden rounded-lg border border-border bg-linear-to-b from-blue-subtle via-cyan-subtle to-cyan-subtle sm:h-88"
        >
            {/* 땅 + 지평선 */}
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 border-t border-green-ring bg-linear-to-b from-green-subtle to-green-ring" />
            {terrain && <span aria-hidden className={cx('absolute inset-x-0 bottom-0 h-1/2', terrain)} />}
            {weather && <span aria-hidden className={cx('pointer-events-none absolute inset-0 z-20', weather)} />}

            {/* 상대: 위·오른쪽 플랫폼 */}
            <span className="absolute right-2 bottom-1/2 flex w-36 flex-col items-center sm:right-1/12 sm:bottom-2/5 sm:w-72">
                <BattleSprite key={foe.id} p={foe} back={false} frame={frame} />
                <span aria-hidden className={cx('-mt-4 h-8 w-full sm:-mt-7 sm:h-16', PLATFORM)} />
            </span>

            {/* 우리: 아래·왼쪽 플랫폼 (가까이라 크고 화면 아래로 걸친다) */}
            <span className="absolute -bottom-4 left-0 flex w-40 flex-col items-center sm:-bottom-8 sm:left-1/20 sm:w-80">
                <BattleSprite key={ours.id} p={ours} back frame={frame} />
                <span aria-hidden className={cx('-mt-6 h-12 w-full sm:-mt-10 sm:h-20', PLATFORM)} />
            </span>

            {/* HUD: 상대는 왼쪽 위, 우리는 오른쪽 아래 */}
            <span className="absolute top-2 left-2 z-30 w-7/12 sm:top-4 sm:left-4 sm:w-2/5 sm:max-w-sm">
                <Combatant side={frame.p2} back={false} hpMode={foeHpMode} showTeraType={showFoeTera} />
            </span>
            <span className="absolute right-2 bottom-2 z-30 w-7/12 sm:right-4 sm:bottom-4 sm:w-2/5 sm:max-w-sm">
                <Combatant side={frame.p1} back hpMode="toggle" showTeraType />
            </span>

            {children}
        </section>
    )
}
