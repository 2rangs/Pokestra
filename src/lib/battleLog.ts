// ─── 배틀 로그 / 상태 이름 다국어화 ─────────────────────────────
// 엔진의 formatEvent 는 한국어 전용이다. ko 는 엔진에 맡기고,
// en / ja 는 같은 이벤트·사유를 같은 조건으로 처리하는 포매터를 둔다.
import {
    formatEvent,
    STATUS_NAME_KO, WEATHER_NAME_KO, TERRAIN_NAME_KO, SIDE_CONDITION_KO,
    FIELD_CONDITION_KO, VOLATILE_NAME_KO, getSpecies,
    type BattleEvent, type BattlePokemon, type FormatContext, type PlayerID, type PokemonSet,
} from '@kyasi/pokebattle-engine'
import { LANGS, type Lang } from '../i18n'
import { namesFor, pokemonNameKo, pokemonNameL, battleStatLabel, prettify } from './battle'
import { ALL_POKEMON, pokemonName } from './dex'

type Dict = Record<string, string>
type L3 = Record<Lang, Dict>

// ─── 이름 표 ─────────────────────────────────────────────────

/** 상태이상 (짧은 이름, 칩/배지용) */
const STATUS_NAMES: L3 = {
    ko: STATUS_NAME_KO,
    en: { burn: 'BRN', freeze: 'FRZ', paralysis: 'PAR', poison: 'PSN', toxic: 'TOX', sleep: 'SLP' },
    ja: { burn: 'やけど', freeze: 'こおり', paralysis: 'まひ', poison: 'どく', toxic: 'もうどく', sleep: 'ねむり' },
}
/** 상태이상 (긴 이름, 문장/툴팁용) */
const STATUS_LONG: L3 = {
    ko: STATUS_NAME_KO,
    en: { burn: 'Burned', freeze: 'Frozen', paralysis: 'Paralyzed', poison: 'Poisoned', toxic: 'Badly poisoned', sleep: 'Asleep' },
    ja: STATUS_NAMES.ja,
}
/** 출처 표기용 상태 이름 */
const STATUS_SOURCE: L3 = {
    ko: STATUS_NAME_KO,
    en: { burn: 'burn', freeze: 'freeze', paralysis: 'paralysis', poison: 'poison', toxic: 'bad poison', sleep: 'sleep' },
    ja: STATUS_NAMES.ja,
}

const WEATHER_NAMES: L3 = {
    ko: WEATHER_NAME_KO,
    en: {
        sun: 'Harsh Sunlight', harsh_sun: 'Extremely Harsh Sunlight', rain: 'Rain', heavy_rain: 'Heavy Rain',
        sandstorm: 'Sandstorm', snow: 'Snow', strong_winds: 'Strong Winds',
    },
    ja: {
        sun: 'にほんばれ', harsh_sun: 'おおひでり', rain: 'あめ', heavy_rain: 'おおあめ',
        sandstorm: 'すなあらし', snow: 'ゆき', strong_winds: 'らんきりゅう',
    },
}

const TERRAIN_NAMES: L3 = {
    ko: TERRAIN_NAME_KO,
    en: { electric: 'Electric Terrain', grassy: 'Grassy Terrain', misty: 'Misty Terrain', psychic: 'Psychic Terrain' },
    ja: { electric: 'エレキフィールド', grassy: 'グラスフィールド', misty: 'ミストフィールド', psychic: 'サイコフィールド' },
}

const SIDE_CONDITION_NAMES: L3 = {
    ko: SIDE_CONDITION_KO,
    en: {
        reflect: 'Reflect', light_screen: 'Light Screen', aurora_veil: 'Aurora Veil', spikes: 'Spikes',
        toxic_spikes: 'Toxic Spikes', stealth_rock: 'Stealth Rock', sticky_web: 'Sticky Web', tailwind: 'Tailwind',
        lucky_chant: 'Lucky Chant', safeguard: 'Safeguard', mist: 'Mist', wish: 'Wish',
    },
    ja: {
        reflect: 'リフレクター', light_screen: 'ひかりのかべ', aurora_veil: 'オーロラベール', spikes: 'まきびし',
        toxic_spikes: 'どくびし', stealth_rock: 'ステルスロック', sticky_web: 'ねばねばネット', tailwind: 'おいかぜ',
        lucky_chant: 'おまじない', safeguard: 'しんぴのまもり', mist: 'しろいきり', wish: 'ねがいごと',
    },
}

const FIELD_CONDITION_NAMES: L3 = {
    ko: FIELD_CONDITION_KO,
    en: {
        trick_room: 'Trick Room', gravity: 'Gravity', magic_room: 'Magic Room', wonder_room: 'Wonder Room',
        mud_sport: 'Mud Sport', water_sport: 'Water Sport',
    },
    ja: {
        trick_room: 'トリックルーム', gravity: 'じゅうりょく', magic_room: 'マジックルーム', wonder_room: 'ワンダールーム',
        mud_sport: 'どろあそび', water_sport: 'みずあそび',
    },
}

