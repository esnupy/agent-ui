"use client";

import { useState } from "react";
import { CodeBlock } from "@/features/site/code-block";
import { DemoFrame } from "@/features/site/demo-frame";
import type { ComponentEntry } from "@/generated/components";
import { components } from "@/generated/components";
import { buildPrompt, buildUsage } from "@/lib/prompt";
import { PlaygroundControls } from "./playground-controls";
import { PropsTable } from "./props-table";
import { usePlayground } from "./use-playground";

type ComponentShowcaseProps = {
  slug: string;
};

type ShowcaseBodyProps = {
  entry: ComponentEntry;
};

/**
 * Demo, playground y documentación de un componente ya resuelto.
 *
 * @param props - La ficha del registro generado.
 * @returns Las secciones de la página.
 */
const ShowcaseBody = ({ entry }: ShowcaseBodyProps) => {
  const { values, handleChange, previewProps } = usePlayground(entry.schema);
  const [copied, setCopied] = useState(false);
  const usage = buildUsage({
    name: entry.name,
    packageName: entry.packageName,
    schema: entry.schema,
    values,
  });
  const prompt = buildPrompt({
    name: entry.name,
    packageName: entry.packageName,
    description: entry.description,
    schema: entry.schema,
    values,
  });
  const install = `npm install ${entry.packageName}`;
  const Preview = entry.Component;
  const LiveDemo = entry.Demo;

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
        {entry.packageName}
      </p>
      <h1 className="mt-4 font-serif text-5xl tracking-[-0.03em] md:text-6xl">{entry.title}</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
        {entry.description}
      </p>

      <section className="mt-14">
        <h2 className="font-serif text-3xl tracking-[-0.03em]">Demo</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
          Vista en vivo del componente.
        </p>
        <div className="mt-6 max-w-xl">
          <DemoFrame label={entry.name}>
            <LiveDemo />
          </DemoFrame>
        </div>
      </section>

      <section className="mt-16 grid gap-10 border-t border-zinc-200 pt-12 lg:grid-cols-[minmax(0,1fr)_20rem] dark:border-zinc-800">
        <div>
          <h2 className="font-serif text-3xl tracking-[-0.03em]">Playground</h2>
          <div className="mt-6">
            <DemoFrame label="Valores actuales">
              <Preview {...previewProps} />
            </DemoFrame>
          </div>
          <button
            className="mt-4 inline-flex h-11 items-center bg-zinc-950 px-4 text-sm text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-3 focus-visible:outline-zinc-950 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 dark:focus-visible:outline-zinc-50"
            onClick={handleCopyPrompt}
            type="button"
          >
            {copied ? "Copiado" : "Copiar prompt"}
          </button>
        </div>
        <PlaygroundControls onChange={handleChange} schema={entry.schema} values={values} />
      </section>

      <section className="mt-16 grid gap-8 border-t border-zinc-200 pt-12 lg:grid-cols-2 dark:border-zinc-800">
        <div>
          <h2 className="font-serif text-3xl tracking-[-0.03em]">Instalar</h2>
          <div className="mt-6">
            <CodeBlock code={install} label="Copiar" />
          </div>
        </div>
        <div>
          <h2 className="font-serif text-3xl tracking-[-0.03em]">Uso</h2>
          <div className="mt-6">
            <CodeBlock code={usage} label="Copiar" />
          </div>
        </div>
      </section>

      <section className="mt-16 border-t border-zinc-200 pt-12 dark:border-zinc-800">
        <h2 className="font-serif text-3xl tracking-[-0.03em]">Propiedades</h2>
        <div className="mt-6">
          <PropsTable schema={entry.schema} />
        </div>
      </section>
    </div>
  );
};

/**
 * Resuelve el slug contra el registro generado.
 *
 * @param props - Slug de la ruta.
 * @returns La página del componente, o null si no está en el índice.
 */
export const ComponentShowcase = ({ slug }: ComponentShowcaseProps) => {
  const entry = components.find((component) => component.slug === slug);

  if (!entry) return null;

  return <ShowcaseBody entry={entry} />;
};
