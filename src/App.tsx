import { lazy } from 'react'
import { Routes, Route, Navigate, Link } from 'react-router'
import { useDocumentTitle, useT } from './i18n'
import { commonMessages } from './i18n/messages/common'
import { PenNote, Spinner } from './components/ui/notebook'
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
    return <Spinner label={t('loading')} />
}

function NotFound() {
    const t = useT(commonMessages)
    useDocumentTitle(t('notFoundTitle'))
    return (
        <div className="py-16">
            <PenNote className="-rotate-2 text-5xl">404</PenNote>
            <h1 className="mt-3 font-serif text-3xl font-bold text-ink">{t('notFoundTitle')}</h1>
            <p className="mt-2 text-ink-soft">{t('notFoundBody')}</p>
            <Link to="/" className="btn btn-ink mt-6">
                {t('goHome')}
            </Link>
        </div>
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
