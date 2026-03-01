import { useEffect, useRef, useState } from "react"

export function useInView<T extends Element>(options?: IntersectionObserverInit) {
    const ref = useRef<T | null>(null)
    const [inView, setInView] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (!el) return

        const io = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setInView(true)
                io.disconnect() // 한 번 들어오면 고정(재요청 방지)
            }
        }, options)

        io.observe(el)
        return () => io.disconnect()
    }, [options])

    return { ref, inView }
}