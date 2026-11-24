/** className 이어 붙이기 (falsy 무시) */
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
