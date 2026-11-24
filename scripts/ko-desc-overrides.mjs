// PokeAPI 에 한국어 설명이 없는 특성·기술의 한국어 설명을 채운다 (fill-ko-descs.mjs 다음에 실행).
// - 포켓몬 챔피언스 신규 특성 7개: 챔피언스 한국어판 설명(공략 DB gamewith.ai/pokemon-champions/ko 에 정리된 문구)을 따른다.
// - 스타모빌 전용 기술(○○액셀)·다크포켓몬 전용 기술(콜로세움·XD, 한국어판 없음): 영어 효과를 게임 문체로 옮겼다.
import { readFileSync, writeFileSync } from 'node:fs'

const ABILITIES = {
    'piercing-drill': '접촉 기술을 사용할 때 상대의 방어 효과를 무시하고 본래 데미지의 1/4만큼 데미지를 준다. 상대의 방어 효과 이외에는 발동된다.',
    dragonize: '노말타입 기술이 드래곤타입이 되며 위력이 1.2배가 된다.',
    'mega-sol': '날씨가 쾌청 상태가 아니라도 쾌청 상태인 것처럼 기술을 사용할 수 있다.',
    'spicy-spray': '기술로 데미지를 입으면 상대를 화상 상태로 만든다.',
    eelevate: '땅 위에 있지 않게 되어 땅타입 기술, 압정뿌리기, 독압정, 끈적끈적네트 상태의 효과를 받지 않는다. 공격으로 상대를 쓰러뜨리면 자신의 가장 높은 능력이 1단계 올라간다.',
    'fire-mane': '불꽃타입 기술의 위력이 1.5배가 된다.',
    'aura-guard': '접촉 기술로 입는 데미지가 반감된다.',
}

const STARMOBILE = '스타모빌이 쓰는 기술.'
const SHADOW = '다크포켓몬만 쓸 수 있는 기술.'
const MOVES = {
    'blazing-torque': `${STARMOBILE} 불꽃을 뿜는 엔진을 회전시켜 부딪친다. 상대를 화상 상태로 만들 때가 있다.`,
    'wicked-torque': `${STARMOBILE} 악의를 담아 엔진을 회전시켜 부딪친다. 상대를 잠듦 상태로 만들 때가 있다.`,
    'noxious-torque': `${STARMOBILE} 독을 뿜는 엔진을 회전시켜 부딪친다. 상대를 독 상태로 만들 때가 있다.`,
    'combat-torque': `${STARMOBILE} 엔진을 힘껏 회전시켜 부딪친다. 상대를 마비 상태로 만들 때가 있다.`,
    'magical-torque': `${STARMOBILE} 신비한 엔진을 회전시켜 부딪친다. 상대를 혼란 상태로 만들 때가 있다.`,
    'shadow-rush': `${SHADOW} 몸을 던져 부딪친다. 하이퍼 상태에서는 급소에 맞기 쉽다.`,
    'shadow-blast': `${SHADOW} 어둠의 힘을 터뜨려 공격한다. 급소에 맞기 쉽다.`,
    'shadow-blitz': `${SHADOW} 어둠의 힘을 담아 몸통으로 부딪친다.`,
    'shadow-bolt': `${SHADOW} 어둠의 전격으로 공격한다. 상대를 마비 상태로 만들 때가 있다.`,
    'shadow-break': `${SHADOW} 어둠의 힘을 담아 상대를 강하게 때린다.`,
    'shadow-chill': `${SHADOW} 어둠의 냉기로 공격한다. 상대를 얼음 상태로 만들 때가 있다.`,
    'shadow-end': `${SHADOW} 목숨을 건 강력한 일격. 자신도 HP의 절반만큼 데미지를 입는다.`,
    'shadow-fire': `${SHADOW} 어둠의 불꽃으로 공격한다. 상대를 화상 상태로 만들 때가 있다.`,
    'shadow-rave': `${SHADOW} 어둠의 힘을 마구 퍼부어 상대 모두를 공격한다.`,
    'shadow-storm': `${SHADOW} 어둠의 폭풍을 일으켜 상대 모두를 공격한다.`,
    'shadow-wave': `${SHADOW} 어둠의 파동을 퍼뜨려 상대 모두를 공격한다.`,
    'shadow-down': `${SHADOW} 상대의 방어를 2랭크 떨어뜨린다.`,
    'shadow-half': `${SHADOW} 배틀에 나와 있는 모든 포켓몬의 HP를 절반으로 만든다. 다음 턴은 움직일 수 없다.`,
    'shadow-hold': `${SHADOW} 상대가 배틀에서 도망칠 수 없게 한다.`,
    'shadow-mist': `${SHADOW} 상대의 회피율을 2랭크 떨어뜨린다.`,
    'shadow-panic': `${SHADOW} 상대를 혼란 상태로 만든다.`,
    'shadow-shed': `${SHADOW} 리플렉터, 빛의장막, 신비의부적의 효과를 없앤다.`,
    'shadow-sky': `${SHADOW} 5턴 동안 날씨를 다크스카이로 바꾼다.`,
}

