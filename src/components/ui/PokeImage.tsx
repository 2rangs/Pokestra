import { useLayoutEffect, useRef, useState } from 'react'
import { isPaddedBoxIcon, isPixelSprite } from '../../lib/images'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { VStack } from '@astryxdesign/core/VStack'

type Props = {
    /** 시도 순서대로의 이미지 URL. 앞이 실패하면 다음 후보로 넘어간다. */
    sources: (string | null | undefined)[]
    alt: string
    /** width/height 속성이자 스켈레톤 박스 크기(px). */
    size: number
    /** 반응형 크기 클래스 등. 있으면 size 대신 박스 크기를 정한다. */
    className?: string
    /** auto: 현재 URL이 /sprites/pokemon/ 아래 도트(official-artwork·home 아님)면 true */
    pixelated?: boolean | 'auto'
    priority?: boolean
}

export function PokeImage({ sources, alt, size, className, pixelated = 'auto', priority = false }: Props) {
    const key = sources.filter(Boolean).join('|')
    const urls = key ? key.split('|') : []

    const [state, setState] = useState({ key, index: 0, loaded: false })
    // sources 내용이 바뀌면 상태 초기화 (렌더 중 파생 상태 갱신)
    let cur = state
    if (state.key !== key) {
        cur = { key, index: 0, loaded: false }
        setState(cur)
    }

    const url = urls[cur.index]
    const imgRef = useRef<HTMLImageElement>(null)

    // 캐시된 이미지는 onLoad가 이미 지나갔을 수 있으므로 마운트/URL 변경 시 직접 확인
    useLayoutEffect(() => {
        const img = imgRef.current
        if (img && img.complete && img.naturalWidth > 0) {
            setState((s) => (s.key === key && s.index === cur.index ? { ...s, loaded: true } : s))
        }
    }, [key, cur.index])

    const box = 'relative overflow-hidden shrink-0'
    const boxProps = className ? {} : { width: size, height: size }
    const usePixelated = pixelated === 'auto' ? isPixelSprite(url) : pixelated

    if (!url) {
        return <VStack
                {...boxProps}
                className={`${box} bg-muted ${className ?? ''}`}
                {...(alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': true })}
            />
    }

    return (
        <VStack {...boxProps} className={`${box} ${className ?? ''}`}>
            {!cur.loaded && (
                <VStack className="absolute inset-0">
                    <Skeleton />
                </VStack>
            )}
            <img
                ref={imgRef}
                key={url}
                src={url}
                alt={alt}
                width={size}
                height={size}
                loading={priority ? 'eager' : 'lazy'}
                fetchPriority={priority ? 'high' : 'auto'}
                decoding="async"
                onLoad={() => setState((s) => (s.key === key ? { ...s, loaded: true } : s))}
                onError={() => setState((s) => (s.key === key ? { ...s, index: s.index + 1, loaded: false } : s))}
                className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-200 motion-reduce:transition-none ${
                    cur.loaded ? 'opacity-100' : 'opacity-0'
                } ${usePixelated ? '[image-rendering:pixelated]' : ''} ${isPaddedBoxIcon(url) ? 'scale-175' : ''}`}
            />
        </VStack>
    )
}
