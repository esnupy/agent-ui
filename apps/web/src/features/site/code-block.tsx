"use client";

import { useState } from "react";

type CodeBlockProps = {
  code: string;
  label?: string;
};

/**
 * Bloque de código con un botón para copiarlo.
 *
 * @param props - El texto y una etiqueta accesible opcional.
 * @returns El bloque.
 */
export const CodeBlock = ({ code, label = "Copiar código" }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-xl border border-zinc-200 bg-white p-4 pr-24 font-mono text-[13px] leading-6 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
        <code>{code}</code>
      </pre>
      <button
        className="absolute right-3 top-3 h-8 border border-zinc-200 bg-[#f3f3f0] px-2.5 text-xs text-zinc-700 hover:border-zinc-950 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-100 dark:focus-visible:outline-zinc-50"
        onClick={handleCopy}
        type="button"
      >
        {copied ? "Copiado" : label}
      </button>
    </div>
  );
};
