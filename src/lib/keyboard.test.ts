import { expect, test } from "vitest"
import { isSlashShortcut } from "./keyboard"

const ev = (o: Partial<Parameters<typeof isSlashShortcut>[0]> = {}) =>
    ({ key: "/", altKey: false, ctrlKey: false, metaKey: false, defaultPrevented: false, isComposing: false, ...o })
const body = { tagName: "BODY", isContentEditable: false }
test("slash on page body → true", () => expect(isSlashShortcut(ev(), body)).toBe(true))
test("slash with null target → true", () => expect(isSlashShortcut(ev(), null)).toBe(true))
test.each(["INPUT", "TEXTAREA", "SELECT"])("slash typed in %s → false", (tag) =>
    expect(isSlashShortcut(ev(), { tagName: tag, isContentEditable: false })).toBe(false))
test("contenteditable → false", () => expect(isSlashShortcut(ev(), { tagName: "DIV", isContentEditable: true })).toBe(false))
test("IME composing → false", () => expect(isSlashShortcut(ev({ isComposing: true }), body)).toBe(false))
test.each(["altKey", "ctrlKey", "metaKey", "defaultPrevented"] as const)("%s → false", (k) =>
    expect(isSlashShortcut(ev({ [k]: true }), body)).toBe(false))
test("other key → false", () => expect(isSlashShortcut(ev({ key: "?" }), body)).toBe(false))
