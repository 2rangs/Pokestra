// ─── 상태이상·휘발성 상태 설명 (툴팁·현황 요약용) ───────────────────
// 이름은 엔진 용어(battleLog 의 statusLongName / volatileName)를 쓰고, 여기서는 "무슨 효과인지"만 적는다.
// 9세대 규칙 기준. 칩을 눌러야만 알 수 있는 값(예: 화상 = 물리 데미지 절반)을 한 줄로 풀어 준다.
import type { Lang } from '../i18n'

type Text3 = Record<Lang, string>

/** 상태이상 효과 설명 */
const STATUS_DESC: Record<string, Text3> = {
    burn: {
        ko: '물리 공격 데미지 절반, 매 턴 최대 HP의 1/16 데미지',
        en: 'Physical damage halved; loses 1/16 of max HP each turn',
        ja: '物理技のダメージが半分、毎ターン最大HPの1/16のダメージ',
    },
    paralysis: {
        ko: '스피드 절반, 25% 확률로 움직이지 못함',
        en: 'Speed halved; 25% chance to be unable to move',
        ja: 'すばやさが半分、25%の確率で動けない',
    },
    poison: {
        ko: '매 턴 최대 HP의 1/8 데미지',
        en: 'Loses 1/8 of max HP each turn',
        ja: '毎ターン最大HPの1/8のダメージ',
    },
    toxic: {
        ko: '매 턴 데미지가 1/16씩 커짐 (1/16 → 2/16 → …), 교체하면 1/16부터 다시',
        en: 'Damage grows by 1/16 each turn (1/16 → 2/16 → …); resets when switched out',
        ja: '毎ターンダメージが1/16ずつ増える (1/16 → 2/16 → …)、交代すると1/16に戻る',
    },
    sleep: {
        ko: '1~3턴 동안 움직이지 못함',
        en: 'Cannot move for 1–3 turns',
        ja: '1〜3ターン動けない',
    },
    freeze: {
        ko: '움직이지 못함. 매 턴 20% 확률로 풀리고, 불꽃 기술에 맞으면 바로 풀림',
        en: 'Cannot move; 20% chance to thaw each turn, thaws when hit by a Fire move',
        ja: '動けない。毎ターン20%の確率で治り、ほのお技を受けると治る',
    },
}

const PROTECT: Text3 = {
    ko: '이번 턴 대부분의 기술을 막음',
    en: 'Blocks most moves this turn',
    ja: 'このターン、ほとんどの技を防ぐ',
}
const PROTECT_CONTACT: Text3 = {
    ko: '이번 턴 대부분의 기술을 막고, 접촉한 상대에게 추가 효과',
    en: 'Blocks most moves this turn; punishes attackers that make contact',
    ja: 'このターン、ほとんどの技を防ぎ、接触した相手に追加効果',
}
const DELAYED: Text3 = {
    ko: '2턴 뒤 이 자리에 공격이 떨어짐',
    en: 'An attack lands on this spot 2 turns later',
    ja: '2ターン後にこの場所へ攻撃が来る',
}

