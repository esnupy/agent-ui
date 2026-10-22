import { describe, expect, it } from "vitest";
import { resolveShortcut } from "./shortcuts";

describe("resolveShortcut", () => {
  it("mapea las teclas del reproductor", () => {
    expect(resolveShortcut({ key: " " })).toBe("toggle");
    expect(resolveShortcut({ key: "ArrowLeft" })).toBe("prev");
    expect(resolveShortcut({ key: "ArrowRight" })).toBe("next");
    expect(resolveShortcut({ key: "j" })).toBe("rewind");
    expect(resolveShortcut({ key: "K" })).toBe("pause");
    expect(resolveShortcut({ key: "l" })).toBe("forward");
    expect(resolveShortcut({ key: "Home" })).toBe("start");
    expect(resolveShortcut({ key: "End" })).toBe("end");
    expect(resolveShortcut({ key: "[" })).toBe("slower");
    expect(resolveShortcut({ key: "]" })).toBe("faster");
  });

  it("deja pasar combinaciones y teclas ajenas", () => {
    expect(resolveShortcut({ key: "l", metaKey: true })).toBeNull();
    expect(resolveShortcut({ key: "ArrowLeft", altKey: true })).toBeNull();
    expect(resolveShortcut({ key: "x" })).toBeNull();
  });
});
