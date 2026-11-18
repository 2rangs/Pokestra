import { memo } from "react"
import { Link } from "@astryxdesign/core/Link"
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from "@astryxdesign/core/Table"
import { Text } from "@astryxdesign/core/Text"
import { useLang, useT } from "../../i18n"
import { pokedexMessages } from "../../i18n/messages/pokedex"
import { type DexPokemon, type StatKey, STAT_KEYS, baseStatTotal, formLabel, getSpeciesId, pokemonName, statLabel } from "../../lib/dex"
import { PokemonImage } from "../PokemonCard"
import { TypeTag } from "../ui/shared"
import { GenderDiffMark } from "./GenderDiffMark"
import { dexNumber } from "./format"

const Row = memo(function Row({ p, sortStat }: { p: DexPokemon; sortStat: StatKey | "total" | null }) {
    const lang = useLang()
    const t = useT(pokedexMessages)
    const form = formLabel(p, lang)
    const total = baseStatTotal(p)
    return (
        <TableRow>
            <TableCell>
                <PokemonImage p={p} size={32} className="h-8 w-8" />
            </TableCell>
            <TableCell>
                <Text type="supporting" hasTabularNumbers>
                    {dexNumber(getSpeciesId(p))}
                </Text>
            </TableCell>
            <TableCell>
                <span className="flex min-w-32 flex-col">
                    <span className="flex items-center gap-1">
                        <Link href={`/pokemon/${p.id}`} weight="semibold">
                            {pokemonName(p, lang)}
                        </Link>
                        {p.genderDiff && <GenderDiffMark t={t} />}
                    </span>
                    {form && <Text type="supporting">{form}</Text>}
                </span>
            </TableCell>
            <TableCell>
                <span className="flex flex-wrap gap-1">
                    {p.types.map((type) => (
                        <TypeTag key={type} type={type} size="xs" />
                    ))}
                </span>
            </TableCell>
            <TableCell className="text-right">
                <Text weight={sortStat === "total" ? "bold" : "semibold"} hasTabularNumbers>
                    {total}
                </Text>
            </TableCell>
            {STAT_KEYS.map((k) => (
                <TableCell key={k} className="text-right">
                    <Text weight={sortStat === k ? "bold" : "normal"} color={sortStat === k ? "primary" : "secondary"} hasTabularNumbers>
                        {p.stats[k]}
                    </Text>
                </TableCell>
            ))}
        </TableRow>
    )
})

/** 도감 표 보기: 이미지, 번호, 이름, 타입, 종족값 합계와 6가지 능력치 */
export function PokedexTable({ pokemon, sortStat }: { pokemon: readonly DexPokemon[]; sortStat: StatKey | "total" | null }) {
    const lang = useLang()
    const t = useT(pokedexMessages)
    return (
        <Table density="compact" hasHover aria-label={t("title")}>
            <TableHeader>
                <TableRow isHeaderRow>
                    <TableHeaderCell scope="col">
                        <span className="sr-only">{t("colImage")}</span>
                    </TableHeaderCell>
                    <TableHeaderCell scope="col">{t("colNo")}</TableHeaderCell>
                    <TableHeaderCell scope="col">{t("colName")}</TableHeaderCell>
                    <TableHeaderCell scope="col">{t("colType")}</TableHeaderCell>
                    <TableHeaderCell scope="col" className="text-right">
                        {t("total")}
                    </TableHeaderCell>
                    {STAT_KEYS.map((k) => (
                        <TableHeaderCell key={k} scope="col" className="text-right">
                            <abbr title={statLabel(k, lang)} className="no-underline">
                                {statLabel(k, lang, true)}
                            </abbr>
                        </TableHeaderCell>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {pokemon.map((p) => (
                    <Row key={p.id} p={p} sortStat={sortStat} />
                ))}
            </TableBody>
        </Table>
    )
}
