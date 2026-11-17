import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 긴 목록을 조금씩 렌더링한다.
 * `resetKey`(필터 조합 등)가 바뀌면 처음 개수로 돌아간다.
 * 반환된 `sentinelRef` 를 목록 끝 요소에 달면 화면에 들어올 때 자동으로 더 불러온다.
 */
export function useProgressive(total: number, resetKey: string, pageSize = 60) {
    const [state, setState] = useState({ key: resetKey, n: pageSize })
    const limit = state.key === resetKey ? state.n : pageSize
    const shown = Math.min(limit, total)
    const hasMore = shown < total

    const more = useCallback(() => {
        setState((s) => ({ key: resetKey, n: (s.key === resetKey ? s.n : pageSize) + pageSize }))
    }, [resetKey, pageSize])

    const sentinelRef = useRef<HTMLDivElement | null>(null)
    useEffect(() => {
        const el = sentinelRef.current
        if (!el || !hasMore || typeof IntersectionObserver === 'undefined') return
        const io = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) more()
            },
            { rootMargin: '600px 0px' },
        )
        io.observe(el)
        return () => io.disconnect()
    }, [hasMore, more, shown])

    return { shown, hasMore, more, sentinelRef }
}
