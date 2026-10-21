"use client";

import { useState } from "react";
import { AgentComposer } from "./agent-composer";

const INITIAL = "Ajusta el parser para que el stream no pierda el cursor.";

/**
 * Un compositor vivo, con las cuatro acciones y un borrador de ejemplo.
 *
 * @returns El formulario de la demo.
 */
export const Demo = () => {
  const [value, setValue] = useState(INITIAL);

  return (
    <div className="agent-composer-demo">
      <AgentComposer
        model="Modelo rápido"
        onSubmit={() => {
          setValue("");
        }}
        onValueChange={setValue}
        value={value}
      />
    </div>
  );
};
