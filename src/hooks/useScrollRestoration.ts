import { useEffect, useLayoutEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router'

/**
 * 스크롤 위치 기억 (HashRouter 용).
 * - 새로 이동(PUSH/REPLACE): 맨 위로.
 * - 뒤로·앞으로(POP): 그 화면을 떠날 때의 위치로. 목록이 늦게 그려지면 문서가 충분히 길어질 때까지 잠깐 기다린다.
 * 위치는 화면 기록(location.key)마다 sessionStorage 에 둔다 (새로고침 후 뒤로 가도 동작).
 */
const STORE_KEY = 'pokestra-scroll'
const WAIT_MS = 1500

function readAll(): Record<string, number> {
    try {
        return JSON.parse(sessionStorage.getItem(STORE_KEY) ?? '{}') as Record<string, number>
    } catch {
        return {}
    }
}

function save(key: string, y: number) {
    try {
        const all = readAll()
        all[key] = y
        // 오래된 기록은 50개까지만
        const keys = Object.keys(all)
        for (const k of keys.slice(0, Math.max(0, keys.length - 50))) delete all[k]
        sessionStorage.setItem(STORE_KEY, JSON.stringify(all))
    } catch {
        // 저장할 수 없으면(사생활 보호 모드 등) 위치 기억 없이 동작
    }
}

export function useScrollRestoration() {
    const location = useLocation()
    const navType = useNavigationType()
    const key = location.key

    // 이 화면에 있는 동안 위치를 계속 적어 둔다 (떠나는 순간엔 이미 다음 화면이 그려져 있을 수 있어서)
    // 브라우저 자체 복원은 끈다 (해시 라우팅에서 우리 복원과 겹친다)
    useEffect(() => {
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    }, [])

    useEffect(() => {
        let frame = 0
        const onScroll = () => {
            cancelAnimationFrame(frame)
            frame = requestAnimationFrame(() => save(key, window.scrollY))
        }
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => {
            cancelAnimationFrame(frame)
            window.removeEventListener('scroll', onScroll)
        }
    }, [key])

    useLayoutEffect(() => {
        if (navType !== 'POP') {
            window.scrollTo(0, 0)
            return
        }
        const target = readAll()[key] ?? 0
        if (target <= 0) {
            window.scrollTo(0, 0)
            return
        }
        const start = performance.now()
        let frame = 0
        const tryRestore = () => {
            const max = document.documentElement.scrollHeight - window.innerHeight
            if (max >= target || performance.now() - start > WAIT_MS) {
                window.scrollTo(0, Math.min(target, Math.max(0, max)))
                return
            }
            frame = requestAnimationFrame(tryRestore)
        }
        tryRestore()
        return () => cancelAnimationFrame(frame)
    }, [key, navType])
}
