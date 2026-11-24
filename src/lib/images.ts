import { artworkUrl, backSpriteUrl, boxIconUrls, spriteUrl } from './spriteUrls'

/** 이 크기(px) 이하로 표시할 때는 도트 스프라이트를 먼저 시도한다. */
export const SPRITE_MAX_PX = 64
/** 이 크기(px) 이하로 표시할 때는 PC 박스 아이콘을 가장 먼저 시도한다. */
export const BOX_ICON_MAX_PX = 40

/**
 * 표시 크기에 맞는 이미지 후보(시도 순서).
 * ≤40px: [SV 박스 아이콘, 7세대 박스 아이콘, 도트, 아트워크], ≤64px: [도트, 아트워크], >64px: [아트워크, 도트].
 * back=true면 뒷모습 도트가 맨 앞(박스 아이콘은 쓰지 않는다). 빈 값·중복은 제거한다.
 */
export function pokemonImageCandidates(
    id: number,
    displayPx: number,
    opts: { sprite?: string | null; back?: boolean } = {},
): string[] {
    const sprite = opts.sprite || spriteUrl(id)
    const art = artworkUrl(id)
    const list = displayPx <= SPRITE_MAX_PX ? [sprite, art] : [art, sprite]
    if (opts.back) list.unshift(backSpriteUrl(id))
    else if (displayPx <= BOX_ICON_MAX_PX) list.unshift(...boxIconUrls(id))
    return [...new Set(list.filter(Boolean))]
}

/** 도트처럼 픽셀 렌더링할 URL: /sprites/pokemon/ 아래 도트·7세대 아이콘 (일러스트·HOME·SV 아이콘은 매끈한 그림이라 제외) */
export function isPixelSprite(url: string | undefined): boolean {
    if (!url || !url.includes('/sprites/pokemon/')) return false
    return !url.includes('/official-artwork/') && !url.includes('/home/') && !url.includes('/scarlet-violet/icons/')
}

/** 7세대 박스 아이콘(40×30)은 그림이 가운데 절반쯤만 차지한다 → 표시할 때 키워 칸을 채운다 */
export function isPaddedBoxIcon(url: string | undefined): boolean {
    return !!url && url.includes('/generation-vii/icons/')
}

/** 브라우저가 한가할 때 이미지를 미리 받아 캐시에 올린다. */
export function preloadImages(urls: string[]): void {
    const run = () => {
        for (const url of urls) {
            if (url) new Image().src = url
        }
    }
    if (typeof requestIdleCallback === 'function') requestIdleCallback(run)
    else setTimeout(run, 0)
}