const VOLATILE_NAMES: L3 = {
    ko: VOLATILE_NAME_KO,
    en: {
        confusion: 'Confusion', flinch: 'Flinch', seeded: 'Leech Seed', bound: 'Bound', infatuation: 'Infatuation',
        curse: 'Curse', aqua_ring: 'Aqua Ring', ingrain: 'Ingrain', magnet_rise: 'Magnet Rise', taunt: 'Taunt',
        encore: 'Encore', yawn: 'Drowsy', protect: 'Protect', kings_shield: "King's Shield", spiky_shield: 'Spiky Shield',
        baneful_bunker: 'Baneful Bunker', silk_trap: 'Silk Trap', burning_bulwark: 'Burning Bulwark', obstruct: 'Obstruct',
        endure: 'Endure', focus_energy: 'Focus Energy', substitute: 'Substitute', salt_cure: 'Salt Cure',
        flash_fire: 'Flash Fire', heal_block: 'Heal Block', embargo: 'Embargo', destiny_bond: 'Destiny Bond',
    },
    ja: {
        confusion: 'こんらん', flinch: 'ひるみ', seeded: 'やどりぎのタネ', bound: 'バインド', infatuation: 'メロメロ',
        curse: 'のろい', aqua_ring: 'アクアリング', ingrain: 'ねをはる', magnet_rise: 'でんじふゆう', taunt: 'ちょうはつ',
        encore: 'アンコール', yawn: 'ねむけ', protect: 'まもる', kings_shield: 'キングシールド', spiky_shield: 'ニードルガード',
        baneful_bunker: 'トーチカ', silk_trap: 'スレッドトラップ', burning_bulwark: 'かえんのまもり', obstruct: 'ブロッキング',
        endure: 'こらえる', focus_energy: 'きあいだめ', substitute: 'みがわり', salt_cure: 'しおづけ',
        flash_fire: 'もらいび', heal_block: 'かいふくふうじ', embargo: 'さしおさえ', destiny_bond: 'みちづれ',
    },
}

const SOURCE_NAMES: Record<'en' | 'ja', Dict> = {
    en: {
        drain: 'drain', recoil: 'recoil', confusion: 'confusion', crash: 'crash damage', 'leech-seed': 'Leech Seed',
        curse: 'Curse', bind: 'Bind', 'salt-cure': 'Salt Cure', 'grassy-terrain': 'Grassy Terrain', 'aqua-ring': 'Aqua Ring',
        ingrain: 'Ingrain', 'pain-split': 'Pain Split', 'liquid-ooze': 'Liquid Ooze', 'poison-heal': 'Poison Heal',
        'rain-dish': 'Rain Dish', 'ice-body': 'Ice Body', 'dry-skin': 'Dry Skin', 'solar-power': 'Solar Power',
        'bad-dreams': 'Bad Dreams', regenerator: 'Regenerator', substitute: 'Substitute', 'belly-drum': 'Belly Drum',
    },
    ja: {
        drain: '吸収', recoil: '反動', confusion: 'こんらん', crash: '自爆ダメージ', 'leech-seed': 'やどりぎのタネ',
        curse: 'のろい', bind: 'バインド', 'salt-cure': 'しおづけ', 'grassy-terrain': 'グラスフィールド', 'aqua-ring': 'アクアリング',
        ingrain: 'ねをはる', 'pain-split': 'いたみわけ', 'liquid-ooze': 'ヘドロえき', 'poison-heal': 'ポイズンヒール',
        'rain-dish': 'あめうけざら', 'ice-body': 'アイスボディ', 'dry-skin': 'かんそうはだ', 'solar-power': 'サンパワー',
        'bad-dreams': 'ナイトメア', regenerator: 'さいせいりょく', substitute: 'みがわり', 'belly-drum': 'はらだいこ',
    },
}

/** 로그 문장 속 능력치 이름 */
const STAT_NAMES: Record<'en' | 'ja', Dict> = {
    en: {
        hp: 'HP', attack: 'Attack', defense: 'Defense', special_attack: 'Sp. Atk', special_defense: 'Sp. Def',
        speed: 'Speed', accuracy: 'accuracy', evasion: 'evasiveness',
    },
    ja: {
        hp: 'HP', attack: 'こうげき', defense: 'ぼうぎょ', special_attack: 'とくこう', special_defense: 'とくぼう',
        speed: 'すばやさ', accuracy: '命中率', evasion: '回避率',
    },
}

const pick = (table: L3, key: string | null | undefined, lang: Lang): string =>
    key ? table[lang][key] ?? table.ko[key] ?? key : ''

