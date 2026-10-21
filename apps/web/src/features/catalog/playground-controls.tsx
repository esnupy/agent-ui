"use client";

import type { ComponentSchema } from "@componentes-ia/core";
import { formatPropType, type PlaygroundValues } from "@/lib/prompt";

type PlaygroundControlsProps = {
  schema: ComponentSchema;
  values: PlaygroundValues;
  onChange: (key: string, value: string | number | boolean) => void;
};

const fieldClass =
  "h-10 w-full border border-zinc-300 bg-white px-3 text-sm outline-none focus-visible:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-950 dark:focus-visible:border-zinc-100";

/**
 * Controles nativos generados desde el esquema.
 *
 * @param props - Esquema, valores y el callback de cambio.
 * @returns El grupo de controles.
 */
export const PlaygroundControls = ({ schema, values, onChange }: PlaygroundControlsProps) => {
  return (
    <div className="grid gap-6">
      {Object.entries(schema.props).map(([key, prop]) => {
        const id = `prop-${key}`;
        const value = values[key];

        return (
          <label className="grid gap-2" htmlFor={id} key={key}>
            <span className="flex items-baseline justify-between gap-3">
              <span className="font-mono text-[13px]">{key}</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                {prop.type}
              </span>
            </span>
            {prop.type === "enum" ? (
              <select
                className={fieldClass}
                id={id}
                onChange={(event) => {
                  onChange(key, event.target.value);
                }}
                value={String(value ?? "")}
              >
                {prop.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : null}
            {prop.type === "string" ? (
              <input
                autoComplete="off"
                className={fieldClass}
                id={id}
                onChange={(event) => {
                  onChange(key, event.target.value);
                }}
                type="text"
                value={String(value ?? "")}
              />
            ) : null}
            {prop.type === "number" ? (
              <span className="grid gap-2">
                <input
                  aria-valuemax={prop.max}
                  aria-valuemin={prop.min}
                  className="accent-zinc-950 dark:accent-zinc-100"
                  id={id}
                  max={prop.max}
                  min={prop.min}
                  onChange={(event) => {
                    onChange(key, Number(Number(event.target.value).toFixed(2)));
                  }}
                  step={0.05}
                  type="range"
                  value={Number(value ?? prop.min ?? 0)}
                />
                <span className="font-mono text-xs tabular-nums text-zinc-500">
                  {String(value)}
                </span>
              </span>
            ) : null}
            {prop.type === "boolean" || prop.type === "function" ? (
              <span className="flex items-center gap-2 text-sm">
                <input
                  checked={Boolean(value)}
                  className="size-4 accent-zinc-950 dark:accent-zinc-100"
                  id={id}
                  onChange={(event) => {
                    onChange(key, event.target.checked);
                  }}
                  type="checkbox"
                />
                <span>{prop.type === "function" ? "Pasar callback" : "Activado"}</span>
              </span>
            ) : null}
            <span className="text-xs leading-5 text-zinc-500">
              {prop.description} {prop.type === "enum" ? formatPropType(prop) : ""}
            </span>
          </label>
        );
      })}
    </div>
  );
};
