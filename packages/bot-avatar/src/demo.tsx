"use client";

import { useReducedMotion } from "@componentes-ia/core";
import { useEffect, useId, useState } from "react";
import { BotAvatar } from "./bot-avatar";
import { BotAvatarGroup } from "./bot-avatar-group";
import { BOT_STATES, type BotState } from "./schema";
import { BOT_PRESETS, type BotPresetName } from "./traits";

const CYCLE_MS = 3200;

const CHIP: Record<BotState, string> = {
  idle: "Espera",
  thinking: "Piensa",
  working: "Trabaja",
  speaking: "Habla",
  listening: "Escucha",
  sleeping: "Duerme",
  success: "Éxito",
  error: "Error",
};

const NAMES = [
  "Nova",
  "Pixel",
  "Lumen",
  "Byte",
  "Kiwi",
  "Orión",
  "Taco",
  "Zeta",
  "Nimbus",
  "Mango",
  "Atlas",
  "Coco",
  "Rayo",
  "Echo",
];

const CAST: ReadonlyArray<{ name: BotPresetName; state: BotState }> = [
  { name: "mochi", state: "idle" },
  { name: "tito", state: "working" },
  { name: "boo", state: "speaking" },
  { name: "miau", state: "listening" },
  { name: "nube", state: "sleeping" },
  { name: "fiesta", state: "success" },
  { name: "brote", state: "thinking" },
  { name: "gema", state: "error" },
];

const TEAM = ["ana", "bruno", "carla", "dani", "eli", "fer"];

/**
 * Un bot que se bautiza con un nombre, el elenco en todos los estados y un equipo.
 *
 * @returns La demo.
 */
export const Demo = () => {
  const reduced = useReducedMotion();
  const inputId = useId();
  const [name, setName] = useState("Nova");
  const [state, setState] = useState<BotState>("idle");
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto || reduced) return undefined;

    const id = window.setInterval(() => {
      setState((current) => {
        const index = BOT_STATES.indexOf(current);
        return BOT_STATES[(index + 1) % BOT_STATES.length] ?? "idle";
      });
    }, CYCLE_MS);

    return () => {
      window.clearInterval(id);
    };
  }, [auto, reduced]);

  const handleShuffle = () => {
    const options = NAMES.filter((option) => option !== name);
    setName(options[Math.floor(Math.random() * options.length)] ?? "Nova");
  };

  return (
    <div className="bot-avatar-demo">
      <div className="bot-avatar-demo__hero">
        <div className="bot-avatar-demo__stage">
          <BotAvatar
            accessory="auto"
            face="mouth"
            label={name || "Bot"}
            seed={name || "Bot"}
            size={112}
            state={state}
          />
        </div>
        <div className="bot-avatar-demo__controls">
          <div className="bot-avatar-demo__field">
            <label htmlFor={inputId}>Bautiza a tu bot</label>
            <span className="bot-avatar-demo__row">
              <input
                autoComplete="off"
                className="bot-avatar-demo__input"
                id={inputId}
                maxLength={24}
                onChange={(event) => {
                  setName(event.target.value);
                }}
                spellCheck={false}
                type="text"
                value={name}
              />
              <button className="bot-avatar-demo__chip" onClick={handleShuffle} type="button">
                Otro
              </button>
            </span>
          </div>
          <fieldset className="bot-avatar-demo__chips">
            <legend className="ac-sr-only">Estado</legend>
            {BOT_STATES.map((option) => (
              <button
                aria-pressed={state === option}
                className="bot-avatar-demo__chip"
                key={option}
                onClick={() => {
                  setAuto(false);
                  setState(option);
                }}
                type="button"
              >
                {CHIP[option]}
              </button>
            ))}
          </fieldset>
        </div>
      </div>

      <ul aria-label="Elenco" className="bot-avatar-demo__cast">
        {CAST.map((member) => (
          <li className="bot-avatar-demo__member" key={member.name}>
            <BotAvatar
              {...BOT_PRESETS[member.name]}
              label={member.name}
              seed={member.name}
              size={58}
              state={member.state}
            />
            <span className="bot-avatar-demo__name">{member.name}</span>
          </li>
        ))}
      </ul>

      <div className="bot-avatar-demo__team">
        <BotAvatarGroup label={`${TEAM.length} agentes en línea`} max={4} size={42}>
          {TEAM.map((member, index) => (
            <BotAvatar
              key={member}
              label={member}
              seed={member}
              state={index === 0 ? "working" : "idle"}
            />
          ))}
        </BotAvatarGroup>
        <span>{TEAM.length} agentes en línea</span>
      </div>
    </div>
  );
};