export const statusName = (s: string, lang: Lang) => pick(STATUS_NAMES, s, lang)
export const statusLongName = (s: string, lang: Lang) => pick(STATUS_LONG, s, lang)
export const weatherName = (w: string, lang: Lang) => pick(WEATHER_NAMES, w, lang)
export const terrainName = (t: string, lang: Lang) => pick(TERRAIN_NAMES, t, lang)
export const sideConditionName = (c: string, lang: Lang) => pick(SIDE_CONDITION_NAMES, c, lang)
export const fieldConditionName = (c: string, lang: Lang) => pick(FIELD_CONDITION_NAMES, c, lang)
/** 화면에 보여줄 휘발성 상태면 이름, 아니면 null */
export const volatileName = (v: string, lang: Lang): string | null =>
    VOLATILE_NAME_KO[v] ? pick(VOLATILE_NAMES, v, lang) : null

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

// ─── 로그 포매터 ─────────────────────────────────────────────

/** 엔진 포매터에 넘길 때 자동 닉네임을 종 이름으로 바꿔 둔다 */
function withSpeciesNames(ctx: FormatContext): FormatContext {
    return {
        ...ctx,
        getPokemon: id => {
            const p = ctx.getPokemon(id)
            if (!p || !isAutoNickname(p.species, p.nickname, p.set?.species)) return p
            return { ...p, nickname: p.species }
        },
    }
}

/**
 * 배틀 이벤트 → 현재 언어의 로그 문장. 화면에 보여줄 필요 없는 이벤트는 null.
 * ko 는 엔진의 formatEvent, en/ja 는 같은 분기 구조를 따르는 자체 포매터.
 */
