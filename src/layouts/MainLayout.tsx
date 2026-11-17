import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router'
import { LANGS, LANG_LABEL, useDocumentLang, useLang, useLangStore, useT, type Lang } from '../i18n'
import { commonMessages } from '../i18n/messages/common'

const NAV_ITEMS = [
    { to: '/', key: 'navHome', end: true },
    { to: '/pokedex', key: 'navPokedex' },
    { to: '/battle', key: 'navBattle' },
    { to: '/calc', key: 'navCalc' },
    { to: '/moves', key: 'navMoves' },
    { to: '/abilities', key: 'navAbilities' },
    { to: '/sprites', key: 'navSprites' },
] as const

function Pokeball({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden>
            <circle cx="50" cy="50" r="48" fill="none" stroke="#1e293b" strokeWidth="4" />
            <path d="M2,50 H98" stroke="#1e293b" strokeWidth="4" />
            <path d="M2,50 A48,48 0 0,0 98,50" fill="#ef4444" />
            <circle cx="50" cy="50" r="14" fill="white" stroke="#1e293b" strokeWidth="4" />
            <circle cx="50" cy="50" r="7" fill="#1e293b" />
        </svg>
    )
}

const LANG_SHORT: Record<Lang, string> = { ko: 'KO', en: 'EN', ja: 'JA' }

function LanguageSwitcher() {
    const lang = useLang()
    const setLang = useLangStore((s) => s.setLang)
    const t = useT(commonMessages)
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        const onDown = (e: MouseEvent) => {
            if (!ref.current?.contains(e.target as Node)) setOpen(false)
        }
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
        document.addEventListener('mousedown', onDown)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [open])

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={t('language')}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
            >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
                </svg>
                {LANG_SHORT[lang]}
            </button>
            {open && (
                <ul
                    role="listbox"
                    aria-label={t('language')}
                    className="absolute right-0 z-50 mt-2 w-36 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-xl"
                >
                    {LANGS.map((l) => (
                        <li key={l}>
                            <button
                                type="button"
                                role="option"
                                aria-selected={l === lang}
                                lang={l}
                                onClick={() => {
                                    setLang(l)
                                    setOpen(false)
                                }}
                                className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition hover:bg-slate-50 ${
                                    l === lang ? 'font-bold text-slate-900' : 'text-slate-600'
                                }`}
                            >
                                {LANG_LABEL[l]}
                                {l === lang && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

function BackToTop({ label }: { label: string }) {
    const [show, setShow] = useState(false)
    useEffect(() => {
        const onScroll = () => setShow(window.scrollY > 600)
        onScroll()
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={`fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition-all hover:bg-red-500 ${
                show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
            }`}
        >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
        </button>
    )
}

const MainLayout = ({ fallback }: { fallback?: ReactNode }) => {
    useDocumentLang()
    const t = useT(commonMessages)
    const { pathname } = useLocation()

    // 페이지 이동 시 맨 위로
    useEffect(() => {
        window.scrollTo(0, 0)
    }, [pathname])

    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:shadow"
            >
                {t('skipToContent')}
            </a>

            {/* ── Header ── */}
            <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-lg">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-3 pb-1">
                    <span className="w-16" aria-hidden />
                    <NavLink to="/" className="group flex items-center gap-2">
                        <Pokeball className="h-7 w-7 transition-transform duration-300 group-hover:rotate-[20deg]" />
                        <span
                            className="text-xl font-extrabold tracking-tight text-slate-900"
                            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                        >
                            Pokestra
                        </span>
                    </NavLink>
                    <div className="flex w-16 justify-end">
                        <LanguageSwitcher />
                    </div>
                </div>

                <nav className="mx-auto max-w-6xl px-2 sm:px-4" aria-label="Main">
                    <div className="flex items-center justify-start gap-1 overflow-x-auto [scrollbar-width:none] sm:justify-center">
                        {NAV_ITEMS.map(({ to, key, ...rest }) => (
                            <NavLink
                                key={to}
                                to={to}
                                end={'end' in rest ? rest.end : undefined}
                                className={({ isActive }) =>
                                    [
                                        'relative shrink-0 px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors sm:px-4',
                                        isActive ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600',
                                    ].join(' ')
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        {t(key)}
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
            <main id="main" className="flex-1">
                <div className="mx-auto max-w-5xl px-4 py-6">
                    <Suspense fallback={fallback}>
                        <Outlet />
                    </Suspense>
                </div>
            </main>

            {/* ── Footer ── */}
            <footer className="border-t border-slate-200/80 bg-white">
                <div className="mx-auto max-w-6xl space-y-1 px-4 py-6 text-center">
                    <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-slate-700">
                        <Pokeball className="h-4 w-4" /> Pokestra
                    </p>
                    <p className="text-xs leading-relaxed text-slate-400">{t('footerData')}</p>
                    <p className="text-xs leading-relaxed text-slate-400">{t('footerCopyright')}</p>
                    <p className="text-xs leading-relaxed text-slate-400">{t('footerFan')}</p>
                </div>
            </footer>

            <BackToTop label={t('backToTop')} />
        </div>
    )
}

export default MainLayout
