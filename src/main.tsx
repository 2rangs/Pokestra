// 가장 먼저: CSS 레이어 순서를 선언하는 전역 스타일시트
import './styles.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Theme } from '@astryxdesign/core/theme'
import { LinkProvider } from '@astryxdesign/core/Link'
import { themes, defaultThemeSlug } from './astryx-themes'
import App from './App'
import RouterLink from './components/RouterLink'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <HashRouter>
                <Theme theme={themes[defaultThemeSlug]} mode="light">
                    <LinkProvider component={RouterLink}>
                        <App />
                    </LinkProvider>
                </Theme>
            </HashRouter>
        </QueryClientProvider>
    </StrictMode>,
)
