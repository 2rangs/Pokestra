import { useEffect, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { Text } from '@astryxdesign/core/Text'
import { damageClassName } from '../../lib/dex'
import { useLang } from '../../i18n'

/** 기술 분류 (물리/특수/변화): 보조 텍스트 */
export function CategoryLabel({ category }: { category: string }) {
    const lang = useLang()
    return <Text type="supporting" color="secondary">{damageClassName(category, lang)}</Text>
}

/** 데미지 범위 막대: 진한 칸 = 최소 데미지, 옅은 칸 = 최대 데미지 */
export function HpBar({ min, max, label, size = 'sm' }: { min: number; max: number; label: string; size?: 'sm' | 'md' }) {
    const a = Math.min(100, Math.max(0, min * 100))
    const b = Math.min(100, Math.max(0, max * 100))
    return (
        <span
            role="img" aria-label={label} title={label}
            className={`relative block w-full overflow-hidden rounded-full bg-track ${size === 'md' ? 'h-3' : 'h-1.5'}`}
        >
            <span className="absolute inset-y-0 left-0 bg-error/35" style={{ width: `${b}%` }} />
            <span className="absolute inset-y-0 left-0 bg-error" style={{ width: `${a}%` }} />
        </span>
    )
}

/** 클립보드 복사 버튼 ("복사됨" 피드백) */
export function CopyButton({ text, label, copiedLabel }: { text: string; label: string; copiedLabel: string }) {
    const [copied, setCopied] = useState(false)
    useEffect(() => {
        if (!copied) return
        const id = setTimeout(() => setCopied(false), 1500)
        return () => clearTimeout(id)
    }, [copied])
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
        } catch {
            /* 클립보드 권한 없음: 무시 */
        }
    }
    return (
        <span aria-live="polite" className="shrink-0">
            <Button
                size="sm"
                variant="secondary"
                label={copied ? copiedLabel : label}
                icon={<Icon icon={copied ? 'check' : 'copy'} />}
                onClick={copy}
            />
        </span>
    )
}
