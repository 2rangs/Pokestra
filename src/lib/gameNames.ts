import type { Lang } from '../i18n'
import { titleCaseSlug } from './dex'

/** PokeAPI version(작품 하나) → 이름. 도감 설명의 출처 표기용 */
const VERSION_NAME: Record<string, Record<Lang, string>> = {
    red: { ko: '레드', en: 'Red', ja: '赤' },
    green: { ko: '그린', en: 'Green (JP)', ja: '緑' },
    blue: { ko: '블루', en: 'Blue', ja: '青' },
    yellow: { ko: '피카츄', en: 'Yellow', ja: 'ピカチュウ' },
    gold: { ko: '금', en: 'Gold', ja: '金' },
    silver: { ko: '은', en: 'Silver', ja: '銀' },
    crystal: { ko: '크리스탈', en: 'Crystal', ja: 'クリスタル' },
    ruby: { ko: '루비', en: 'Ruby', ja: 'ルビー' },
    sapphire: { ko: '사파이어', en: 'Sapphire', ja: 'サファイア' },
    emerald: { ko: '에메랄드', en: 'Emerald', ja: 'エメラルド' },
    firered: { ko: '파이어레드', en: 'FireRed', ja: 'ファイアレッド' },
    leafgreen: { ko: '리프그린', en: 'LeafGreen', ja: 'リーフグリーン' },
    diamond: { ko: '디아루가', en: 'Diamond', ja: 'ダイヤモンド' },
    pearl: { ko: '펄기아', en: 'Pearl', ja: 'パール' },
    platinum: { ko: 'Pt 기라티나', en: 'Platinum', ja: 'プラチナ' },
    heartgold: { ko: '하트골드', en: 'HeartGold', ja: 'ハートゴールド' },
    soulsilver: { ko: '소울실버', en: 'SoulSilver', ja: 'ソウルシルバー' },
    black: { ko: '블랙', en: 'Black', ja: 'ブラック' },
    white: { ko: '화이트', en: 'White', ja: 'ホワイト' },
    'black-2': { ko: '블랙2', en: 'Black 2', ja: 'ブラック2' },
    'white-2': { ko: '화이트2', en: 'White 2', ja: 'ホワイト2' },
    x: { ko: 'X', en: 'X', ja: 'X' },
    y: { ko: 'Y', en: 'Y', ja: 'Y' },
    'omega-ruby': { ko: '오메가루비', en: 'Omega Ruby', ja: 'オメガルビー' },
    'alpha-sapphire': { ko: '알파사파이어', en: 'Alpha Sapphire', ja: 'アルファサファイア' },
    sun: { ko: '썬', en: 'Sun', ja: 'サン' },
    moon: { ko: '문', en: 'Moon', ja: 'ムーン' },
    'ultra-sun': { ko: '울트라썬', en: 'Ultra Sun', ja: 'ウルトラサン' },
    'ultra-moon': { ko: '울트라문', en: 'Ultra Moon', ja: 'ウルトラムーン' },
    'lets-go-pikachu': { ko: '레츠고! 피카츄', en: "Let's Go, Pikachu!", ja: "Let's Go! ピカチュウ" },
    'lets-go-eevee': { ko: '레츠고! 이브이', en: "Let's Go, Eevee!", ja: "Let's Go! イーブイ" },
    sword: { ko: '소드', en: 'Sword', ja: 'ソード' },
    shield: { ko: '실드', en: 'Shield', ja: 'シールド' },
    'legends-arceus': { ko: '레전드 아르세우스', en: 'Legends: Arceus', ja: 'LEGENDS アルセウス' },
    'brilliant-diamond': { ko: '브릴리언트 다이아몬드', en: 'Brilliant Diamond', ja: 'ブリリアントダイヤモンド' },
    'shining-pearl': { ko: '샤이닝 펄', en: 'Shining Pearl', ja: 'シャイニングパール' },
    scarlet: { ko: '스칼렛', en: 'Scarlet', ja: 'スカーレット' },
    violet: { ko: '바이올렛', en: 'Violet', ja: 'バイオレット' },
    'legends-za': { ko: '레전드 Z-A', en: 'Legends: Z-A', ja: 'LEGENDS Z-A' },
    champions: { ko: '챔피언스', en: 'Champions', ja: 'チャンピオンズ' },
}

/** 작품 이름 (모르는 slug 는 제목 형태로) */
export function versionName(slug: string, lang: Lang): string {
    return VERSION_NAME[slug]?.[lang] ?? titleCaseSlug(slug)
}

/** 출처 표기: "포켓몬스터 스칼렛" / "Pokémon Scarlet" / "ポケットモンスター スカーレット" */
export function gameTitle(slug: string, lang: Lang): string {
    const name = versionName(slug, lang)
    if (lang === 'ko') return `포켓몬스터 ${name}`
    if (lang === 'ja') return `ポケットモンスター ${name}`
    return `Pokémon ${name}`
}

export const KNOWN_VERSIONS: readonly string[] = Object.keys(VERSION_NAME)

/** 작품 → 세대 (도감 설명을 세대 선택과 맞추는 데 쓴다) */
const VERSION_GEN: Record<string, number> = {
    red: 1, green: 1, blue: 1, yellow: 1,
    gold: 2, silver: 2, crystal: 2,
    ruby: 3, sapphire: 3, emerald: 3, firered: 3, leafgreen: 3,
    diamond: 4, pearl: 4, platinum: 4, heartgold: 4, soulsilver: 4,
    black: 5, white: 5, 'black-2': 5, 'white-2': 5,
    x: 6, y: 6, 'omega-ruby': 6, 'alpha-sapphire': 6,
    sun: 7, moon: 7, 'ultra-sun': 7, 'ultra-moon': 7, 'lets-go-pikachu': 7, 'lets-go-eevee': 7,
    sword: 8, shield: 8, 'legends-arceus': 8, 'brilliant-diamond': 8, 'shining-pearl': 8,
    scarlet: 9, violet: 9, 'legends-za': 9, champions: 9,
}

/** 작품의 세대 (모르면 null) */
export function versionGeneration(slug: string): number | null {
    return VERSION_GEN[slug] ?? null
}

/**
 * 스프라이트 묶음 이름("scarlet-violet", "omegaruby-alphasapphire", "lets-go-pikachu-lets-go-eevee") → "스칼렛 · 바이올렛".
 * 아는 작품 이름을 긴 것부터 앞에서 맞춰 나간다. 못 맞추면 제목 형태로.
 */
export function spriteGameName(key: string, lang: Lang): string {
    if (VERSION_NAME[key]) return VERSION_NAME[key][lang]
    const flat = (v: string) => v.replace(/-/g, '')
    const known = Object.keys(VERSION_NAME).sort((a, b) => flat(b).length - flat(a).length)
    let rest = flat(key)
    const found: string[] = []
    while (rest) {
        const v = known.find((k) => rest.startsWith(flat(k)))
        if (!v) return titleCaseSlug(key)
        found.push(v)
        rest = rest.slice(flat(v).length)
    }
    return found.map((v) => VERSION_NAME[v][lang]).join(' · ')
}
