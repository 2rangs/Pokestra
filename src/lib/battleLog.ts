// ─── 배틀 로그 / 상태 이름 다국어화 ─────────────────────────────
// 로그 문장은 엔진의 createFormatter(ko/en/ja 로케일)가 만든다.
// Pokestra 는 이름만 자체 도감 이름표로 넘기고(폼 이름·한국어 표기 일관성),
// 자동 닉네임(예전 버전의 한국어 이름 등)은 종 이름으로 바꿔 언어를 따라가게 한다.
import {
    createFormatter, CONDITION_ENTITY, SHOWN_VOLATILES, getSpecies,
    type BattleEvent, type BattlePokemon, type FormatContext, type Formatter, type PlayerID, type PokemonSet,
} from '@kyasi/pokebattle-engine'
import { LANGS, type Lang } from '../i18n'
import { namesFor, pokemonNameKo, pokemonNameL, prettify } from './battle'
import { ALL_POKEMON, pokemonName } from './dex'

// ─── 엔진 포매터 ─────────────────────────────────────────────

/** 지금 포맷 중인 프레임의 컨텍스트. 포매터는 동기라서 호출 직전에 바꿔 끼운다 */
let current: FormatContext = { getPokemon: () => undefined }

/** 자동 닉네임이면 nickname 을 지운 포켓몬 (엔진은 nickname 이 없으면 종 이름을 쓴다) */
function withoutAutoNickname(p: BattlePokemon | undefined): BattlePokemon | undefined {
    if (!p || !isAutoNickname(p.species, p.nickname, p.set?.species)) return p
    return { ...p, nickname: p.species }
}

const formatters = new Map<string, Formatter>()

/** 언어(+진영 이름 사용 여부)별 포매터. 이름은 Pokestra 이름표가 우선한다 */
function formatterFor(lang: Lang, named: boolean): Formatter {
    const key = `${lang}:${named ? 1 : 0}`
    let f = formatters.get(key)
    if (!f) {
        f = createFormatter({
            locale: lang,
            names: { ...namesFor(lang), pokemon: s => speciesName(s, lang) },
            getPokemon: id => withoutAutoNickname(current.getPokemon(id)),
            sideName: named ? (p: PlayerID) => current.sideName?.(p) ?? p : undefined,
        })
        formatters.set(key, f)
    }
    return f
}

/** 이름표만 쓰는 포매터 (상태·날씨 등 용어) */
const termsFor = (lang: Lang) => formatterFor(lang, false).name

/**
 * 배틀 이벤트 → 현재 언어의 로그 문장. 화면에 보여줄 필요 없는 이벤트는 null.
 * sideName 을 넘기면 "우리 편/상대 편" 대신 진영 이름을 쓴다 (관전 모드).
 */
export function formatBattleEvent(event: BattleEvent, ctx: FormatContext, lang: Lang): string | null {
    const prev = current
    current = ctx
    try {
        return formatterFor(lang, !!ctx.sideName).format(event)
    } finally {
        current = prev
    }
}

// ─── 이름 (칩·툴팁용) ─────────────────────────────────────────

/** en 용어는 소문자라 칩 라벨로 쓸 때 첫 글자를 대문자로 */
const cap = (s: string, lang: Lang) => (lang === 'en' ? s.replace(/^\p{Ll}/u, c => c.toUpperCase()) : s)

/** 상태이상 짧은 이름 (칩/배지용). 엔진 용어는 긴 이름뿐이라 en 만 약어를 둔다 */
const STATUS_SHORT_EN: Record<string, string> = {
    burn: 'BRN', freeze: 'FRZ', paralysis: 'PAR', poison: 'PSN', toxic: 'TOX', sleep: 'SLP',
}

export const statusName = (s: string, lang: Lang) =>
    lang === 'en' ? STATUS_SHORT_EN[s] ?? s.toUpperCase() : termsFor(lang).term('status', s)
