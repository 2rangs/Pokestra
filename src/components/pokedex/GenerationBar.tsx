import { useEffect, useRef } from "react"
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
    /** 상세 데이터 로딩 중이면 울음소리 버튼을 비활성으로 자리만 잡는다 */
    loading?: boolean
    lang: Lang
    t: TFunction<PokedexKey>
}

interface CryButton {
    key: string
    label: string
    url: string | null
    primary: boolean
}

/** 세대 선택 막대 + 울음소리 재생 */
export function GenerationBar({ debut, gen, onChange, cry, loading = false, t }: Props) {
    const gens: number[] = []
    for (let g = Math.max(debut, 1); g < LATEST_GEN; g++) gens.push(g)

    // 한 번에 하나만 재생: 새로 누르면 이전 소리는 멈춘다
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const play = (url: string) => {
        audioRef.current?.pause()
        const audio = new Audio(url)
        audioRef.current = audio
        audio.play().catch(() => {})
    }
    // 다른 화면이나 다른 포켓몬(울음소리가 바뀜)으로 가면 재생을 멈춘다
    useEffect(() => () => audioRef.current?.pause(), [cry.legacy, cry.latest])

    const split = cry.legacy && cry.legacy !== cry.latest
    const cryButtons: CryButton[] = []
    if (loading) {
        // 로딩 중에도 로드 후와 같은 개수·라벨로 자리를 잡아 두어 줄 너비가 바뀌지 않게 한다
        // (5세대 이하 등장은 옛날/최신 울음소리 두 개, 그 뒤는 하나)
        // 순서도 로드 후와 같게: 5세대 이하를 고르면 옛날 소리가 앞(주), 아니면 최신이 앞
        if (debut <= 5) {
            const legacyFirst = gen !== null && gen <= 5
            const legacy: CryButton = { key: "legacy", label: `${t("cryPlay")} · ${t("cryLegacy")}`, url: null, primary: legacyFirst }
            const latest: CryButton = { key: "latest", label: `${t("cryPlay")} · ${t("cryLatest")}`, url: null, primary: !legacyFirst }
            cryButtons.push(...(legacyFirst ? [legacy, latest] : [latest, legacy]))
        } else {
            cryButtons.push({ key: "one", label: t("cryPlay"), url: null, primary: true })
        }
    } else if (split) {
        const legacy: CryButton = { key: "legacy", label: `${t("cryPlay")} · ${t("cryLegacy")}`, url: cry.legacy, primary: cry.primary === cry.legacy }
        const latest: CryButton | null = cry.latest
            ? { key: "latest", label: `${t("cryPlay")} · ${t("cryLatest")}`, url: cry.latest, primary: cry.primary === cry.latest }
            : null
        cryButtons.push(...(latest && latest.primary ? [latest, legacy] : latest ? [legacy, latest] : [legacy]))
    } else {
        const url = cry.latest ?? cry.legacy
        if (url) cryButtons.push({ key: "one", label: t("cryPlay"), url, primary: true })
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
                    variant={b.primary && cryButtons.length > 1 ? "secondary" : "ghost"}
                    label={b.label}
                    icon={<Icon icon="microphone" />}
                    isDisabled={!b.url}
                    onClick={() => b.url && play(b.url)}
                />
            ))}
        </HStack>
    )
}
