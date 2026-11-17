import { useLang } from '../i18n'
import { typeName } from '../lib/dex'

type Props = {
    types: readonly string[]
    /** 아이콘만 표시 (이름은 스크린리더용으로만) */
    iconOnly?: boolean
    className?: string
}

/** 타입 배지 묶음 (현재 언어의 타입 이름) */
export function TypeIcon({ types, iconOnly = false, className = '' }: Props) {
    const lang = useLang()
    return (
        <div className={`flex flex-wrap gap-1 ${className}`}>
            {types.map((type) => {
                const label = typeName(type, lang)
                return (
                    <span
                        key={type}
                        title={iconOnly ? label : undefined}
                        className={`${type} inline-flex min-h-7 items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-xs font-bold leading-none text-white`}
                    >
                        <img
                            src={`${import.meta.env.BASE_URL}assets/types/${type}.svg`}
                            alt=""
                            aria-hidden
                            className="h-4 w-4 shrink-0"
                        />
                        <span className={iconOnly ? 'sr-only' : 'leading-none'}>{label}</span>
                    </span>
                )
            })}
        </div>
    )
}