// 영어도 없던 기술(같은 23개): 영어 화면이 한국어로 대체되지 않도록 PokeAPI 효과 요약 기반 영어 설명
const MOVES_EN = {
    'blazing-torque': 'A move used by Starmobiles. The user revs its blazing engine and rams the target. This may also leave the target with a burn.',
    'wicked-torque': 'A move used by Starmobiles. The user revs its engine with malicious intent and rams the target. This may also make the target fall asleep.',
    'noxious-torque': 'A move used by Starmobiles. The user revs its poisonous engine and rams the target. This may also poison the target.',
    'combat-torque': 'A move used by Starmobiles. The user revs its engine forcefully and rams the target. This may also leave the target with paralysis.',
    'magical-torque': 'A move used by Starmobiles. The user revs its fae-like engine and rams the target. This may also confuse the target.',
    'shadow-rush': 'A move only Shadow Pokémon can use. Has an increased chance for a critical hit in Hyper Mode.',
    'shadow-blast': 'A move only Shadow Pokémon can use. Has an increased chance for a critical hit.',
    'shadow-blitz': 'A move only Shadow Pokémon can use. The user rams the target with shadowy power.',
    'shadow-bolt': 'A move only Shadow Pokémon can use. May paralyze the target.',
    'shadow-break': 'A move only Shadow Pokémon can use. The user strikes the target with shadowy power.',
    'shadow-chill': 'A move only Shadow Pokémon can use. May freeze the target.',
    'shadow-end': 'A move only Shadow Pokémon can use. The user loses half of its HP in recoil.',
    'shadow-fire': 'A move only Shadow Pokémon can use. May burn the target.',
    'shadow-rave': 'A move only Shadow Pokémon can use. Hits all opposing Pokémon.',
    'shadow-storm': 'A move only Shadow Pokémon can use. Hits all opposing Pokémon.',
    'shadow-wave': 'A move only Shadow Pokémon can use. Hits all opposing Pokémon.',
    'shadow-down': "A move only Shadow Pokémon can use. Lowers the target's Defense by two stages.",
    'shadow-half': 'A move only Shadow Pokémon can use. Halves the HP of all Pokémon on the field. The user must recharge next turn.',
    'shadow-hold': 'A move only Shadow Pokémon can use. Prevents the target from fleeing.',
    'shadow-mist': "A move only Shadow Pokémon can use. Lowers the target's evasiveness by two stages.",
    'shadow-panic': 'A move only Shadow Pokémon can use. Confuses the target.',
    'shadow-shed': 'A move only Shadow Pokémon can use. Removes Light Screen, Reflect, and Safeguard.',
    'shadow-sky': 'A move only Shadow Pokémon can use. Changes the weather to Shadow Sky for five turns.',
}

for (const [file, map] of [['abilities', ABILITIES], ['moves', MOVES]]) {
    const url = new URL(`../src/data/${file}.json`, import.meta.url)
    const list = JSON.parse(readFileSync(url, 'utf8'))
    let n = 0
    for (const x of list) {
        if (file === 'moves' && MOVES_EN[x.name] && !x.desc?.en) x.desc = { ...(x.desc ?? {}), en: MOVES_EN[x.name] }
        if (!map[x.name] || x.desc?.ko) continue
        x.desc = { ...(x.desc ?? {}), ko: map[x.name] }
        n++
    }
    writeFileSync(url, JSON.stringify(list, null, 2) + '\n')
    console.log(file, 'filled', n)
}
