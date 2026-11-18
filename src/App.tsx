import { lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router'
import { Button } from '@astryxdesign/core/Button'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { useDocumentTitle, useT } from './i18n'
import { commonMessages } from './i18n/messages/common'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { VStack } from '@astryxdesign/core/VStack'
import MainLayout from './layouts/MainLayout'

// 큰 페이지(도감 데이터/배틀 엔진)는 지연 로드
const HomePage = lazy(() => import('./pages/HomePage'))
const PokedexPage = lazy(() => import('./pages/pokedex/PokedexPage.tsx'))
const PokemonDetailPage = lazy(() => import('./pages/pokedex/PokemonDetailPage.tsx'))
const BattlePage = lazy(() => import('./pages/battle/BattlePage.tsx'))
const CalcPage = lazy(() => import('./pages/CalcPage.tsx'))
const MovesPage = lazy(() => import('./pages/MovesPage'))
const AbilitiesPage = lazy(() => import('./pages/AbilitiesPage'))
const SpritesPage = lazy(() => import('./pages/SpritesPage.tsx'))

function PageFallback() {
    const t = useT(commonMessages)
    return (
        <VStack gap={6} className="min-h-screen" role="status" aria-busy="true" aria-label={t('loading')}>
            <Skeleton width="40%" height={40} />
            <Skeleton height={160} />
            <Skeleton height={320} />
            <Skeleton height={320} />
        </VStack>
    )
}

function NotFound() {
    const t = useT(commonMessages)
    useDocumentTitle(t('notFoundTitle'))
    return (
        <span className="block py-16">
            <EmptyState
                headingLevel={1}
                title={t('notFoundTitle')}
                description={t('notFoundBody')}
                actions={<Button variant="primary" href="/" label={t('goHome')} />}
            />
        </span>
    )
}

export default function App() {
    return (
        <Routes>
            <Route element={<MainLayout fallback={<PageFallback />} />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/pokedex" element={<PokedexPage />} />
                <Route path="/pokemon/:id" element={<PokemonDetailPage />} />
                <Route path="/battle" element={<BattlePage />} />
                <Route path="/calc" element={<CalcPage />} />
                <Route path="/moves" element={<MovesPage />} />
                <Route path="/moves/:slug" element={<MovesPage />} />
                <Route path="/abilities" element={<AbilitiesPage />} />
                <Route path="/abilities/:slug" element={<AbilitiesPage />} />
                <Route path="/sprites" element={<SpritesPage />} />

                {/* 기존 /pokestra 접근 시 홈으로 */}
                <Route path="/pokestra" element={<Navigate to="/" replace />} />
                <Route path="*" element={<NotFound />} />
            </Route>
        </Routes>
    )
}
