import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { BotAvatar } from "./bot-avatar";
import { BotAvatarGroup } from "./bot-avatar-group";
import {
  createMotion,
  evaluateHop,
  expressionFor,
  mouthFor,
  restPose,
  syntheticSpeech,
} from "./motion";
import { hashString } from "./random";
import { BOT_SHAPES, BOT_STATES, schema } from "./schema";
import { BODY, getGeometry, restPath, SAMPLES } from "./shapes";
import { BOT_PRESETS, getBotTraits } from "./traits";

const mockReducedMotion = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
};

const numbersOf = (path: string) => (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

const run = (
  motion: ReturnType<typeof createMotion>,
  input: Parameters<typeof motion.step>[0],
  seconds: number,
) => {
  let pose = motion.step(input, 1 / 60);
  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60) pose = motion.step(input, 1 / 60);
  return pose;
};

describe("shapes", () => {
  it("dibuja cada forma cerrada, suave y dentro del cuadro del cuerpo", () => {
    for (const shape of BOT_SHAPES) {
      const path = restPath(getGeometry(shape, "x"));

      expect(path.startsWith("M")).toBe(true);
      expect(path.endsWith("Z")).toBe(true);
      expect(path.split("C")).toHaveLength(SAMPLES + 1);

      for (const value of numbersOf(path)) {
        expect(Number.isFinite(value)).toBe(true);
        expect(Math.abs(value)).toBeLessThanOrEqual(BODY + 4);
      }
    }
  });

  it("solo el blob cambia con la semilla", () => {
    expect(restPath(getGeometry("blob", "a"))).not.toBe(restPath(getGeometry("blob", "b")));
    expect(restPath(getGeometry("cat", "a"))).toBe(restPath(getGeometry("cat", "b")));
  });

  it("deja la coronilla arriba y la base abajo", () => {
    for (const shape of BOT_SHAPES) {
      const geometry = getGeometry(shape, "x");
      expect(geometry.top).toBeLessThan(0);
      expect(geometry.bottom).toBeGreaterThan(0);
      expect(geometry.peak).toBeLessThanOrEqual(geometry.top + 0.01);
    }
  });
});

describe("getBotTraits", () => {
  it("da siempre el mismo bot para el mismo id", () => {
    expect(getBotTraits("agente-42")).toEqual(getBotTraits("agente-42"));
    expect(hashString("Nova")).toBe(hashString("Nova"));
  });

  it("reparte formas y colores distintos", () => {
    const traits = Array.from({ length: 60 }, (_, index) => getBotTraits(`id-${index}`));

    expect(new Set(traits.map((trait) => trait.shape)).size).toBeGreaterThan(8);
    expect(new Set(traits.map((trait) => trait.color)).size).toBeGreaterThan(8);
    expect(traits.some((trait) => trait.accessory === "none")).toBe(true);
    expect(traits.some((trait) => trait.accessory !== "none")).toBe(true);
  });
});

