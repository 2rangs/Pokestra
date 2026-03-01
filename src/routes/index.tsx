import { createBrowserRouter, Navigate } from 'react-router-dom'

import MainLayout from '../layouts/MainLayout'
import HomePage from '../pages/HomePage'
import PokedexPage from '../pages/PokedexPage'
import MovesPage from '../pages/MovesPage'
import AbilitiesPage from '../pages/AbilitiesPage'
import SpritesPage from "../pages/SpritesPage.tsx";

const router = createBrowserRouter(
    [
        {
            element: <MainLayout />,
            children: [
                // 홈
                { path: '/', element: <HomePage /> },

                // 섹션
                { path: '/pokedex', element: <PokedexPage /> },
                { path: '/moves', element: <MovesPage /> },
                { path: '/abilities', element: <AbilitiesPage /> },
                { path: '/sprites', element: <SpritesPage /> },

                // (옵션) 예전 경로 호환: /pokestra 로 들어오면 홈으로
                { path: '/pokestra', element: <Navigate to="/" replace /> },

                // 404 처리
                { path: '*', element: <Navigate to="/" replace /> },
            ],
        },
    ],
    {
        // GitHub Pages에서 /<repo>/ 아래로 라우팅되게 함
        // vite.config.ts의 base: '/레포명/' 와 맞아야 함
        basename: import.meta.env.BASE_URL,
    }
)

export default router