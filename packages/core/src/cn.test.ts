import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("une clases y omite valores vacíos", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});
