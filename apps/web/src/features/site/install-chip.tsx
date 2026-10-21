"use client";

import { useState } from "react";

type InstallChipProps = {
  command: string;
};

/**
 * Comando de instalación en una sola línea, con botón para copiarlo.
 *
 * @param props - El comando completo, por ejemplo `npm install @componentes-ia/core`.
 * @returns La cápsula.
 */
export const InstallChip = ({ command }: InstallChipProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex h-11 w-full items-center gap-2 border border-zinc-300 bg-white pl-3 dark:border-zinc-700 dark:bg-zinc-950">
      <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-zinc-800 dark:text-zinc-200">
        {command}
      </code>
      <button
        aria-label={copied ? "Comando copiado" : "Copiar comando"}
        className="mr-1 inline-flex h-8 shrink-0 items-center px-2.5 text-xs text-zinc-600 hover:text-zinc-950 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 dark:focus-visible:outline-zinc-50"
        onClick={handleCopy}
        type="button"
      >
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
};
