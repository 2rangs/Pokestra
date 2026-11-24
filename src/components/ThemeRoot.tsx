import { useEffect, type ReactNode } from 'react'
import { Theme } from '@astryxdesign/core/theme'
import { useMediaQuery } from '@astryxdesign/core/hooks'
import { themes, defaultThemeSlug } from '../astryx-themes'
import { useColorModeStore } from '../stores/colorModeStore'

/**
 * 앱 테마 + 저장된 화면 모드. Theme 바깥의 html/body(스크롤바, 페이지 바탕, 당겨서 넘칠 때 보이는 면)도
 * 같은 모드가 되도록 html 의 color-scheme 을 맞춘다.
 */
export function ThemeRoot({ children }: { children: ReactNode }) {
    const mode = useColorModeStore((s) => s.mode)
    const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
    const resolved = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode

    useEffect(() => {
        document.documentElement.style.colorScheme = resolved
    }, [resolved])

    return (
        <Theme theme={themes[defaultThemeSlug]} mode={mode}>
            {children}
        </Theme>
    )
}
