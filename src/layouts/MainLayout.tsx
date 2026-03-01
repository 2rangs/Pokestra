import { Outlet, NavLink } from 'react-router-dom'

const NAV_ITEMS = [
    { to: '/', label: 'Home', end: true },
    { to: '/pokedex', label: 'Pokédex' },
    { to: '/moves', label: 'Moves' },
    { to: '/abilities', label: 'Abilities' },
    { to: '/sprites', label: 'Sprites' },
]

const MainLayout = () => {
    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            {/* ── Header ── */}
            <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-lg">
                {/* Logo row */}
                <div className="max-w-6xl mx-auto px-4 pt-3 pb-2 flex items-center justify-center">
                    <NavLink to="/" className="group flex items-center gap-2">
                        {/* Pokéball icon */}
                        <svg
                            viewBox="0 0 100 100"
                            className="w-7 h-7 transition-transform duration-300 group-hover:rotate-[20deg]"
                        >
                            <circle cx="50" cy="50" r="48" fill="none" stroke="#1e293b" strokeWidth="4" />
                            <path d="M2,50 H98" stroke="#1e293b" strokeWidth="4" />
                            <path d="M2,50 A48,48 0 0,0 98,50" fill="#ef4444" />
                            <circle cx="50" cy="50" r="14" fill="white" stroke="#1e293b" strokeWidth="4" />
                            <circle cx="50" cy="50" r="7" fill="#1e293b" />
                        </svg>
                        <span
                            className="text-xl font-extrabold tracking-tight text-slate-900"
                            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                        >
                            Pokestra
                        </span>
                    </NavLink>
                </div>

                {/* Nav row */}
                <nav className="max-w-6xl mx-auto px-4">
                    <div className="flex items-center justify-center gap-1">
                        {NAV_ITEMS.map(({ to, label, end }) => (
                            <NavLink
                                key={to}
                                to={to}
                                end={end}
                                className={({ isActive }) =>
                                    [
                                        'relative px-4 py-2 text-sm font-semibold transition-colors',
                                        isActive
                                            ? 'text-slate-900'
                                            : 'text-slate-400 hover:text-slate-600',
                                    ].join(' ')
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        {label}
                                        {/* Active indicator */}
                                        {isActive && (
                                            <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-red-500" />
                                        )}
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>
                </nav>
            </header>

            {/* ── Content ── */}
            <main className="flex-1">
                <div className="max-w-5xl mx-auto px-4 py-6">
                    <Outlet />
                </div>
            </main>

            {/* ── Footer ── */}
            <footer className="border-t border-slate-200/80 bg-white">
                <div className="max-w-6xl mx-auto px-4 py-6 text-center space-y-1">
                    <p className="text-xs text-slate-400 leading-relaxed">
                        All content &amp; design © Pokémon Database, 2008–2026.
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        Pokémon images &amp; names © 1995–2026 Nintendo/Game Freak.
                    </p>
                </div>
            </footer>
        </div>
    )
}

export default MainLayout