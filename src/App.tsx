import { lazy } from 'react'
import { Routes, Route, Navigate, Link } from 'react-router'
import { useT } from './i18n'
import { commonMessages } from './i18n/messages/common'
import MainLayout from './layouts/MainLayout'
import './App.css'

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
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-400" role="status">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-red-500" />
            {t('loading')}
        </div>
    )
}

function NotFound() {
    const t = useT(commonMessages)
    return (
        <div className="py-20 text-center">
            <p className="text-6xl font-black text-slate-200">404</p>
            <h1 className="mt-2 text-xl font-bold text-slate-900">{t('notFoundTitle')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('notFoundBody')}</p>
            <Link to="/" className="mt-6 inline-block rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500">
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