/** 휘발성 상태 효과 설명 (SHOWN_VOLATILES 기준) */
const VOLATILE_DESC: Record<string, Text3> = {
    confusion: {
        ko: '2~5턴 동안 33% 확률로 자기 자신을 공격',
        en: '33% chance to hit itself for 2–5 turns',
        ja: '2〜5ターンの間、33%の確率で自分を攻撃',
    },
    flinch: { ko: '이번 턴 움직이지 못함', en: 'Cannot move this turn', ja: 'このターン動けない' },
    seeded: {
        ko: '매 턴 최대 HP의 1/8을 상대에게 빼앗김',
        en: 'Loses 1/8 of max HP to the opponent each turn',
        ja: '毎ターン最大HPの1/8を相手に吸い取られる',
    },
    bound: {
        ko: '교체 불가, 매 턴 최대 HP의 1/8 데미지 (4~5턴)',
        en: 'Cannot switch; loses 1/8 of max HP each turn (4–5 turns)',
        ja: '交代できず、毎ターン最大HPの1/8のダメージ (4〜5ターン)',
    },
    infatuation: {
        ko: '50% 확률로 움직이지 못함',
        en: '50% chance to be unable to move',
        ja: '50%の確率で動けない',
    },
    curse: { ko: '매 턴 최대 HP의 1/4 데미지', en: 'Loses 1/4 of max HP each turn', ja: '毎ターン最大HPの1/4のダメージ' },
    aqua_ring: { ko: '매 턴 최대 HP의 1/16 회복', en: 'Restores 1/16 of max HP each turn', ja: '毎ターン最大HPの1/16回復' },
    ingrain: {
        ko: '매 턴 최대 HP의 1/16 회복, 교체 불가',
        en: 'Restores 1/16 of max HP each turn; cannot switch',
        ja: '毎ターン最大HPの1/16回復、交代できない',
    },
    magnet_rise: { ko: '땅 타입 기술에 맞지 않음 (5턴)', en: 'Immune to Ground moves (5 turns)', ja: 'じめん技が当たらない (5ターン)' },
    taunt: { ko: '변화 기술을 쓸 수 없음 (3턴)', en: 'Cannot use status moves (3 turns)', ja: '変化技が使えない (3ターン)' },
    encore: {
        ko: '마지막에 쓴 기술만 쓸 수 있음 (3턴)',
        en: 'Can only use its last move (3 turns)',
        ja: '最後に使った技しか使えない (3ターン)',
    },
    yawn: {
        ko: '다음 턴이 끝나면 잠듦 (교체하면 풀림)',
        en: 'Falls asleep at the end of next turn (cured by switching)',
        ja: '次のターンの終わりに眠る (交代で解除)',
    },
    protect: PROTECT,
    obstruct: PROTECT_CONTACT,
    kings_shield: PROTECT_CONTACT,
    spiky_shield: PROTECT_CONTACT,
    baneful_bunker: PROTECT_CONTACT,
    silk_trap: PROTECT_CONTACT,
    burning_bulwark: PROTECT_CONTACT,
    endure: { ko: '이번 턴 HP 1을 남기고 버팀', en: 'Survives any hit with 1 HP this turn', ja: 'このターン、HP1で耐える' },
    focus_energy: { ko: '급소에 맞을 확률 +2단계', en: 'Critical-hit ratio +2 stages', ja: '急所ランク+2' },
    substitute: {
        ko: '최대 HP의 1/4짜리 분신이 대신 공격을 받음',
        en: 'A decoy with 1/4 of max HP takes hits instead',
        ja: '最大HPの1/4の分身が代わりに攻撃を受ける',
    },
    salt_cure: {
        ko: '매 턴 최대 HP의 1/8 데미지 (물·강철 타입은 1/4)',
        en: 'Loses 1/8 of max HP each turn (1/4 for Water/Steel)',
        ja: '毎ターン最大HPの1/8のダメージ (みず・はがねは1/4)',
    },
    flash_fire: { ko: '불꽃 기술 위력 1.5배', en: 'Fire moves deal 1.5× damage', ja: 'ほのお技の威力1.5倍' },
    heal_block: { ko: 'HP를 회복할 수 없음', en: 'Cannot restore HP', ja: 'HPを回復できない' },
    embargo: { ko: '도구를 쓸 수 없음', en: 'Cannot use its held item', ja: '持ち物が使えない' },
    destiny_bond: {
        ko: '다음 행동 전에 쓰러지면 쓰러뜨린 상대도 함께 쓰러짐',
        en: 'If it faints before its next move, the attacker faints too',
        ja: '次の行動までに倒されると、倒した相手も道連れ',
    },
    'future-sight': DELAYED,
    'doom-desire': DELAYED,
    dynamax: { ko: 'HP 2배, 다이맥스 기술 사용 (3턴)', en: 'HP doubled, uses Max Moves (3 turns)', ja: 'HP2倍、ダイマックス技を使う (3ターン)' },
}

export const statusDesc = (status: string, lang: Lang): string | null => STATUS_DESC[status]?.[lang] ?? null
export const volatileDesc = (volatile: string, lang: Lang): string | null => VOLATILE_DESC[volatile]?.[lang] ?? null

/** 맹독 다음 데미지의 분자 (n/16). 9세대는 15/16 이 최대 */
export const toxicNext = (statusTurns: number | null | undefined) => Math.min(15, Math.max(0, statusTurns ?? 0) + 1)

/** 상태이상 목록 (표시 순서·범례용) */
export const STATUSES = ['burn', 'paralysis', 'poison', 'toxic', 'sleep', 'freeze'] as const
