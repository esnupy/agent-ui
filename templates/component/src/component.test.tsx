import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";
import { __PASCAL__ } from "./component";

describe("__PASCAL__", () => {
  it("muestra la etiqueta", () => {
    render(<__PASCAL__ label="Hola" />);
    expect(screen.getByText("Hola")).toBeInTheDocument();
  });
});
