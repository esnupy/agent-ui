import { render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { Shimmer } from "./shimmer";

describe("Shimmer", () => {
  it("barre el borde una vez cuando no tiene texto", () => {
    const { container } = render(<Shimmer />);
    const shimmer = container.querySelector(".ac-shimmer");

    expect(shimmer).toHaveAttribute("data-mode", "once");
    expect(shimmer).toHaveAttribute("data-text", "false");
    expect(shimmer).toHaveAttribute("aria-hidden", "true");
  });

  it("brilla el texto cuando hay hijos", () => {
    const { container } = render(<Shimmer mode="loop">Thinking</Shimmer>);

    expect(container.querySelector(".ac-shimmer")).toHaveAttribute("data-text", "true");
    expect(container.querySelector(".ac-shimmer")).toHaveAttribute("data-mode", "loop");
    expect(container.querySelector(".ac-shimmer__band")).toHaveTextContent("Thinking");
  });
});
