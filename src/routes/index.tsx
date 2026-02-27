import { createBrowserRouter } from 'react-router-dom'
import Pokedex from '../page/pokedex'
import PokemonDetailPage from '../page/PokemonDetailPage'

const router = createBrowserRouter([
    {
        path: '/',
        element: <Pokedex />,
    },
    {
        path: '/pokemon/:name',
        element: <PokemonDetailPage />,
    },
])

export default router