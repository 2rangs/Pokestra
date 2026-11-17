import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

/**
 * 주소의 쿼리 파라미터를 필터 상태로 쓴다.
 * `update({ q: 'abc', type: null })` 처럼 부분만 바꾸고, 빈 값/null 은 지운다.
 * 히스토리를 쌓지 않도록 replace 로 바꾼다.
 */
export function useUrlParams() {
    const [params, setParams] = useSearchParams()
    const update = useCallback(
        (patch: Record<string, string | null>) =>
            setParams(
                (prev) => {
                    const next = new URLSearchParams(prev)
                    for (const [k, v] of Object.entries(patch)) {
                        if (v) next.set(k, v)
                        else next.delete(k)
                    }
                    return next
                },
                { replace: true },
            ),
        [setParams],
    )
    return [params, update] as const
}
