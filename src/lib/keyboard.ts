/** `/` 키로 검색창에 포커스를 줄지 판단한다 (입력 중·IME 조합 중·보조키 조합이면 건너뜀). */
export function isSlashShortcut(
    e: { key: string; altKey: boolean; ctrlKey: boolean; metaKey: boolean; defaultPrevented: boolean; isComposing: boolean },
    target: { tagName: string; isContentEditable: boolean } | null,
): boolean {
    if (e.key !== "/" || e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented || e.isComposing) return false
    if (!target) return true
    if (target.isContentEditable) return false
    return !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
}
