import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import HomePage from './pages/HomePage'
import PokedexPage from './pages/pokedex/PokedexPage.tsx'
import MovesPage from './pages/MovesPage'
import AbilitiesPage from './pages/AbilitiesPage'
import './App.css'
import SpritesPage from "./pages/SpritesPage.tsx";
import PokemonDetailPage from "./pages/pokedex/PokemonDetailPage.tsx";

export default function App() {
  return (
      <Routes>
        <Route element={<MainLayout />}>
          {/* 홈 */}
          <Route path="/" element={<HomePage />} />

          {/* 섹션 */}
          <Route path="/pokedex" element={<PokedexPage />} />
          <Route path="/moves" element={<MovesPage />} />
          <Route path="/abilities" element={<AbilitiesPage />} />
          <Route path="/sprites" element={<SpritesPage />} />
            <Route path="/pokemon/:id" element={<PokemonDetailPage />} />
          {/* (옵션) 기존 /pokestra 접근 시 홈으로 보내기 */}
          <Route path="/pokestra" element={<Navigate to="/" replace />} />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
  )
}