describe("motion", () => {
  it("elige la expresión y la boca de cada estado", () => {
    expect(expressionFor("sleeping")).toBe("closed");
    expect(expressionFor("success")).toBe("happy");
    expect(expressionFor("error", 0.2)).toBe("squeeze");
    expect(expressionFor("error")).toBe("sad");
    expect(mouthFor("speaking", "open", "eyes")).toBe("talk");
    expect(mouthFor("idle", "open", "eyes")).toBe("none");
    expect(mouthFor("idle", "open", "mouth")).toBe("smile");
    expect(mouthFor("success", "happy", "visor")).toBe("grin");
  });

  it("salta con anticipación, vuelo y aterrizaje", () => {
    expect(evaluateHop(0.1, 10, false).squash).toBeLessThan(0);
    expect(evaluateHop(0.5, 10, false).y).toBeCloseTo(-10, 0);
    expect(evaluateHop(0.95, 10, false).y).toBe(0);
    expect(evaluateHop(0.49, 10, true).yaw).toBeCloseTo(Math.PI, 1);
    expect(evaluateHop(1, 10, true)).toEqual({ y: 0, squash: 0, yaw: 0 });
  });

  it("habla sola entre 0 y 1", () => {
    for (let time = 0; time < 5; time += 0.07) {
      const open = syntheticSpeech(time);
      expect(open).toBeGreaterThanOrEqual(0);
      expect(open).toBeLessThanOrEqual(1);
    }
  });

  it("brinca de gusto al pasar a success", () => {
    const motion = createMotion(1);
    run(motion, { state: "idle", level: 0, pointer: null }, 0.2);

    let highest = 0;
    for (let frame = 0; frame < 40; frame += 1) {
      const pose = motion.step({ state: "success", level: 0, pointer: null }, 1 / 60);
      highest = Math.min(highest, pose.y);
    }

    expect(highest).toBeLessThan(-8);
  });

  it("abre la boca con el volumen", () => {
    const motion = createMotion(2);
    const pose = run(motion, { state: "speaking", level: 1, pointer: null }, 0.5);

    expect(pose.mouth).toBeGreaterThan(0.85);
  });

  it("mira hacia el puntero", () => {
    const motion = createMotion(3);
    const pose = run(motion, { state: "idle", level: 0, pointer: { x: 3, y: 0 } }, 1);

    expect(pose.gazeX).toBeGreaterThan(0.8);
  });

  it("sonríe al tocarlo y se despierta un momento si duerme", () => {
    const awake = createMotion(4);
    awake.step({ state: "idle", level: 0, pointer: null }, 1 / 60);
    awake.poke();
    expect(awake.step({ state: "idle", level: 0, pointer: null }, 1 / 60).expression).toBe("happy");

    const asleep = createMotion(5);
    asleep.step({ state: "sleeping", level: 0, pointer: null }, 1 / 60);
    asleep.poke();
    expect(asleep.step({ state: "sleeping", level: 0, pointer: null }, 1 / 60).expression).toBe(
      "wide",
    );
  });

  it("no parpadea dormido y todo queda finito", () => {
    const motion = createMotion(6);

    for (const state of BOT_STATES) {
      for (let frame = 0; frame < 300; frame += 1) {
        const pose = motion.step({ state, level: 0.5, pointer: null }, 1 / 60);
        for (const value of Object.values(pose)) {
          if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
        }
        if (state === "sleeping") expect(pose.blink).toBe(0);
      }
    }
  });

  it("tiene una pose quieta para cada estado", () => {
    expect(restPose("listening").roll).toBeGreaterThan(0);
    expect(restPose("speaking").mouth).toBeGreaterThan(0);
    expect(restPose("sleeping").sy).toBeLessThan(1);
  });
});

