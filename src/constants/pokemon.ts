export const POKEMON_TYPES = [
    'normal','fire','water','electric','grass','ice',
    'fighting','poison','ground','flying','psychic','bug',
    'rock','ghost','dragon','dark','steel','fairy',
] as const

export const GENERATIONS = [
    { id: 1, label: '1세대', min: 1,   max: 151  },
    { id: 2, label: '2세대', min: 152,  max: 251  },
    { id: 3, label: '3세대', min: 252,  max: 386  },
    { id: 4, label: '4세대', min: 387,  max: 493  },
    { id: 5, label: '5세대', min: 494,  max: 649  },
    { id: 6, label: '6세대', min: 650,  max: 721  },
    { id: 7, label: '7세대', min: 722,  max: 809  },
    { id: 8, label: '8세대', min: 810,  max: 905  },
    { id: 9, label: '9세대', min: 906,  max: 1025 },
]

export const EGG_GROUPS = [
    'monster','water1','water2','water3','bug','flying',
    'ground','fairy','plant','humanshape','mineral',
    'indeterminate','ditto','dragon','no-eggs',
]