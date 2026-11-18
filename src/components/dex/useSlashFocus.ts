import { useEffect } from 'react'

function isEditable(el: EventTarget | null): boolean {
    if (!(el instanceof HTMLElement)) return false
    return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

/** 편집 요소 밖에서 `/` 를 누르면 본문의 검색창으로 포커스를 옮긴다. */
export function useSlashFocus(): void {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.isComposing) return
            if (isEditable(e.target)) return
            const input = document.querySelector<HTMLInputElement>('main input[type="search"]')
            if (!input) return
            e.preventDefault()
            input.focus()
            input.select()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [])
}
