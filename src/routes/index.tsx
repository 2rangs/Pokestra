import { createBrowserRouter } from 'react-router-dom'
import Pokedex from '../page/pokedex'
import PokemonDetailPage from '../page/PokemonDetailPage'

const router = createBrowserRouter(
    [
        { path: '/', element: <Pokedex /> },
        { path: '/pokemon/:name', element: <PokemonDetailPage /> },
    ],
    {
        // GitHub Pages에서 /<repo>/ 아래로 라우팅되게 함
        basename: import.meta.env.BASE_URL,
    }
)

export default router