/** 상태이상 긴 이름 (문장/툴팁용) */
export const statusLongName = (s: string, lang: Lang) => cap(termsFor(lang).term('status', s), lang)
export const weatherName = (w: string, lang: Lang) => cap(termsFor(lang).term('weather', w), lang)
export const terrainName = (t: string, lang: Lang) => cap(termsFor(lang).effect(t), lang)
export const sideConditionName = (c: string, lang: Lang) => cap(termsFor(lang).effect(c), lang)
export const fieldConditionName = (c: string, lang: Lang) => cap(termsFor(lang).effect(c), lang)
/** 화면에 보여줄 휘발성 상태면 이름, 아니면 null */
export const volatileName = (v: string, lang: Lang): string | null => {
    if (!SHOWN_VOLATILES.has(v)) return null
    const n = termsFor(lang)
    return cap(CONDITION_ENTITY[v] ? n.effect(v) : n.term('volatile', v), lang)
}

// ─── 포켓몬 이름 (자동 닉네임 무시) ────────────────────────────

/** 이름 데이터가 없어 slug(또는 ko/ja 에서 영문 slug 변환)로 대체된 이름인지 */
const slugLike = (name: string, species: string, lang: Lang) =>
    /^[a-z0-9-]+$/.test(name) || (lang !== 'en' && name === prettify(species))

/**
 * 종 이름 (현재 언어). 도감에 없는 배틀 전용 폼(예: minior-meteor)이라 slug 그대로 나오면
 * 기본 종 이름 + 폼 표기로 대신한다.
 */
function knownName(species: string, lang: Lang): string | null {
    const r = pokemonNameL(species, lang)
    if (!slugLike(r, species, lang)) return r
    // 기본 폼이 도감에 폼 이름으로만 있는 경우 (minior → minior-red-meteor)
    const formOf = ALL_POKEMON.find(p => p.name.startsWith(species + '-'))
    return formOf ? pokemonName(formOf, lang) : null
}

export function speciesName(species: string, lang: Lang): string {
    const known = knownName(species, lang)
    if (known) return known
    const parts = species.split('-')
    for (let i = parts.length - 1; i >= 1; i--) {
        const b = knownName(parts.slice(0, i).join('-'), lang)
        if (b) return `${b} (${prettify(parts.slice(i).join('-'))})`
    }
    return prettify(species)
}

/**
 * 세트 생성 시 자동으로 붙은 닉네임(예전 버전의 한국어 이름, 종 이름 등)인지.
 * 자동 닉네임은 언어를 바꿀 때 따라 바뀌어야 하므로 종 이름으로 대신 표시한다.
 */
function isAutoFor(species: string, nickname: string): boolean {
    if (nickname === species || nickname === getSpecies(species)?.name) return true
    if (nickname === pokemonNameKo(species)) return true
    return LANGS.some(l => nickname === pokemonNameL(species, l))
}

/**
 * setSpecies: 폼 체인지 전의 원래 종 (배틀 중 species 가 바뀌어도 원래 종 이름이면 자동 닉네임)
 */
export function isAutoNickname(species: string, nickname: string | null | undefined, setSpecies?: string | null): boolean {
    if (!nickname) return true
    return isAutoFor(species, nickname) || (!!setSpecies && setSpecies !== species && isAutoFor(setSpecies, nickname))
}

/** 표시 이름: 직접 붙인 닉네임이 있으면 그것, 아니면 현재 언어의 종 이름 */
export function pokemonLabel(
    species: string, nickname: string | null | undefined, lang: Lang, setSpecies?: string | null,
): string {
    return isAutoNickname(species, nickname, setSpecies) ? speciesName(species, lang) : nickname!
}

/** 자동 닉네임을 지운 세트 (저장/내보내기용) */
export function stripAutoNickname(set: PokemonSet): PokemonSet {
    if (set.nickname === undefined || !isAutoNickname(set.species, set.nickname)) return set
    const next = { ...set }
    delete next.nickname
    return next
}
