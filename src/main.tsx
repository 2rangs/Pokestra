// 가장 먼저: CSS 레이어 순서를 선언하는 전역 스타일시트
import './styles.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LinkProvider } from '@astryxdesign/core/Link'
import { ThemeRoot } from './components/ThemeRoot'
import App from './App'
import RouterLink from './components/RouterLink'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <HashRouter>
                <ThemeRoot>
                    <LinkProvider component={RouterLink}>
                        <App />
                    </LinkProvider>
                </ThemeRoot>
            </HashRouter>
        </QueryClientProvider>
    </StrictMode>,
)
