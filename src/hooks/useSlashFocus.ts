import { useEffect, type RefObject } from "react"
import { isSlashShortcut } from "../lib/keyboard"

/** `/`를 누르면 ref 안의 첫 input에 포커스하고 내용을 선택한다. */
export function useSlashFocus(ref: RefObject<HTMLElement | null>): void {
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const t = e.target instanceof HTMLElement ? e.target : null
            if (!isSlashShortcut(e, t && { tagName: t.tagName, isContentEditable: t.isContentEditable })) return
            const input = ref.current?.querySelector("input")
            if (!input) return
            e.preventDefault()
            input.focus()
            input.select()
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [ref])
}
