import { typeNameL } from '../../lib/battle'
import { useLang } from '../../i18n'
import { TypeTag } from '../ui/shared'

/**
 * 타입 표시 (아이콘 + 현재 언어의 이름).
 * 공용 TypeTag 를 그대로 쓰되, 'stellar' 처럼 도감에 없는 타입도 이름이 나오도록
 * 배틀 엔진 쪽 이름표(typeNameL)를 넘긴다. 예전 props 와 호환된다.
 */
export function TypeBadge({ type, size = 'sm', className, title }: {
    type: string
    size?: 'xs' | 'sm'
    className?: string
    title?: string
}) {
    const lang = useLang()
    return <TypeTag type={type} size={size} label={typeNameL(type, lang)} title={title} className={className} />
}
