/**
 * 가벼운 다국어(i18n) 모듈.
 *
 * - 지원 언어: 한국어(기본) / English / 日本語
 * - 선택한 언어는 localStorage 에 저장되고, 처음 방문 시 브라우저 언어로 정한다.
 * - 메시지는 화면 단위 네임스페이스(`src/i18n/messages/*.ts`)로 나뉘며,
 *   `defineMessages` 가 en/ja 에 ko 와 같은 키가 모두 있는지 타입으로 검사한다.
 *
 * 사용법:
 *   const t = useT(homeMessages)
 *   t('title')                      // 문자열
 *   t('count', { n: 3 })            // "{n}" 자리 치환
 */
import { useCallback, useEffect } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const LANGS = ['ko', 'en', 'ja'] as const
export type Lang = (typeof LANGS)[number]

export const LANG_LABEL: Record<Lang, string> = { ko: '한국어', en: 'English', ja: '日本語' }
/** Intl 로캘 (숫자/정렬) */
export const LANG_LOCALE: Record<Lang, string> = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP' }

function detectLang(): Lang {
    if (typeof navigator === 'undefined') return 'ko'
    for (const l of navigator.languages ?? [navigator.language]) {
        const base = l.toLowerCase().split('-')[0]
        if ((LANGS as readonly string[]).includes(base)) return base as Lang
    }
    return 'ko'
}

interface LangState {
    lang: Lang
    setLang: (lang: Lang) => void
}

export const useLangStore = create<LangState>()(
    persist(
        (set) => ({
            lang: detectLang(),
            setLang: (lang) => set({ lang }),
        }),
        { name: 'pokestra-lang', storage: createJSONStorage(() => localStorage) },
    ),
)

/** 현재 언어 */
export function useLang(): Lang {
    return useLangStore((s) => s.lang)
}

/** 컴포넌트 밖(이벤트 핸들러, 유틸)에서 현재 언어 읽기 */
export function getLang(): Lang {
    return useLangStore.getState().lang
}

// ── 메시지 ──

export type Vars = Record<string, string | number>
export type MessageDict = Record<string, string>
export type Messages<K extends string> = { ko: Record<K, string>; en: Record<K, string>; ja: Record<K, string> }

/** ko 를 기준으로 en/ja 에 같은 키가 빠짐없이 있는지 타입 검사 */
export function defineMessages<const K extends string>(m: {
    ko: Record<K, string>
    en: NoInfer<Record<K, string>>
    ja: NoInfer<Record<K, string>>
}): Messages<K> {
    return m
}

export function format(template: string, vars?: Vars, lang: Lang = getLang()): string {
    if (!vars) return template
    return template.replace(/\{(\w+)\}/g, (_, k: string) => {
        const v = vars[k]
        if (v == null) return `{${k}}`
        return typeof v === 'number' ? v.toLocaleString(LANG_LOCALE[lang]) : v
    })
}

export type TFunction<K extends string> = (key: K, vars?: Vars) => string

/** 메시지 네임스페이스에 묶인 번역 함수 (언어가 바뀌면 다시 렌더) */
export function useT<K extends string>(messages: Messages<K>): TFunction<K> {
    const lang = useLang()
    return useCallback(
        (key: K, vars?: Vars) => format(messages[lang][key] ?? messages.ko[key] ?? key, vars, lang),
        [messages, lang],
    )
}

/** 훅 밖에서 쓰는 번역 (현재 언어 기준) */
export function translate<K extends string>(messages: Messages<K>, key: K, vars?: Vars, lang: Lang = getLang()): string {
    return format(messages[lang][key] ?? messages.ko[key] ?? key, vars, lang)
}

// ── 포맷 ──

export function formatNumber(n: number, lang: Lang, opts?: Intl.NumberFormatOptions): string {
    return n.toLocaleString(LANG_LOCALE[lang], opts)
}

const collators = new Map<Lang, Intl.Collator>()
export function collator(lang: Lang): Intl.Collator {
    let c = collators.get(lang)
    if (!c) collators.set(lang, (c = new Intl.Collator(LANG_LOCALE[lang], { numeric: true })))
    return c
}

/** <html lang> 와 문서 제목을 현재 언어에 맞춘다 */
export function useDocumentLang() {
    const lang = useLang()
    useEffect(() => {
        document.documentElement.lang = lang
    }, [lang])
}

/** 페이지 제목 설정 ("{title} · Pokestra") */
export function useDocumentTitle(title: string | null | undefined) {
    useEffect(() => {
        document.title = title ? `${title} · Pokestra` : 'Pokestra'
    }, [title])
}