export function formatBattleEvent(event: BattleEvent, ctx: FormatContext, lang: Lang): string | null {
    const safeCtx = withSpeciesNames(ctx)
    if (lang === 'ko') return formatEvent(event, safeCtx, { ...namesFor('ko'), pokemon: s => speciesName(s, 'ko') })
    const text = lang === 'ja' ? formatJa(event, safeCtx) : formatEn(event, safeCtx)
    if (text === null) return null
    // 문장 첫 글자 대문자 ("the opposing X …" → "The opposing X …", "[the opposing …]" 포함)
    return lang === 'en' ? text.replace(/^([[(]*)(\p{Ll})/u, (_, pre: string, c: string) => pre + c.toUpperCase()) : text
}

interface Helpers {
    /** 접두어 없는 이름 */
    base: (id: string) => string
    /** "the opposing X" / "相手の X" 접두어 포함 */
    pName: (id: string) => string
    mName: (n: string) => string
    aName: (n: string) => string
    iName: (n: string) => string
    tName: (n: string) => string
    source: (s: string) => string
    maxHp: (id: string) => number
}

function helpers(ctx: FormatContext, lang: 'en' | 'ja'): Helpers {
    const names = namesFor(lang)
    const base = (id: string) => {
        const p: BattlePokemon | undefined = ctx.getPokemon(id)
        if (!p) return id
        return p.nickname && p.nickname !== p.species && p.nickname !== p.set?.species
            ? p.nickname
            : speciesName(p.species, lang)
    }
    const pName = (id: string) => {
        if (!ctx.getPokemon(id)) return id
        const opp = !id.startsWith('p1')
        return lang === 'ja' ? `${opp ? '相手の ' : ''}${base(id)}` : `${opp ? 'the opposing ' : ''}${base(id)}`
    }
    const iName = (n: string) => names.item!(n)
    const source = (s: string) =>
        SOURCE_NAMES[lang][s] ?? SIDE_CONDITION_NAMES[lang][s.replace(/-/g, '_')] ?? STATUS_SOURCE[lang][s]
        ?? WEATHER_NAMES[lang][s] ?? iName(s)
    return {
        base, pName, iName, source,
        mName: n => names.move!(n),
        aName: n => names.ability!(n),
        tName: n => names.type!(n),
        maxHp: id => ctx.getPokemon(id)?.max_hp ?? 0,
    }
}

const pctOf = (amount: number, max: number) => (max ? Math.round(amount / max * 100) : 0)

// ── English ──

const EN_CANT_MOVE: Dict = {
    sleep: '{p} is fast asleep.',
    freeze: '{p} is frozen solid!',
    paralysis: "{p} is paralyzed! It can't move!",
    flinch: "{p} flinched and couldn't move!",
    confusion: '{p} hurt itself in its confusion!',
    recharge: '{p} must recharge!',
    taunt: "{p} can't use status moves after the taunt!",
    no_pp: '{p} has no PP left for the move!',
    infatuation: '{p} is immobilized by love!',
    truant: '{p} is loafing around!',
}
const EN_STATUS_APPLY: Dict = {
    burn: '{p} was burned!', freeze: '{p} was frozen solid!', paralysis: "{p} is paralyzed! It may be unable to move!",
    poison: '{p} was poisoned!', toxic: '{p} was badly poisoned!', sleep: '{p} fell asleep!',
}
const EN_STATUS_REMOVE: Dict = {
    burn: "{p}'s burn was healed!", freeze: '{p} thawed out!', paralysis: '{p} was cured of paralysis!',
    poison: '{p} was cured of its poisoning!', toxic: '{p} was cured of its poisoning!', sleep: '{p} woke up!',
}
const EN_VOLATILE_APPLY: Dict = {
    confusion: '{p} became confused!', seeded: '{p} was seeded!', bound: '{p} was trapped!',
    infatuation: '{p} fell in love!', curse: '{p} was cursed!', aqua_ring: '{p} surrounded itself with a veil of water!',
    ingrain: '{p} planted its roots!', magnet_rise: '{p} levitated with electromagnetism!', taunt: '{p} fell for the taunt!',
    encore: '{p} received an encore!', yawn: '{p} grew drowsy!', protect: '{p} protected itself!',
    kings_shield: '{p} protected itself!', spiky_shield: '{p} protected itself!', baneful_bunker: '{p} protected itself!',
    silk_trap: '{p} protected itself!', burning_bulwark: '{p} protected itself!', obstruct: '{p} protected itself!',
    endure: '{p} braced itself!', focus_energy: '{p} is getting pumped!', substitute: '{p} put in a substitute!',
    salt_cure: '{p} is being salt cured!', flash_fire: "The power of {p}'s Fire-type moves rose!",
    heal_block: '{p} was prevented from healing!', embargo: "{p} can't use items anymore!",
    destiny_bond: '{p} is hoping to take its attacker down with it!', flinch: '{p} flinched!',
}
const EN_VOLATILE_REMOVE: Dict = {
    confusion: '{p} snapped out of its confusion!', substitute: "{p}'s substitute faded!", taunt: '{p} shook off the taunt!',
    encore: "{p}'s encore ended!", seeded: '{p} was freed from Leech Seed!', bound: '{p} was freed from the bind!',
}
const EN_WEATHER: Dict = {
    sun: 'The sunlight turned harsh!', harsh_sun: 'The sunlight turned extremely harsh!', rain: 'It started to rain!',
    heavy_rain: 'A heavy rain began to fall!', sandstorm: 'A sandstorm kicked up!', snow: 'It started to snow!',
    strong_winds: 'Mysterious strong winds are protecting Flying-type Pokémon!',
}
const EN_TERRAIN: Dict = {
    electric: 'An electric current ran across the battlefield!', grassy: 'Grass grew to cover the battlefield!',
    misty: 'Mist swirled around the battlefield!', psychic: 'The battlefield got weird!',
}
const EN_FIELD_START: Dict = { trick_room: 'The dimensions were twisted!', gravity: 'Gravity intensified!' }
const EN_FIELD_END: Dict = { trick_room: 'The twisted dimensions returned to normal!', gravity: 'Gravity returned to normal!' }
const EN_ACTIVATE: Dict = {
    'cure-team': "The team's status conditions were cured!",
    clearallboost: 'All stat changes were eliminated!',
    clearboost: 'Its stat changes were removed!',
    clearnegativeboost: 'Its lowered stats returned to normal!',
    clearpositiveboost: 'Its raised stats returned to normal!',
    setboost: 'Its stats changed!',
    invertboost: 'Its stat changes were inverted!',
    swapboost: 'Stat changes were swapped!',
    copyboost: 'Stat changes were copied!',
    typechange: 'Its type changed!',
    charging: 'It is charging power!',
    'court-change': 'The effects on each side of the field were swapped!',
    ohko: "It's a one-hit KO!",
    'ability-suppressed': 'Its Ability was suppressed!',
}

const fill = (tpl: string, p: string) => tpl.replace('{p}', p)

function formatEn(event: BattleEvent, ctx: FormatContext): string | null {
    const h = helpers(ctx, 'en')
    const { pName, base, mName, aName, iName, tName, source } = h
    /** 진영 이름 ("your team" / "the opposing team" / "CPU 1's team") */
    const side = (p: PlayerID) => (ctx.sideName ? `${ctx.sideName(p)}'s team` : p === 'p1' ? 'your team' : 'the opposing team')
    const sideOwn = (p: PlayerID) => (ctx.sideName ? `${ctx.sideName(p)}'s team's` : p === 'p1' ? "your team's" : "the opposing team's")

    switch (event.type) {
        case 'battle_start':
            return `${event.p1} vs. ${event.p2} — the battle begins!`
        case 'turn_start':
            return `── Turn ${event.turn} ──`
        case 'turn_end':
            return null
        case 'move_use':
            return `${pName(event.pokemon_id)} used ${mName(event.move.name)}!`
        case 'move_miss':
            return event.target_id ? `${pName(event.target_id)} avoided the attack!` : 'The attack missed!'
        case 'move_fail':
            if (event.reason === 'protect') return 'The attack was blocked by a protective move!'
            if (event.reason === 'substitute') return 'The substitute took the hit instead!'
            if (event.reason === 'fail' || event.reason === 'no-target') return 'But it failed!'
            return event.reason ? `But it failed! (${source(event.reason)})` : 'But it failed!'
        case 'cant_move':
            if (event.reason === 'other') return `${pName(event.pokemon_id)} can't move!${event.detail ? ` (${mName(event.detail)})` : ''}`
            return EN_CANT_MOVE[event.reason]
                ? fill(EN_CANT_MOVE[event.reason]!, pName(event.pokemon_id))
                : `${pName(event.pokemon_id)} can't move! (${event.reason})`
        case 'damage': {
            if (event.source === 'substitute') return `The substitute took damage for ${pName(event.pokemon_id)}!`
            const pct = pctOf(event.amount, h.maxHp(event.pokemon_id))
            const parts: string[] = []
            if (event.crit) parts.push('A critical hit!')
            if (event.effectiveness !== undefined) {
                if (event.effectiveness > 1) parts.push("It's super effective!")
                else if (event.effectiveness > 0 && event.effectiveness < 1) parts.push("It's not very effective…")
            }
            const indirect = !event.effectiveness && event.source && event.source !== 'confusion' ? ` (${source(event.source)})` : ''
            const lead = parts.length ? `${parts.join(' ')} ` : ''
            const name = pName(event.pokemon_id)
            return `${lead}${lead ? name.charAt(0).toUpperCase() + name.slice(1) : name} took ${event.amount} damage (-${pct}%)${indirect}`
        }
        case 'heal':
            return `${pName(event.pokemon_id)} restored ${event.amount} HP${event.source ? ` (${source(event.source)})` : ''}`
        case 'immune':
            return `It doesn't affect ${pName(event.pokemon_id)}…${event.source && event.source !== 'type' ? ` (${aName(event.source)})` : ''}`
        case 'faint':
            return `${pName(event.pokemon_id)} fainted!`
        case 'status_apply': {
            const tpl = EN_STATUS_APPLY[event.status]
            return tpl ? fill(tpl, pName(event.pokemon_id)) : `${pName(event.pokemon_id)} is now affected by ${event.status}!`
        }
        case 'status_remove': {
            const tpl = EN_STATUS_REMOVE[event.status]
            return tpl ? fill(tpl, pName(event.pokemon_id)) : `${pName(event.pokemon_id)} recovered from ${event.status}!`
        }
        case 'volatile_apply': {
            if (!VOLATILE_NAME_KO[event.volatile]) return null
            const tpl = EN_VOLATILE_APPLY[event.volatile]
            return tpl ? fill(tpl, pName(event.pokemon_id)) : `${pName(event.pokemon_id)}: ${VOLATILE_NAMES.en[event.volatile] ?? event.volatile}`
        }
        case 'volatile_remove': {
            if (!VOLATILE_NAME_KO[event.volatile]) return null
            const tpl = EN_VOLATILE_REMOVE[event.volatile]
            return tpl ? fill(tpl, pName(event.pokemon_id)) : `${pName(event.pokemon_id)}'s ${VOLATILE_NAMES.en[event.volatile] ?? event.volatile} wore off!`
        }
        case 'stat_change': {
            const stat = STAT_NAMES.en[event.stat] ?? battleStatLabel(event.stat, 'en')
            const actual = event.actual ?? event.stages
            if (actual === 0) return `${pName(event.pokemon_id)}'s ${stat} won't go any ${event.stages > 0 ? 'higher' : 'lower'}!`
            const n = Math.abs(actual)
            const verb = actual > 0
                ? n >= 3 ? 'rose drastically' : n === 2 ? 'rose sharply' : 'rose'
                : n >= 3 ? 'severely fell' : n === 2 ? 'harshly fell' : 'fell'
            return `${pName(event.pokemon_id)}'s ${stat} ${verb}!`
        }
        case 'weather_change':
            return event.weather
                ? EN_WEATHER[event.weather] ?? `The weather became ${WEATHER_NAMES.en[event.weather] ?? event.weather}!`
                : 'The weather returned to normal.'
        case 'terrain_change':
            return event.terrain
                ? EN_TERRAIN[event.terrain] ?? `${TERRAIN_NAMES.en[event.terrain] ?? event.terrain} spread across the battlefield!`
                : 'The terrain returned to normal.'
        case 'side_start': {
            const cond = SIDE_CONDITION_NAMES.en[event.condition] ?? event.condition
            const layers = (event.layers ?? 1) > 1 ? ` (${event.layers} layers)` : ''
            return `${cond} took effect on ${side(event.player)}!${layers}`
        }
        case 'side_end':
            return `${sideOwn(event.player)} ${SIDE_CONDITION_NAMES.en[event.condition] ?? event.condition} wore off.`
        case 'field_start':
            return EN_FIELD_START[event.condition] ?? `${FIELD_CONDITION_NAMES.en[event.condition] ?? event.condition} took effect!`
        case 'field_end':
            return EN_FIELD_END[event.condition] ?? `${FIELD_CONDITION_NAMES.en[event.condition] ?? event.condition} wore off.`
        case 'switch': {
            const inP = base(event.in_id)
            if (event.forced) return `${pName(event.in_id)} was dragged out!`
            if (ctx.sideName) return `${ctx.sideName(event.player)} sent out ${inP}!`
            if (!event.out_id) return event.player === 'p1' ? `Go! ${inP}!` : `The opposing trainer sent out ${inP}!`
            return event.player === 'p1' ? `Come back! Go! ${inP}!` : `The opposing trainer switched to ${inP}!`
        }
        case 'ability_trigger':
            return `[${pName(event.pokemon_id)}'s ${aName(event.ability)}]`
        case 'item_consume':
            return `${pName(event.pokemon_id)}'s ${iName(event.item)} was used up!`
        case 'item_activate':
            return `${pName(event.pokemon_id)}'s ${iName(event.item)} activated!`
        case 'terastallize':
            return `${pName(event.pokemon_id)} Terastallized into the ${tName(event.tera_type)} type!`
        case 'hit_count':
            return `The Pokémon was hit ${event.hits} time${event.hits === 1 ? '' : 's'}!`
        case 'activate': {
            const msg = EN_ACTIVATE[event.effect]
            if (msg) return `${event.pokemon_id ? `${pName(event.pokemon_id)}: ` : ''}${msg}`
            if (!event.pokemon_id) return null
            return `${pName(event.pokemon_id)}: ${source(event.effect)}${event.detail ? ` (${source(event.detail)})` : ''}`
        }
        case 'forme_change':
            return `${pName(event.pokemon_id)} changed its form!`
        case 'message':
            return event.text
        case 'battle_end':
            if (event.winner === 'draw') return 'The battle ended in a draw!'
            if (ctx.sideName) return `${ctx.sideName(event.winner)} won the battle!`
            return event.winner === 'p1' ? 'You won the battle!' : 'The opposing trainer won the battle!'
    }
    return null
}

// ── 日本語 ──

const JA_CANT_MOVE: Dict = {
    sleep: '{p}は ぐうぐう 眠っている。',
    freeze: '{p}は 凍ってしまって 動けない！',
    paralysis: '{p}は 体が しびれて 動けない！',
    flinch: '{p}は ひるんで 技が 出せない！',
    confusion: '{p}は わけも わからず 自分を 攻撃した！',
    recharge: '{p}は 攻撃の 反動で 動けない！',
    taunt: '{p}は ちょうはつされて 変化技が 出せない！',
    no_pp: '{p}の 技の 残りPPが ない！',
    infatuation: '{p}は メロメロで 技が 出せなかった！',
    truant: '{p}は なまけている。',
}
const JA_STATUS_APPLY: Dict = {
    burn: '{p}は やけどを 負った！', freeze: '{p}は 凍りついた！', paralysis: '{p}は まひして 技が 出にくくなった！',
    poison: '{p}は 毒を あびた！', toxic: '{p}は 猛毒を あびた！', sleep: '{p}は 眠ってしまった！',
}
const JA_STATUS_REMOVE: Dict = {
    burn: '{p}の やけどが 治った！', freeze: '{p}の こおりが とけた！', paralysis: '{p}の まひが 治った！',
    poison: '{p}の 毒は きれいに 消え去った！', toxic: '{p}の 毒は きれいに 消え去った！', sleep: '{p}は 目を 覚ました！',
}
const JA_VOLATILE_APPLY: Dict = {
    confusion: '{p}は 混乱した！', seeded: '{p}に 種を 植えつけた！', bound: '{p}は しめつけられた！',
    infatuation: '{p}は メロメロに なった！', curse: '{p}は のろわれた！', aqua_ring: '{p}は 水の ベールを まとった！',
    ingrain: '{p}は 根を はった！', magnet_rise: '{p}は 電磁力で 浮かびあがった！', taunt: '{p}は ちょうはつに 乗ってしまった！',
    encore: '{p}は アンコールを 受けた！', yawn: '{p}の 眠気を 誘った！', protect: '{p}は 守りの 体勢に 入った！',
    kings_shield: '{p}は 守りの 体勢に 入った！', spiky_shield: '{p}は 守りの 体勢に 入った！',
    baneful_bunker: '{p}は 守りの 体勢に 入った！', silk_trap: '{p}は 守りの 体勢に 入った！',
    burning_bulwark: '{p}は 守りの 体勢に 入った！', obstruct: '{p}は 守りの 体勢に 入った！',
    endure: '{p}は こらえる 体勢に 入った！', focus_energy: '{p}は はりきっている！', substitute: '{p}の 分身が 現れた！',
    salt_cure: '{p}は しおづけに なった！', flash_fire: '{p}の ほのお技の 威力が 上がった！',
    heal_block: '{p}は 回復を 封じられた！', embargo: '{p}は 道具が 使えなくなった！',
    destiny_bond: '{p}は 相手を 道連れに しようとしている！', flinch: '{p}は ひるんだ！',
}
const JA_VOLATILE_REMOVE: Dict = {
    confusion: '{p}の 混乱が 解けた！', substitute: '{p}の 分身は 消えてしまった…', taunt: '{p}の ちょうはつの 効果が 解けた！',
    encore: '{p}の アンコール状態が 解けた！', seeded: '{p}の やどりぎのタネが 外れた！', bound: '{p}は しめつけから 解放された！',
}
const JA_WEATHER: Dict = {
    sun: '日差しが 強くなった！', harsh_sun: '日差しが とても 強くなった！', rain: '雨が 降り始めた！',
    heavy_rain: '強い 雨が 降り始めた！', sandstorm: '砂あらしが 吹き始めた！', snow: '雪が 降り始めた！',
    strong_winds: '謎の 乱気流が 飛行ポケモンを 守る！',
}
const JA_TERRAIN: Dict = {
    electric: '足下に 電気が 駆けめぐる！', grassy: '足下に 草が 生い茂った！',
    misty: '足下に 霧が 立ち込めた！', psychic: '足下が 不思議な 感じに なった！',
}
const JA_FIELD_START: Dict = { trick_room: '時空が ゆがんだ！', gravity: '重力が 強くなった！' }
const JA_FIELD_END: Dict = { trick_room: 'ゆがんだ 時空が 元に 戻った！', gravity: '重力が 元に 戻った！' }
const JA_ACTIVATE: Dict = {
    'cure-team': '仲間の 状態異常が 治った！',
    clearallboost: 'すべての 能力変化が 元に 戻った！',
    clearboost: '能力変化が 元に 戻った！',
    clearnegativeboost: '下がった 能力が 元に 戻った！',
    clearpositiveboost: '上がった 能力が 元に 戻った！',
    setboost: '能力が 変化した！',
    invertboost: '能力変化が 逆転した！',
    swapboost: '能力変化を 入れ替えた！',
    copyboost: '能力変化を コピーした！',
    typechange: 'タイプが 変わった！',
    charging: 'パワーを ためている！',
    'court-change': 'お互いの 場の 効果を 入れ替えた！',
    ohko: '一撃必殺！',
    'ability-suppressed': 'とくせいが 消された！',
}

function formatJa(event: BattleEvent, ctx: FormatContext): string | null {
    const h = helpers(ctx, 'ja')
    const { pName, base, mName, aName, iName, tName, source } = h
    const side = (p: PlayerID) => (ctx.sideName ? ctx.sideName(p) : p === 'p1' ? '味方' : '相手')

    switch (event.type) {
        case 'battle_start':
            return `${event.p1} vs ${event.p2} バトル開始！`
        case 'turn_start':
            return `── ターン ${event.turn} ──`
        case 'turn_end':
            return null
        case 'move_use':
            return `${pName(event.pokemon_id)}の ${mName(event.move.name)}！`
        case 'move_miss':
            return event.target_id ? `${pName(event.target_id)}には 当たらなかった！` : '攻撃は 外れた！'
        case 'move_fail':
            if (event.reason === 'protect') return '攻撃は 防がれた！'
            if (event.reason === 'substitute') return '分身が 攻撃を 受け止めた！'
            if (event.reason === 'fail' || event.reason === 'no-target') return 'しかし うまく 決まらなかった！'
            return event.reason ? `しかし うまく 決まらなかった！（${source(event.reason)}）` : 'しかし うまく 決まらなかった！'
        case 'cant_move':
            if (event.reason === 'other') return `${pName(event.pokemon_id)}は 動けない！${event.detail ? `（${mName(event.detail)}）` : ''}`
            return JA_CANT_MOVE[event.reason]
                ? fill(JA_CANT_MOVE[event.reason]!, pName(event.pokemon_id))
                : `${pName(event.pokemon_id)}は 動けない！（${event.reason}）`
        case 'damage': {
            if (event.source === 'substitute') return `${pName(event.pokemon_id)}に 代わって 分身が 攻撃を 受けた！`
            const pct = pctOf(event.amount, h.maxHp(event.pokemon_id))
            const parts: string[] = []
            if (event.crit) parts.push('急所に 当たった！')
            if (event.effectiveness !== undefined) {
                if (event.effectiveness > 1) parts.push('効果は バツグンだ！')
                else if (event.effectiveness > 0 && event.effectiveness < 1) parts.push('効果は いまひとつの ようだ…')
            }
            const indirect = !event.effectiveness && event.source && event.source !== 'confusion' ? `（${source(event.source)}）` : ''
            return `${parts.join(' ')}${parts.length ? ' ' : ''}${pName(event.pokemon_id)}に ${event.amount}の ダメージ（-${pct}%）${indirect}`
        }
        case 'heal':
            return `${pName(event.pokemon_id)}の HPが ${event.amount} 回復した${event.source ? `（${source(event.source)}）` : ''}`
        case 'immune':
            return `${pName(event.pokemon_id)}には 効果が ない みたいだ…${event.source && event.source !== 'type' ? `（${aName(event.source)}）` : ''}`
        case 'faint':
            return `${pName(event.pokemon_id)}は たおれた！`
        case 'status_apply': {
            const tpl = JA_STATUS_APPLY[event.status]
            return tpl ? fill(tpl, pName(event.pokemon_id)) : `${pName(event.pokemon_id)}は ${event.status} 状態に なった！`
        }
        case 'status_remove': {
            const tpl = JA_STATUS_REMOVE[event.status]
            return tpl ? fill(tpl, pName(event.pokemon_id)) : `${pName(event.pokemon_id)}の ${event.status} 状態が 治った！`
        }
        case 'volatile_apply': {
            if (!VOLATILE_NAME_KO[event.volatile]) return null
            const tpl = JA_VOLATILE_APPLY[event.volatile]
            return tpl ? fill(tpl, pName(event.pokemon_id)) : `${pName(event.pokemon_id)}: ${VOLATILE_NAMES.ja[event.volatile] ?? event.volatile}`
        }
        case 'volatile_remove': {
            if (!VOLATILE_NAME_KO[event.volatile]) return null
            const tpl = JA_VOLATILE_REMOVE[event.volatile]
            return tpl ? fill(tpl, pName(event.pokemon_id)) : `${pName(event.pokemon_id)}の ${VOLATILE_NAMES.ja[event.volatile] ?? event.volatile}が 解けた！`
        }
        case 'stat_change': {
            const stat = STAT_NAMES.ja[event.stat] ?? battleStatLabel(event.stat, 'ja')
            const actual = event.actual ?? event.stages
            if (actual === 0) return `${pName(event.pokemon_id)}の ${stat}は もう ${event.stages > 0 ? '上がらない' : '下がらない'}！`
            const n = Math.abs(actual)
            const verb = actual > 0
                ? n >= 3 ? 'ぐぐーんと 上がった' : n === 2 ? 'ぐーんと 上がった' : '上がった'
                : n >= 3 ? 'がくーんと 下がった' : n === 2 ? 'がくっと 下がった' : '下がった'
            return `${pName(event.pokemon_id)}の ${stat}が ${verb}！`
        }
        case 'weather_change':
            return event.weather
                ? JA_WEATHER[event.weather] ?? `${WEATHER_NAMES.ja[event.weather] ?? event.weather}に なった！`
                : '天気が 元に 戻った。'
        case 'terrain_change':
            return event.terrain
                ? JA_TERRAIN[event.terrain] ?? `${TERRAIN_NAMES.ja[event.terrain] ?? event.terrain}が 展開された！`
                : 'フィールドが 元に 戻った。'
        case 'side_start': {
            const cond = SIDE_CONDITION_NAMES.ja[event.condition] ?? event.condition
            const layers = (event.layers ?? 1) > 1 ? `（${event.layers}段階）` : ''
            return `${side(event.player)}の 場に ${cond}が 発生した！${layers}`
        }
        case 'side_end':
            return `${side(event.player)}の 場の ${SIDE_CONDITION_NAMES.ja[event.condition] ?? event.condition}が 消えた。`
        case 'field_start':
            return JA_FIELD_START[event.condition] ?? `${FIELD_CONDITION_NAMES.ja[event.condition] ?? event.condition}の 効果が 発生した！`
        case 'field_end':
            return JA_FIELD_END[event.condition] ?? `${FIELD_CONDITION_NAMES.ja[event.condition] ?? event.condition}の 効果が 切れた。`
        case 'switch': {
            const inP = base(event.in_id)
            if (event.forced) return `${pName(event.in_id)}が 引きずり出された！`
            if (ctx.sideName) return `${ctx.sideName(event.player)}は ${inP}を 繰り出した！`
            if (!event.out_id) return event.player === 'p1' ? `ゆけっ！ ${inP}！` : `相手は ${inP}を 繰り出した！`
            return event.player === 'p1' ? `戻れ！ ゆけっ！ ${inP}！` : `相手は ${inP}に 入れ替えた！`
        }
        case 'ability_trigger':
            return `［${pName(event.pokemon_id)}の ${aName(event.ability)}］`
        case 'item_consume':
            return `${pName(event.pokemon_id)}の ${iName(event.item)}が なくなった！`
        case 'item_activate':
            return `${pName(event.pokemon_id)}の ${iName(event.item)}が 発動した！`
        case 'terastallize':
            return `${pName(event.pokemon_id)}は ${tName(event.tera_type)}タイプに テラスタルした！`
        case 'hit_count':
            return `${event.hits}回 当たった！`
        case 'activate': {
            const msg = JA_ACTIVATE[event.effect]
            if (msg) return `${event.pokemon_id ? `${pName(event.pokemon_id)}: ` : ''}${msg}`
            if (!event.pokemon_id) return null
            return `${pName(event.pokemon_id)}: ${source(event.effect)}${event.detail ? `（${source(event.detail)}）` : ''}`
        }
        case 'forme_change':
            return `${pName(event.pokemon_id)}の 姿が 変わった！`
        case 'message':
            return event.text
        case 'battle_end':
            if (event.winner === 'draw') return '勝負は 引き分けに 終わった！'
            if (ctx.sideName) return `${ctx.sideName(event.winner)}の 勝利！`
            return event.winner === 'p1' ? '勝負に 勝った！' : '相手の 勝利！'
    }
    return null
}
