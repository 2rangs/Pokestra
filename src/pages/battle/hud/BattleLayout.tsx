// ─── 배틀 화면 틀 (실시간 배틀·리플레이 공용) ──────────────────────
// 왼쪽: 툴바·장면·조작부, 오른쪽(넓은 화면): 로그. 장면 위 덮개(결과)도 같은 모양을 쓴다.
import { useEffect, useRef, type ReactNode } from 'react'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { VStack } from '@astryxdesign/core/VStack'

export function BattleLayout({ main, log }: { main: ReactNode; log: ReactNode }) {
    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <VStack gap={3} className="min-w-0">{main}</VStack>
            <VStack gap={2} className="min-w-0">{log}</VStack>
        </div>
    )
}

/** 장면 위 결과 덮개: 제목 + 버튼 줄. 뜨면 첫 버튼에 포커스 */
export function SceneOverlay({ title, children }: { title: string; children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => { ref.current?.querySelector<HTMLElement>('button, a')?.focus() }, [])
    return (
        <div
            ref={ref}
            role="alertdialog"
            aria-label={title}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 rounded-lg bg-surface/90 p-4 text-center"
        >
            <Heading level={2}>{title}</Heading>
            <HStack gap={2} hAlign="center" wrap="wrap">{children}</HStack>
        </div>
    )
}
