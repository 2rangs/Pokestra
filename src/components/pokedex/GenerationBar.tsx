import { useEffect, useRef } from "react"
import { Button } from "@astryxdesign/core/Button"
import { Icon } from "@astryxdesign/core/Icon"
import { Selector } from "@astryxdesign/core/Selector"
import type { Lang, TFunction } from "../../i18n"
import type { PokedexKey } from "../../i18n/messages/pokedex"
import { generationName } from "../../lib/dex"
import { LATEST_GEN } from "../../lib/generation"

const CURRENT = "current"

interface Cry {
    primary: string | null
    legacy: string | null
    latest: string | null
}

/** 세대 선택 (드롭다운). 기본값 "현재" = 최신 값 */
export function GenerationSelect({
    debut,
    gen,
    onChange,
    lang,
    t,
}: {
    debut: number
    gen: number | null
    onChange: (gen: number | null) => void
    lang: Lang
    t: TFunction<PokedexKey>
}) {
    const options = [{ value: CURRENT, label: t("genCurrent") }]
    for (let g = LATEST_GEN - 1; g >= Math.max(debut, 1); g--) options.push({ value: String(g), label: generationName(g, lang) })
    return (
        <Selector
            label={t("genBarLabel")}
            isLabelHidden
            size="sm"
            variant="secondary"
            options={options}
            value={gen === null ? CURRENT : String(gen)}
            onChange={(v) => onChange(v === CURRENT ? null : Number(v))}
            renderValue={(o) => `${t("generation")}: ${o.label}`}
            presentation="adaptive"
        />
    )
}

interface CryButton {
    key: string
    label: string
    url: string | null
    primary: boolean
}

/**
 * 울음소리 재생. 고른 세대에 맞는 소리(cryAt 의 primary)가 주 버튼, 다른 소리는 보조(ghost) 버튼.
 * 로딩 중에는 로드 후와 같은 개수·라벨·순서로 비활성 자리만 잡아 줄 너비가 바뀌지 않게 한다.
 */
export function CryButtons({
    cry,
    debut,
    legacyFirst,
    loading = false,
    t,
}: {
    cry: Cry
    debut: number
    /** 5세대 이하를 골랐으면 true (로딩 중 버튼 순서용) */
    legacyFirst: boolean
    loading?: boolean
    t: TFunction<PokedexKey>
}) {
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
    const buttons: CryButton[] = []
    if (loading) {
        // 5세대 이하 등장은 옛날/최신 두 개, 그 뒤는 하나. 5세대 이하를 고르면 옛날 소리가 앞(주)
        if (debut <= 5) {
            const legacy: CryButton = { key: "legacy", label: `${t("cryPlay")} · ${t("cryLegacy")}`, url: null, primary: legacyFirst }
            const latest: CryButton = { key: "latest", label: `${t("cryPlay")} · ${t("cryLatest")}`, url: null, primary: !legacyFirst }
            buttons.push(...(legacyFirst ? [legacy, latest] : [latest, legacy]))
        } else {
            buttons.push({ key: "one", label: t("cryPlay"), url: null, primary: true })
        }
    } else if (split) {
        const legacy: CryButton = { key: "legacy", label: `${t("cryPlay")} · ${t("cryLegacy")}`, url: cry.legacy, primary: cry.primary === cry.legacy }
        const latest: CryButton | null = cry.latest
            ? { key: "latest", label: `${t("cryPlay")} · ${t("cryLatest")}`, url: cry.latest, primary: cry.primary === cry.latest }
            : null
        buttons.push(...(latest && latest.primary ? [latest, legacy] : latest ? [legacy, latest] : [legacy]))
    } else {
        const url = cry.latest ?? cry.legacy
        if (url) buttons.push({ key: "one", label: t("cryPlay"), url, primary: true })
    }

    return (
        <>
            {buttons.map((b) => (
                <Button
                    key={b.key}
                    size="sm"
                    variant={b.primary ? "secondary" : "ghost"}
                    label={b.label}
                    icon={<Icon icon="microphone" />}
                    isDisabled={!b.url}
                    onClick={() => b.url && play(b.url)}
                />
            ))}
        </>
    )
}
