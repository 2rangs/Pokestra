import { Text } from "@astryxdesign/core/Text"
import type { TFunction } from "../../i18n"
import type { PokedexKey } from "../../i18n/messages/pokedex"

/** 도감 목록용 작은 ♀♂ 표시 (암수 모습이 다른 종) */
export function GenderDiffMark({ t }: { t: TFunction<PokedexKey> }) {
    const label = t("genderDiffers")
    return (
        <Text type="supporting" aria-label={label} role="img">
            ♀♂
        </Text>
    )
}
