# Gender appearance pieces - report

Status: DONE_WITH_CONCERNS

## TDD
RED (before impl, `npx vitest run src/lib`): 2 files failed, "Tests 3 failed | 17 passed"; `femaleArtAt is not a function`, gender.ts missing, female gen4 test failing.
GREEN after impl: "Test Files 2 passed, Tests 21 passed".

## Changes
- generation.ts: spriteAt(sprites, gen, {female}), femaleArtAt. usePokemon.ts: front_female on version entries.
- Fixture pikachu.json lacked sprites.other / front_female (version-level female fields were present): added other.home.{front_default,front_female} and top-level front_female (real PokeAPI URLs).
- gender.ts parseSex + tests.
- GenderToggle.tsx (SegmentedControl + Token, HStack wrap). GenderDiffMark.tsx (Text role=img aria-label genderDiffers).
- i18n ko/en/ja: genderToggleLabel, genderMale, genderFemale, genderDiffers.
- Data: pokemon.json had no gender info. Added src/script/addGenderDiff.mjs (reads pokemon_species.csv + pokemon.csv, only adds genderDiff; forms inherit species). Ran it: 144/1302 true. JSON diff is the new field (+ trailing commas on the previous line). buildI18nData.mjs now preserves genderDiff on rebuild. DexPokemon gets genderDiff: boolean.
- Marker in PokemonCard and PokedexTable next to name.

## Verify
npm test 21 passed; npx tsc -b clean; npm run lint clean; npm run build ok; astryx doctor --built dist: 0 fail, 2 warn (not inspected in detail).
