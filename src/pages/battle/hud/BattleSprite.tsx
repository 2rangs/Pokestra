// ─── 배틀 스프라이트 (Showdown 애니메이션 도트) ─────────────────
// 후보: 애니메이션 gif → 정지 도트 png → 공식 일러스트. 실제 크기의 약 2배(휴대폰은 작게)로,
// 발밑(아래 가운데)을 기준으로 그린다. 연출은 transform/filter 애니메이션만 써서 레이아웃이 움직이지 않는다.
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { animatedBackSpriteUrl, animatedSpriteUrl, artworkUrl, backSpriteUrl, dexIdOf, spriteUrl } from '../../../lib/battle'
import { useLang } from '../../../i18n'
import { cx } from '../../../components/ui/utils'
import type { Frame, PokeView } from '../useBattleSession'
import { nameOf } from './util'

type SpriteAnim = 'lunge' | 'hit' | 'crit' | 'enter' | 'heal' | 'shimmer'

/** 현재 프레임의 이벤트가 이 포켓몬에게 주는 연출 */
function spriteAnimFor(f: Frame, p: PokeView): SpriteAnim | null {
    const e = f.event
    switch (e.type) {
        case 'move_use': return e.pokemon_id === p.id ? 'lunge' : null
        case 'damage': return e.pokemon_id === p.id && e.amount > 0 ? (e.crit ? 'crit' : 'hit') : null
        case 'heal': return e.pokemon_id === p.id ? 'heal' : null
        case 'switch':
        case 'rotate': return e.in_id === p.id ? 'enter' : null
        case 'terastallize':
        case 'mega_evolve':
        case 'forme_change': return e.pokemon_id === p.id ? 'shimmer' : null
        default: return null
    }
}

// 정적 클래스 문자열 (Tailwind 가 찾을 수 있게)
const ANIM_CLASS: Record<SpriteAnim | 'lunge-foe', string> = {
    lunge: 'motion-safe:animate-battle-lunge-up',
    'lunge-foe': 'motion-safe:animate-battle-lunge-down',
    hit: 'motion-safe:animate-battle-hit',
    crit: 'motion-safe:animate-battle-crit',
    enter: 'motion-safe:animate-battle-enter',
    heal: 'motion-safe:animate-battle-heal',
    shimmer: 'motion-safe:animate-battle-shimmer',
}

const WIDE = '(min-width: 40rem)'
function subscribe(cb: () => void) {
    const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(WIDE) : null
    mq?.addEventListener('change', cb)
    return () => mq?.removeEventListener('change', cb)
}
const isWide = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(WIDE).matches : true)
function useWide() {
    return useSyncExternalStore(subscribe, isWide, () => true)
}

// 배율과 최대 높이 (상대는 멀리, 우리는 가까이 = 더 크게)
const SCALE = {
    foe: { wide: { k: 2, max: 168 }, narrow: { k: 1.15, max: 88 } },
    ours: { wide: { k: 2.3, max: 220 }, narrow: { k: 1.35, max: 108 } },
}

export function BattleSprite({ p, back, frame }: { p: PokeView; back: boolean; frame: Frame }) {
    const lang = useLang()
    const wide = useWide()
    const id = dexIdOf(p.species)
    const sources = id
        ? back
            ? [animatedBackSpriteUrl(id), backSpriteUrl(id), artworkUrl(id)]
            : [animatedSpriteUrl(id), spriteUrl(id), artworkUrl(id)]
        : []
    const srcKey = sources.join('|')
    const [state, setState] = useState({ srcKey, index: 0, w: 0, h: 0 })
    let cur = state
    if (state.srcKey !== srcKey) {
        cur = { srcKey, index: 0, w: 0, h: 0 }
        setState(cur)
    }
    const url = sources[cur.index]

    const anim = spriteAnimFor(frame, p)
    const animClass = anim ? ANIM_CLASS[anim === 'lunge' && !back ? 'lunge-foe' : anim] : ''
    const animRef = useRef<HTMLSpanElement>(null)
    // 같은 연출이 연달아 와도 (연속기 등) 프레임마다 처음부터 다시
    useLayoutEffect(() => {
        if (!anim) return
        for (const a of animRef.current?.getAnimations?.() ?? []) {
            a.cancel()
            a.play()
        }
    }, [frame.index, anim])

    const imgRef = useRef<HTMLImageElement>(null)
    const measure = (img: HTMLImageElement) => {
        if (img.naturalWidth > 0) setState(s => (s.srcKey === srcKey ? { ...s, w: img.naturalWidth, h: img.naturalHeight } : s))
    }
    // 캐시된 이미지는 onLoad 가 이미 지났을 수 있다
    useLayoutEffect(() => {
        const img = imgRef.current
        if (img?.complete) measure(img)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url])

    const conf = SCALE[back ? 'ours' : 'foe'][wide ? 'wide' : 'narrow']
    const scale = cur.h ? Math.min(conf.k, conf.max / cur.h, (conf.max * 1.6) / cur.w) : 0
    const loaded = scale > 0
    const pixel = !!url && !url.includes('/official-artwork/')

    return (
        <span
            className={cx(
                'relative z-10 flex items-end justify-center transition-all duration-500 ease-in',
                p.fainted ? 'translate-y-1/2 opacity-0' : 'opacity-100',
            )}
        >
            <span ref={animRef} className={cx('flex origin-bottom items-end', animClass)}>
                {url && (
                    <img
                        ref={imgRef}
                        key={url}
                        src={url}
                        alt={nameOf(p, lang)}
                        width={loaded ? Math.round(cur.w * scale) : undefined}
                        height={loaded ? Math.round(cur.h * scale) : undefined}
                        decoding="async"
                        draggable={false}
                        onLoad={e => measure(e.currentTarget)}
                        onError={() => setState(s => (s.srcKey === srcKey ? { ...s, index: s.index + 1, w: 0, h: 0 } : s))}
                        className={cx('block max-w-none select-none', pixel && 'pixelated', loaded ? 'opacity-100' : 'opacity-0')}
                    />
                )}
            </span>
        </span>
    )
}
