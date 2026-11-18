import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import type { TablePlugin } from '@astryxdesign/core/Table'

/**
 * 표 행 전체를 링크처럼 쓴다. 행 안의 링크·버튼·입력을 누르거나 글자를 드래그해 선택했을 때는 가만히 둔다.
 * 키보드는 행 안의 이름 링크가 맡는다.
 */
export function useRowLink<T extends Record<string, unknown>>(getHref: (row: T) => string): TablePlugin<T> {
    const navigate = useNavigate()
    return useMemo<TablePlugin<T>>(
        () => ({
            rowModel: 'flat',
            transformBodyRow: (props, item) => ({
                ...props,
                htmlProps: {
                    ...props.htmlProps,
                    className: [props.htmlProps.className, 'cursor-pointer'].filter(Boolean).join(' '),
                    onClick: (e) => {
                        props.htmlProps.onClick?.(e)
                        if (e.defaultPrevented) return
                        if (e.target instanceof Element && e.target.closest('a, button, input')) return
                        if (window.getSelection()?.toString()) return
                        navigate(getHref(item))
                    },
                },
            }),
        }),
        [navigate, getHref],
    )
}
