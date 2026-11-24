import { useState } from 'react'
import { HStack } from '@astryxdesign/core/HStack'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { cx } from './utils'

/**
 * 게임 도트 스프라이트를 원본 픽셀 그대로 정수배로 키워 보여 준다.
 * 원본 크기(56·64·80·96px 등)를 읽어 box 안에 들어가는 가장 큰 정수배(최소 1배)로 그리므로 픽셀이 고르게 커진다.
 * 칸 크기(box)는 고정이라 그림이 뜰 때 레이아웃이 밀리지 않는다.
 */
export function PixelSprite({ src, alt, box = 192, className }: { src: string; alt: string; box?: 96 | 144 | 192; className?: string }) {
    const [natural, setNatural] = useState<{ src: string; w: number; h: number } | null>(null)
    const size = natural?.src === src ? natural : null
    // 박스 아이콘(32~40px)은 아이콘답게 2배까지만
    const maxScale = src.includes('/icons/') ? 2 : 4
    const scale = size ? Math.max(1, Math.min(maxScale, Math.floor(box / Math.max(size.w, size.h)))) : 1
    const boxClass = box === 96 ? 'size-24' : box === 144 ? 'size-36' : 'size-48'
    return (
        <HStack justify="center" vAlign="center" className={cx('relative shrink-0', boxClass, className)}>
            {!size && (
                <HStack className="absolute inset-0">
                    <Skeleton />
                </HStack>
            )}
            <img
                key={src}
                src={src}
                alt={alt}
                loading="lazy"
                decoding="async"
                width={size ? size.w * scale : box}
                height={size ? size.h * scale : box}
                onLoad={(e) => setNatural({ src, w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                className={cx('max-h-full max-w-full [image-rendering:pixelated]', !size && 'opacity-0')}
            />
        </HStack>
    )
}
