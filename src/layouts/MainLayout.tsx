import { Suspense, useEffect, useState, type ReactNode } from 'react'
import { Outlet, useLocation } from 'react-router'
import { TopNav, TopNavHeading, TopNavItem } from '@astryxdesign/core/TopNav'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { IconButton } from '@astryxdesign/core/IconButton'
import { LANGS, useDocumentLang, useLang, useLangStore, useT, type Lang } from '../i18n'
import { commonMessages } from '../i18n/messages/common'

const NAV_ITEMS = [
    { to: '/pokedex', key: 'navPokedex', match: ['/pokedex', '/pokemon'] },
    { to: '/battle', key: 'navBattle', match: ['/battle'] },
    { to: '/calc', key: 'navCalc', match: ['/calc'] },
    { to: '/moves', key: 'navMoves', match: ['/moves'] },
    { to: '/abilities', key: 'navAbilities', match: ['/abilities'] },
    { to: '/sprites', key: 'navSprites', match: ['/sprites'] },
] as const

/** 몬스터볼 마크 */
function Mark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden fill="none" strokeLinecap="round">
            <circle cx="20" cy="20" r="17" stroke="var(--color-text-primary)" strokeWidth="2.4" />
            <path d="M3 20a17 17 0 0 1 34 0" fill="var(--color-error)" fillOpacity="0.9" />
            <path d="M3.5 20h11.2M25.3 20h11.2" stroke="var(--color-text-primary)" strokeWidth="2.4" />
            <circle cx="20" cy="20" r="5.3" fill="var(--color-background-surface)" stroke="var(--color-text-primary)" strokeWidth="2.4" />
        </svg>
    )
}

const LANG_SHORT: Record<Lang, string> = { ko: '한', en: 'EN', ja: '日' }

function LanguageSwitch() {
    const lang = useLang()
    const setLang = useLangStore((s) => s.setLang)
    const t = useT(commonMessages)
    return (
        <SegmentedControl size="sm" label={t('language')} value={lang} onChange={(v) => setLang(v as Lang)}>
            {LANGS.map((l) => (
                <SegmentedControlItem key={l} value={l} label={LANG_SHORT[l]} />
            ))}
        </SegmentedControl>
    )
}

function BackToTop({ label }: { label: string }) {
    const [show, setShow] = useState(false)
    useEffect(() => {
        const onScroll = () => setShow(window.scrollY > 700)
        onScroll()
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])
    return (
        <span className={`fixed right-4 bottom-4 z-40 transition-opacity ${show ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
            <IconButton
                label={label}
                variant="secondary"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                icon={
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                        <path d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                }
            />
        </span>
    )
}

const MainLayout = ({ fallback }: { fallback?: ReactNode }) => {
    useDocumentLang()
    const t = useT(commonMessages)
    const { pathname } = useLocation()

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [pathname])

    const items = NAV_ITEMS.map(({ to, key, match }) => (
        <TopNavItem key={to} href={to} label={t(key)} isSelected={match.some((m) => pathname.startsWith(m))} />
    ))

    return (
        <div className="flex min-h-screen flex-col">
            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-semibold"
            >
                {t('skipToContent')}
            </a>

            <header className="sticky top-0 z-50 border-b border-border bg-surface">
                <div className="mx-auto max-w-6xl">
                    <TopNav
                        label="Main"
                        heading={<TopNavHeading logo={<Mark className="h-7 w-7" />} heading="Pokestra" headingHref="/" />}
                        startContent={<span className="hidden items-center gap-1 lg:flex">{items}</span>}
                        endContent={<LanguageSwitch />}
                    />
                </div>
                {/* 좁은 화면: 가로 스크롤 탭 줄 */}
                <nav aria-label="Sections" className="overflow-x-auto px-2 pb-1.5 [scrollbar-width:none] lg:hidden">
                    <span className="flex w-max gap-1">{items}</span>
                </nav>
            </header>

            <main id="main" className="flex-1">
                <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
                    <Suspense fallback={fallback}>
                        <Outlet />
                    </Suspense>
                </div>
            </main>

            <footer className="border-t border-border px-4 py-8 text-center text-xs leading-relaxed text-secondary">
                <p>{t('footerData')}</p>
                <p>{t('footerCopyright')}</p>
                <p>{t('footerFan')}</p>
            </footer>

            <BackToTop label={t('backToTop')} />
        </div>
    )
}

export default MainLayout
