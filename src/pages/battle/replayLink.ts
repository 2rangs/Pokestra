// ─── 리플레이 링크 ───────────────────────────────────────────
import { useEffect, useState } from 'react'
import { encodeReplay, type ReplayData } from '../../lib/replay'

export const REPLAY_PATH = '/battle/replay'

/** 앱 안 경로 (HashRouter 의 # 뒤) */
export const replayRoute = (encoded: string) => `${REPLAY_PATH}?d=${encoded}`

/** 공유용 전체 주소 */
export const replayUrl = (encoded: string) =>
    `${window.location.origin}${window.location.pathname}#${replayRoute(encoded)}`

/** 리플레이 데이터 → 인코딩한 문자열 (준비 전·실패면 null) */
export function useEncodedReplay(data: ReplayData | null): string | null {
    const [encoded, setEncoded] = useState<{ of: ReplayData; s: string } | null>(null)
    useEffect(() => {
        if (!data) return
        let alive = true
        encodeReplay(data).then(s => { if (alive) setEncoded({ of: data, s }) }, () => {})
        return () => { alive = false }
    }, [data])
    return encoded && encoded.of === data ? encoded.s : null
}
