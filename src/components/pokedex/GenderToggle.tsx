import { HStack } from "@astryxdesign/core/HStack"
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl"
import { Token } from "@astryxdesign/core/Token"
import type { TFunction } from "../../i18n"
import type { PokedexKey } from "../../i18n/messages/pokedex"

interface Props {
    value: "m" | "f"
    onChange: (v: "m" | "f") => void
    t: TFunction<PokedexKey>
}

/** 수컷/암컷 모습 전환 + 암수 다른 모습 표시 */
export function GenderToggle({ value, onChange, t }: Props) {
    return (
        <HStack gap={2} vAlign="center" wrap="wrap">
            <SegmentedControl label={t("genderToggleLabel")} value={value} onChange={(v) => onChange(v === "f" ? "f" : "m")} size="sm">
                <SegmentedControlItem value="m" label={t("genderMale")} />
                <SegmentedControlItem value="f" label={t("genderFemale")} />
            </SegmentedControl>
            <Token label={t("genderDiffers")} size="sm" />
        </HStack>
    )
}
