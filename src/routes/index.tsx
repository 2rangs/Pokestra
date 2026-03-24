import {createHashRouter, Navigate} from 'react-router-dom'

import MainLayout from '../layouts/MainLayout'
import HomePage from '../pages/HomePage'
import PokedexPage from '../pages/pokedex/PokedexPage.tsx'
import MovesPage from '../pages/MovesPage'
import AbilitiesPage from '../pages/AbilitiesPage'
import SpritesPage from "../pages/SpritesPage.tsx";
import PokemonDetailPage from "../pages/pokedex/PokemonDetailPage.tsx";

const router = createHashRouter(
    [
        {
            element: <MainLayout />,
            children: [
                { path: '/', element: <HomePage /> },
                { path: '/pokedex', element: <PokedexPage /> },
                { path: '/pokemon/:id', element: <PokemonDetailPage /> },
                { path: '/moves', element: <MovesPage /> },
                { path: '/abilities', element: <AbilitiesPage /> },
                { path: '/sprites', element: <SpritesPage /> },
                { path: '/pokestra', element: <Navigate to="/" replace /> },
                { path: '*', element: <Navigate to="/" replace /> },
            ],
        },
    ]
)

export default router