import { Suspense, useEffect, useState, type ReactNode } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { TopNav, TopNavHeading, TopNavItem } from '@astryxdesign/core/TopNav'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { IconButton } from '@astryxdesign/core/IconButton'
import { Text } from '@astryxdesign/core/Text'
import { HStack } from '@astryxdesign/core/HStack'
import { COLOR_MODES, type ColorMode, useColorModeStore } from '../stores/colorModeStore'
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu'
import { Icon } from '@astryxdesign/core/Icon'
import { PokeImage } from '../components/ui/PokeImage'
import { cx } from '../components/ui/utils'
import { pokemonImageCandidates } from '../lib/images'
import { itemIconUrl } from '../lib/spriteUrls'
import { LANG_LABEL, LANGS, useDocumentLang, useLang, useLangStore, useT, type Lang } from '../i18n'
import { commonMessages } from '../i18n/messages/common'

/**
 * 섹션마다 게임 속 물건을 아이콘으로: 몬스터볼(도감), 기술머신(기술), 특성캡슐(특성), 상처약(도구),
 * 그리고 그림을 그리는 포켓몬 루브도(스프라이트). 모두 도트라 픽셀 렌더링.
 */
const NAV_ITEMS = [
    { to: '/pokedex', key: 'navPokedex', match: ['/pokedex', '/pokemon'], icon: [itemIconUrl('poke-ball')] },
    { to: '/moves', key: 'navMoves', match: ['/moves'], icon: [itemIconUrl('tm-normal')] },
    { to: '/abilities', key: 'navAbilities', match: ['/abilities'], icon: [itemIconUrl('ability-capsule')] },
    { to: '/items', key: 'navItems', match: ['/items'], icon: [itemIconUrl('potion')] },
    { to: '/sprites', key: 'navSprites', match: ['/sprites'], icon: pokemonImageCandidates(235, 30) },
] as const

function NavIcon({ sources, size }: { sources: readonly string[]; size: number }) {
    return <PokeImage sources={[...sources]} alt="" size={size} pixelated className={size === 24 ? 'size-6' : 'size-7.5'} />
}

