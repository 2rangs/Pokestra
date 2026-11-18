import { Button } from "@astryxdesign/core/Button"
import { HStack } from "@astryxdesign/core/HStack"
import { Icon } from "@astryxdesign/core/Icon"
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl"
import type { Lang, TFunction } from "../../i18n"
import type { PokedexKey } from "../../i18n/messages/pokedex"
import { LATEST_GEN } from "../../lib/generation"

const CURRENT = "current"
const ROMAN_UPPER = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"]

interface Cry {
    primary: string | null
    legacy: string | null
    latest: string | null
}

interface Props {
    debut: number
    gen: number | null
    onChange: (gen: number | null) => void
    cry: Cry
    lang: Lang
    t: TFunction<PokedexKey>
}

function play(url: string) {
    new Audio(url).play().catch(() => {})
}

/** 세대 선택 막대 + 울음소리 재생 */
export function GenerationBar({ debut, gen, onChange, cry, t }: Props) {
    const gens: number[] = []
    for (let g = Math.max(debut, 1); g < LATEST_GEN; g++) gens.push(g)

    const split = cry.legacy && cry.legacy !== cry.latest
    const cryButtons: { key: string; label: string; url: string }[] = []
    if (split) {
        cryButtons.push({ key: "legacy", label: `${t("cryPlay")} · ${t("cryLegacy")}`, url: cry.legacy! })
        if (cry.latest) cryButtons.push({ key: "latest", label: `${t("cryPlay")} · ${t("cryLatest")}`, url: cry.latest })
    } else {
        const url = cry.latest ?? cry.legacy
        if (url) cryButtons.push({ key: "one", label: t("cryPlay"), url })
    }

    return (
        <HStack gap={3} vAlign="center" wrap="wrap">
            <SegmentedControl
                label={t("genBarLabel")}
                size="sm"
                value={gen === null ? CURRENT : String(gen)}
                onChange={(v) => onChange(v === CURRENT ? null : Number(v))}
            >
                {gens.map((g) => (
                    <SegmentedControlItem key={g} value={String(g)} label={ROMAN_UPPER[g] ?? String(g)} />
                ))}
                <SegmentedControlItem value={CURRENT} label={t("genCurrent")} />
            </SegmentedControl>
            {cryButtons.map((b) => (
                <Button
                    key={b.key}
                    size="sm"
                    variant="ghost"
                    label={b.label}
                    icon={<Icon icon="microphone" />}
                    onClick={() => play(b.url)}
                />
            ))}
        </HStack>
    )
}
