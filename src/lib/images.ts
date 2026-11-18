import { artworkUrl, backSpriteUrl, spriteUrl } from './spriteUrls'

/** 이 크기(px) 이하로 표시할 때는 도트 스프라이트를 먼저 시도한다. */
export const SPRITE_MAX_PX = 64

/**
 * 표시 크기에 맞는 이미지 후보(시도 순서). ≤64px: [도트, 아트워크], >64px: [아트워크, 도트].
 * back=true면 뒷모습 도트가 맨 앞. 빈 값·중복은 제거한다.
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
    return [...new Set(list.filter(Boolean))]
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
