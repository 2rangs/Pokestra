// 표시용 이름은 언어별 헬퍼(`typeName`, `generationName`, `eggGroupName` — src/lib/dex.ts)를 쓴다.

export const POKEMON_TYPES = [
    'normal','fire','water','electric','grass','ice',
    'fighting','poison','ground','flying','psychic','bug',
    'rock','ghost','dragon','dark','steel','fairy',
] as const

/** 세대별 전국도감 번호 구간. 라벨은 `generationName(id, lang)` */
export const GENERATIONS = [
    { id: 1, min: 1,   max: 151  },
    { id: 2, min: 152, max: 251  },
    { id: 3, min: 252, max: 386  },
    { id: 4, min: 387, max: 493  },
    { id: 5, min: 494, max: 649  },
    { id: 6, min: 650, max: 721  },
    { id: 7, min: 722, max: 809  },
    { id: 8, min: 810, max: 905  },
    { id: 9, min: 906, max: 1025 },
] as const

export const EGG_GROUPS = [
    'monster','water1','water2','water3','bug','flying',
    'ground','fairy','plant','humanshape','mineral',
    'indeterminate','ditto','dragon','no-eggs',
] as const
