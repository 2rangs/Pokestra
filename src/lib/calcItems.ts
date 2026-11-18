/** 계산기에서 고를 수 있는 도구 (엔진에 구현된 효과가 있는 것). 엔진을 import하지 않는다. */
export const CALC_ITEMS: readonly { id: string; ko: string }[] = [
    { id: 'leftovers', ko: '먹다남은음식' }, { id: 'life-orb', ko: '생명의구슬' }, { id: 'choice-band', ko: '구애머리띠' },
    { id: 'choice-specs', ko: '구애안경' }, { id: 'choice-scarf', ko: '구애스카프' }, { id: 'focus-sash', ko: '기합의띠' },
    { id: 'assault-vest', ko: '돌격조끼' }, { id: 'heavy-duty-boots', ko: '통굽부츠' }, { id: 'rocky-helmet', ko: '울퉁불퉁멧' },
    { id: 'sitrus-berry', ko: '자뭉열매' }, { id: 'lum-berry', ko: '리샘열매' }, { id: 'expert-belt', ko: '달인의띠' },
    { id: 'weakness-policy', ko: '약점보험' }, { id: 'booster-energy', ko: '부스트에너지' }, { id: 'air-balloon', ko: '풍선' },
    { id: 'light-clay', ko: '빛의점토' }, { id: 'black-sludge', ko: '검은진흙' }, { id: 'covert-cloak', ko: '은밀망토' },
    { id: 'clear-amulet', ko: '클리어참' }, { id: 'loaded-dice', ko: '속임수주사위' }, { id: 'power-herb', ko: '파워풀허브' },
    { id: 'flame-orb', ko: '화염구슬' }, { id: 'toxic-orb', ko: '맹독구슬' }, { id: 'safety-goggles', ko: '방진고글' },
    { id: 'shell-bell', ko: '조개껍질방울' }, { id: 'scope-lens', ko: '초점렌즈' }, { id: 'wide-lens', ko: '광각렌즈' },
    { id: 'quick-claw', ko: '선제공격손톱' }, { id: 'protective-pads', ko: '방호패드' }, { id: 'terrain-extender', ko: '그라운드코트' },
    { id: 'heat-rock', ko: '뜨거운바위' }, { id: 'damp-rock', ko: '축축한바위' }, { id: 'smooth-rock', ko: '보송보송바위' },
    { id: 'icy-rock', ko: '차가운바위' }, { id: 'big-root', ko: '큰뿌리' }, { id: 'binding-band', ko: '조임밴드' },
    { id: 'charcoal', ko: '목탄' }, { id: 'mystic-water', ko: '신비의물방울' }, { id: 'miracle-seed', ko: '기적의씨' },
    { id: 'magnet', ko: '자석' }, { id: 'never-melt-ice', ko: '녹지않는얼음' }, { id: 'black-belt', ko: '검은띠' },
    { id: 'poison-barb', ko: '독바늘' }, { id: 'soft-sand', ko: '부드러운모래' }, { id: 'sharp-beak', ko: '예리한부리' },
    { id: 'twisted-spoon', ko: '휘어진스푼' }, { id: 'silver-powder', ko: '은빛가루' }, { id: 'hard-stone', ko: '딱딱한돌' },
    { id: 'spell-tag', ko: '저주의부적' }, { id: 'dragon-fang', ko: '용의이빨' }, { id: 'black-glasses', ko: '검은안경' },
    { id: 'metal-coat', ko: '금속코트' }, { id: 'silk-scarf', ko: '실크스카프' }, { id: 'fairy-feather', ko: '요정의깃털' },
]

const ID_SET: ReadonlySet<string> = new Set(CALC_ITEMS.map(i => i.id))

export function isCalcItem(slug: string): boolean {
    return ID_SET.has(slug)
}

export function parseCalcItem(raw: string | null): string | null {
    return raw && isCalcItem(raw) ? raw : null
}

/**
 * 공격 측에 얹었을 때 계산 결과가 달라지는 도구 → 보여 줄 공격 포켓몬.
 * 기본 기술 4개에 그 도구가 강화하는 타입의 기술이 들어 있는 포켓몬을 골랐다(테스트가 확인한다).
 * 목록에 없는 도구(방어·회복·속도·상태이상·날씨 연장 등)는 공격 측 데모에서 달라지는 게 없다.
 */
const CALC_DEMO_ATTACKER: Readonly<Record<string, string>> = {
    'choice-band': 'garchomp', 'life-orb': 'garchomp', 'expert-belt': 'garchomp',
    'choice-specs': 'gengar',
    'dragon-fang': 'garchomp', 'charcoal': 'charizard', 'mystic-water': 'blastoise', 'miracle-seed': 'venusaur',
    'magnet': 'zapdos', 'never-melt-ice': 'glaceon', 'black-belt': 'lucario', 'poison-barb': 'nidoking',
    'soft-sand': 'excadrill', 'sharp-beak': 'talonflame', 'twisted-spoon': 'alakazam', 'silver-powder': 'heracross',
    'hard-stone': 'tyranitar', 'spell-tag': 'gengar', 'black-glasses': 'hydreigon', 'metal-coat': 'gholdengo',
    'silk-scarf': 'snorlax', 'fairy-feather': 'sylveon',
}

/** 기본 방어 포켓몬(Gholdengo, 강철/고스트)이 그 타입을 받지 못해 데모가 무의미한 도구의 방어 포켓몬 */
export const CALC_DEFAULT_DEFENDER = 'gholdengo'
const CALC_DEMO_DEFENDER: Readonly<Record<string, string>> = {
    'black-belt': 'garchomp', 'poison-barb': 'venusaur', 'silk-scarf': 'garchomp',
}

/** 계산기에서 이 도구를 공격 측에 얹어 보일 때 쓸 포켓몬. 공격 측에서 효과가 없는 도구는 null. def가 없으면 계산기 기본 방어 포켓몬 */
export function calcDemoFor(slug: string): { atk: string; def?: string } | null {
    const atk = CALC_DEMO_ATTACKER[slug]
    if (!atk) return null
    const def = CALC_DEMO_DEFENDER[slug]
    return def ? { atk, def } : { atk }
}
