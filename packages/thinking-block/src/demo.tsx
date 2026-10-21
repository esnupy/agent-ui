"use client";

import { useReducedMotion } from "@ai-components/core";
import { useEffect, useState } from "react";
import { ThinkingBlock } from "./thinking-block";

const LINE_MS = 2600;
const SETTLE_MS = 1800;

const LINES = [
  "Reviso el diff antes de tocar el parser.",
  "El cursor se pierde cuando el token se parte en dos chunks.",
  "Voy a guardar el offset del último delimitador.",
  "Con eso el stream puede retomar sin repetir el prefijo.",
];

/**
 * Un bloque que va soltando líneas y, al terminar, se pliega solo.
 *
 * @returns La demo.
 */
export const Demo = () => {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(reduced ? LINES.length : 1);
  const [done, setDone] = useState(reduced);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (reduced || done) return undefined;

    if (count < LINES.length) {
      const id = window.setTimeout(() => {
        setCount((current) => current + 1);
      }, LINE_MS);

      return () => {
        window.clearTimeout(id);
      };
    }

    const id = window.setTimeout(() => {
      setDone(true);
    }, SETTLE_MS);

    return () => {
      window.clearTimeout(id);
    };
  }, [count, done, reduced]);

  const text = LINES.slice(0, count).join("\n");
  const preview = LINES[count - 1] ?? "";

  const handleReplay = () => {
    setRun((current) => current + 1);
    setCount(1);
    setDone(false);
  };

  return (
    <div className="thinking-block-demo">
      <ThinkingBlock
        defaultOpen
        duration={10}
        key={run}
        preview={preview}
        status={done ? "done" : "thinking"}
        text={text}
      />
      {done && !reduced ? (
        <button className="thinking-block-demo__replay" onClick={handleReplay} type="button">
          Ver de nuevo
        </button>
      ) : null}
    </div>
  );
};
