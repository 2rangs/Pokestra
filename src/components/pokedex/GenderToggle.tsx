import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl"
import type { TFunction } from "../../i18n"
import type { PokedexKey } from "../../i18n/messages/pokedex"

interface Props {
    value: "m" | "f"
    onChange: (v: "m" | "f") => void
    t: TFunction<PokedexKey>
}

/** 수컷/암컷 모습 전환 (암수 모습이 다를 때만 나온다) */
export function GenderToggle({ value, onChange, t }: Props) {
    return (
        <SegmentedControl label={t("genderToggleLabel")} value={value} onChange={(v) => onChange(v === "f" ? "f" : "m")} size="sm">
            <SegmentedControlItem value="m" label={t("genderMale")} />
            <SegmentedControlItem value="f" label={t("genderFemale")} />
        </SegmentedControl>
    )
}