/** 좁은 화면: 엄지가 닿는 아래 탭 줄 (lg 미만). 각 칸은 56px 높이, 선택된 칸은 강조색 글자 + 위쪽 선. */
function BottomTabs({ pathname, label }: { pathname: string; label: string }) {
    const t = useT(commonMessages)
    return (
        <nav
            aria-label={label}
            className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
            <ul className="mx-auto grid max-w-xl grid-cols-5">
                {NAV_ITEMS.map(({ to, key, match, icon }) => {
                    const selected = match.some((m) => pathname.startsWith(m))
                    return (
                        <li key={to}>
                            <Link
                                to={to}
                                aria-current={selected ? 'page' : undefined}
                                className={cx(
                                    'flex min-h-14 flex-col items-center justify-center gap-0.5 border-t-2 outline-none focus-visible:bg-muted',
                                    selected ? 'border-accent' : 'border-transparent',
                                )}
                            >
                                <NavIcon sources={icon} size={30} />
                                <Text type="supporting" weight={selected ? 'semibold' : 'normal'} color={selected ? 'accent' : 'secondary'} maxLines={1}>
                                    {t(key)}
                                </Text>
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </nav>
    )
}

/** 몬스터볼 마크 */
function Mark({ className }: { className?: string }) {
    return (
        // public/favicon.svg 와 같은 모양
        <svg viewBox="0 0 32 32" className={className} aria-hidden>
            <path d="M2.5 16a13.5 13.5 0 0 1 27 0z" fill="#e53935" />
            <path d="M2.5 16a13.5 13.5 0 0 0 27 0z" fill="#ffffff" />
            <path d="M2.5 16h27" stroke="#1f2328" strokeWidth="2.6" />
            <circle cx="16" cy="16" r="13.5" fill="none" stroke="#1f2328" strokeWidth="2.6" />
            <circle cx="16" cy="16" r="4.6" fill="#ffffff" stroke="#1f2328" strokeWidth="2.6" />
        </svg>
    )
}

const LANG_SHORT: Record<Lang, string> = { ko: '한', en: 'EN', ja: '日' }

function LanguageSwitch() {
    const lang = useLang()
    const setLang = useLangStore((s) => s.setLang)
    const t = useT(commonMessages)
    return (
        <>
            {/* 넓은 화면: 세 언어를 한눈에 */}
            <span className="max-lg:hidden">
                <SegmentedControl size="sm" label={t('language')} value={lang} onChange={(v) => setLang(v as Lang)}>
                    {LANGS.map((l) => (
                        <SegmentedControlItem key={l} value={l} label={LANG_SHORT[l]} />
                    ))}
                </SegmentedControl>
            </span>
            {/* 좁은 화면: 44px 버튼 하나 + 아래에서 올라오는 선택지 (헤더 한 줄 유지) */}
            <span className="lg:hidden">
                <DropdownMenu
                    presentation="adaptive"
                    alignment="end"
                    button={{ label: LANG_SHORT[lang], 'aria-label': `${t('language')}: ${LANG_LABEL[lang]}`, variant: 'ghost', size: 'lg' }}
                    items={LANGS.map((l) => ({
                        label: LANG_LABEL[l],
                        onClick: () => setLang(l),
                        endContent: l === lang ? <Icon icon="check" color="accent" /> : undefined,
                    }))}
                />
            </span>
        </>
    )
}

const MODE_ICON: Record<ColorMode, ReactNode> = {
    system: (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <rect x="3" y="4" width="18" height="12" rx="2" />
            <path d="M8 20h8M12 16v4" />
        </svg>
    ),
    light: (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
    ),
    dark: (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        </svg>
    ),
}
const MODE_LABEL = { system: 'colorModeSystem', light: 'colorModeLight', dark: 'colorModeDark' } as const

/** 화면 모드 메뉴: 아이콘 버튼 하나 (휴대폰은 아래에서 올라오는 선택지) */
function ColorModeMenu() {
    const t = useT(commonMessages)
    const mode = useColorModeStore((s) => s.mode)
    const setMode = useColorModeStore((s) => s.setMode)
    return (
        <DropdownMenu
            presentation="adaptive"
            alignment="end"
            hasChevron={false}
            renderTrigger={(props) => (
                <IconButton {...props} label={`${t('colorMode')}: ${t(MODE_LABEL[mode])}`} variant="ghost" size="lg" icon={MODE_ICON[mode]} />
            )}
            items={COLOR_MODES.map((m) => ({
                label: t(MODE_LABEL[m]),
                icon: MODE_ICON[m],
                onClick: () => setMode(m),
                endContent: m === mode ? <Icon icon="check" color="accent" /> : undefined,
            }))}
        />
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
        <span className={`fixed right-4 bottom-20 z-40 lg:bottom-4 max-sm:*:min-h-11 max-sm:*:min-w-11 transition-opacity ${show ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
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

    const items = NAV_ITEMS.map(({ to, key, match, icon }) => (
        <TopNavItem key={to} href={to} label={t(key)} icon={<NavIcon sources={icon} size={24} />} isSelected={match.some((m) => pathname.startsWith(m))} />
    ))

    return (
        <div className="flex min-h-screen flex-col">
            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-semibold"
            >
                {t('skipToContent')}
            </a>

            {/* 헤더는 모든 너비에서 한 줄(49px). 이에 맞춘 sticky 오프셋 top-12.25 가
                PokedexFilterBar 와 ItemListPage 에 있다. 높이를 바꾸면 함께 고친다. 좁은 화면의 섹션 이동은 BottomTabs. */}
            <header className="sticky top-0 z-50 border-b border-border bg-surface">
                <div className="mx-auto max-w-7xl sm:px-2">
                    <TopNav
                        label="Main"
                        heading={<TopNavHeading logo={<Mark className="h-7 w-7" />} heading="Pokestra" headingHref="/" />}
                        startContent={<span className="hidden items-center gap-1 lg:flex">{items}</span>}
                        endContent={
                            <HStack gap={1} vAlign="center">
                                <ColorModeMenu />
                                <LanguageSwitch />
                            </HStack>
                        }
                    />
                </div>
            </header>

            <main id="main" className="flex-1 max-lg:pb-16">
                <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
                    <Suspense fallback={fallback}>
                        <Outlet />
                    </Suspense>
                </div>
            </main>

            <footer className="border-t border-border px-4 py-8 max-lg:pb-24 text-center text-xs leading-relaxed text-secondary">
                <p>{t('footerData')}</p>
                <p>{t('footerCopyright')}</p>
                <p>{t('footerFan')}</p>
            </footer>

            <BackToTop label={t('backToTop')} />
            <BottomTabs pathname={pathname} label={t('sections')} />
        </div>
    )
}

export default MainLayout
