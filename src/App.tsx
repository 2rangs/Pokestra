import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router'
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
    return <div className="p-10 text-center text-sm text-slate-400">불러오는 중…</div>
}

export default function App() {
    return (
        <Suspense fallback={<PageFallback />}>
            <Routes>
                <Route element={<MainLayout />}>
                    {/* 홈 */}
                    <Route path="/" element={<HomePage />} />

                    {/* 섹션 */}
                    <Route path="/pokedex" element={<PokedexPage />} />
                    <Route path="/pokemon/:id" element={<PokemonDetailPage />} />
                    <Route path="/battle" element={<BattlePage />} />
                    <Route path="/calc" element={<CalcPage />} />
                    <Route path="/moves" element={<MovesPage />} />
                    <Route path="/abilities" element={<AbilitiesPage />} />
                    <Route path="/sprites" element={<SpritesPage />} />

                    {/* (옵션) 기존 /pokestra 접근 시 홈으로 보내기 */}
                    <Route path="/pokestra" element={<Navigate to="/" replace />} />

                    {/* 404 */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>
        </Suspense>
    )
}