describe("BotAvatar", () => {
  afterEach(() => {
    mockReducedMotion(false);
  });

  it("se anuncia como imagen con nombre y estado", () => {
    const { rerender } = render(<BotAvatar />);
    expect(screen.getByRole("img")).toHaveAccessibleName("Bot, en espera");

    rerender(<BotAvatar label="Nova" state="thinking" />);
    expect(screen.getByRole("img")).toHaveAccessibleName("Nova, pensando");
  });

  it("resuelve forma, color y accesorio con la semilla", () => {
    const traits = getBotTraits("agente-7");
    render(<BotAvatar accessory="auto" seed="agente-7" />);
    const root = screen.getByRole("img");

    expect(root).toHaveAttribute("data-shape", traits.shape);
    expect(root).toHaveAttribute("data-accessory", traits.accessory);
    expect(root.style.getPropertyValue("--bot-color")).toBe(traits.color);
  });

  it("respeta forma, color, tamaño y apariencia explícitos", () => {
    render(<BotAvatar color="#123456" face="visor" finish="glossy" shape="cat" size={64} />);
    const root = screen.getByRole("img");

    expect(root).toHaveAttribute("data-shape", "cat");
    expect(root).toHaveAttribute("data-face", "visor");
    expect(root).toHaveAttribute("data-finish", "glossy");
    expect(root.style.getPropertyValue("--bot-color")).toBe("#123456");
    expect(root.style.getPropertyValue("--bot-size")).toBe("64px");
    expect(root.querySelector('[data-part="visor"]')).toBeInTheDocument();
  });

  it("dibuja accesorios en la cabeza y lentes en la cara", () => {
    const { container, rerender } = render(<BotAvatar accessory="antenna" shape="orb" />);
    expect(
      container.querySelector('[data-part="hat"] [data-part="antenna-tip"]'),
    ).toBeInTheDocument();

    rerender(<BotAvatar accessory="glasses" shape="orb" />);
    expect(container.querySelector('[data-part="hat"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-part="face"] .bot-avatar__glasses')).toBeInTheDocument();
  });

  it("cambia cara, boca y efectos según el estado", () => {
    const { container, rerender } = render(<BotAvatar face="mouth" paused state="sleeping" />);
    const svg = () => container.querySelector("svg");

    expect(svg()).toHaveAttribute("data-expression", "closed");
    expect(svg()).toHaveAttribute("data-mouth", "o");
    expect(container.querySelectorAll(".bot-avatar__zzz text")).toHaveLength(3);

    rerender(<BotAvatar face="mouth" paused state="thinking" />);
    expect(container.querySelectorAll('[data-part="orbit-front"]')).toHaveLength(3);
    expect(container.querySelector(".bot-avatar__zzz")).not.toBeInTheDocument();

    rerender(<BotAvatar paused state="speaking" />);
    expect(svg()).toHaveAttribute("data-mouth", "talk");

    rerender(<BotAvatar paused state="listening" />);
    expect(container.querySelectorAll(".bot-avatar__ripple")).toHaveLength(2);
  });

  it("se mueve solo y salta al tocarlo", async () => {
    const { container } = render(<BotAvatar shape="orb" />);
    const figure = container.querySelector('[data-part="figure"]');
    const initial = figure?.getAttribute("transform");

    act(() => {
      fireEvent.pointerDown(screen.getByRole("img"));
    });

    await waitFor(() => {
      expect(figure?.getAttribute("transform")).not.toBe(initial);
    });
  });

  it("se queda quieto con paused o cuando el sistema pide menos movimiento", async () => {
    const { rerender } = render(<BotAvatar paused />);
    expect(screen.getByRole("img")).toHaveAttribute("data-motion", "paused");

    mockReducedMotion(true);
    rerender(<BotAvatar key="reduced" />);

    await waitFor(() => {
      expect(screen.getByRole("img")).toHaveAttribute("data-motion", "reduced");
    });
  });

  it("acepta los presets del elenco", () => {
    render(<BotAvatar {...BOT_PRESETS.tito} />);
    const root = screen.getByRole("img");

    expect(root).toHaveAttribute("data-shape", "droid");
    expect(root).toHaveAttribute("data-face", "visor");
    expect(root).toHaveAttribute("data-accessory", "antenna");
  });

  it("declara los defaults en el esquema", () => {
    expect(schema.props.state.default).toBe("idle");
    expect(schema.props.state.options).toEqual(BOT_STATES);
    expect(schema.props.shape.options).toContain("auto");
    expect(schema.props.size.default).toBe(96);
    expect(schema.props.level.max).toBe(1);
  });
});

describe("BotAvatarGroup", () => {
  it("reparte el tamaño y resume los que no caben", () => {
    render(
      <BotAvatarGroup label="Equipo" max={2} size={40}>
        <BotAvatar seed="a" />
        <BotAvatar seed="b" />
        <BotAvatar seed="c" />
        <BotAvatar seed="d" />
      </BotAvatarGroup>,
    );

    const group = screen.getByRole("list", { name: "Equipo" });
    const avatars = screen.getAllByRole("img");

    expect(avatars).toHaveLength(2);
    expect(avatars[0]?.style.getPropertyValue("--bot-size")).toBe("40px");
    expect(group).toHaveTextContent("+2");
    expect(group).toHaveTextContent("y 2 más");
  });
});
