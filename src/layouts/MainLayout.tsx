import { Outlet, NavLink } from 'react-router-dom'

const MainLayout = () => {
    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-50 h-16 border-b bg-white">
                <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between">
                    {/* 로고 */}
                    <NavLink to="/" className="font-bold text-xl">
                        Pokestra
                    </NavLink>

                    {/* 네비게이션 */}
                    <nav className="flex gap-4">
                        <NavLink
                            to="/"
                            end
                            className={({ isActive }) =>
                                isActive ? 'font-semibold text-black' : 'text-gray-400'
                            }
                        >
                            도감
                        </NavLink>
                    </nav>
                </div>
            </header>

            <main className="flex-1">
                <div className=" mx-auto px-4 py-6">
                    <Outlet />
                </div>
            </main>

            <footer className="h-12 border-t flex items-center justify-center text-sm text-gray-400">
                Powered by PokéAPI
            </footer>
        </div>
    )
}

export default MainLayout