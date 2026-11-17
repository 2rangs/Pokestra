# Pokestra

A Korean Pokémon dex and battle site. It covers every Pokémon from Gen 1 to 9, and its battles and damage calculations run on [`@kyasi/pokebattle-engine`](https://github.com/2rangs/pokebattle-engine).

## Features

| Route | Description |
|---|---|
| `/pokedex` | Instant search over local data: Korean or English name or number; filters for type (up to 2), generation, learnable moves and alternate forms; sorting by base stats |
| `/pokemon/:id` | Detail page: base stats, type matchups, evolutions, plus a **battle stats panel** (min/max actual stats at Lv50/Lv100) |
| `/battle` | **Battle simulator**: build a team from learnsets (or random / Showdown import) and fight the CPU in singles, or watch CPU vs CPU. 3 difficulty levels, Terastallization, damage-range preview on move buttons, Korean battle log |
| `/calc` | **Damage calculator**: EVs/IVs, nature, ability, item, stat stages, Tera, weather/terrain/screens/crit. Shows all 16 damage rolls and the KO text. `?atk=garchomp&def=gholdengo` links preselect the matchup |

## Development

```bash
npm install
npm run dev      # http://localhost:5173/Pokestra/
npm run build
```

### Engine dependency

`package.json` installs the engine from GitHub:

```json
"@kyasi/pokebattle-engine": "github:2rangs/pokebattle-engine#claude/pokemon-battle-engine-pokedex-pocs4h"
```

npm runs the engine's `prepare` script at install time, which builds `dist/`. To work on both repos side by side:

```bash
# from the engine repo
npm pack
# from the Pokestra repo
npm install --no-save ../pokebattle-engine/kyasi-pokebattle-engine-*.tgz
```

## Structure

- `src/lib/dex.ts` — typed accessors over the local dex JSON (`src/data/*.json`)
- `src/lib/battle.ts` — engine glue: data loading hook, Korean name resolver, items/natures, recommended sets built from learnsets
- `src/pages/battle/` — battle simulator (`useBattleSession` records a frame for every engine event and replays them in order)
- `src/pages/CalcPage.tsx`, `src/components/calc/` — damage calculator
- Large pages are lazy-loaded (`React.lazy`), so data and the engine download only when needed
