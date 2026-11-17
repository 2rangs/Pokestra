import { useLang } from '../i18n'
import { typeName } from '../lib/dex'
import { TypeIconDot, TypeTag } from './ui/shared'

type Props = {
    types: readonly string[]
    /** 아이콘만 표시 (이름은 스크린리더용으로만) */
    iconOnly?: boolean
    size?: 'xs' | 'sm' | 'md' | 'lg'
    className?: string
}

/** 타입 태그 묶음 (현재 언어의 타입 이름) */
export function TypeIcon({ types, iconOnly = false, size = 'md', className = '' }: Props) {
    const lang = useLang()
    return (
        <span className={`flex flex-wrap gap-1.5 ${className}`}>
            {types.map((type) => {
                if (!iconOnly) return <TypeTag key={type} type={type} size={size} />
                const label = typeName(type, lang)
                return (
                    <span key={type} title={label} className="inline-flex">
                        <TypeIconDot type={type} className="h-5 w-5" />
                        <span className="sr-only">{label}</span>
                    </span>
                )
            })}
        </span>
    )
}
