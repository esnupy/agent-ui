import Link from "next/link";
import { components } from "@/generated/components";

const ComponentsPage = () => {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Índice</p>
      <h1 className="mt-4 font-serif text-5xl tracking-[-0.03em] md:text-6xl">Componentes</h1>
      <p className="mt-4 max-w-lg text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
        Cada uno trae demo, playground y un prompt listo para pegarle a un coding agent.
      </p>
      <ul className="mt-12 border-t border-zinc-200 dark:border-zinc-800">
        {components.map((component) => (
          <li key={component.slug} className="border-b border-zinc-200 dark:border-zinc-800">
            <Link
              className="group grid gap-3 py-7 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-zinc-950 md:grid-cols-[16rem_1fr_auto] md:items-baseline dark:focus-visible:outline-zinc-50"
              href={`/components/${component.slug}`}
            >
              <span className="font-serif text-3xl tracking-[-0.03em]">{component.title}</span>
              <span className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {component.description}
              </span>
              <span className="font-mono text-xs text-zinc-500 transition-transform group-hover:translate-x-1">
                {component.packageName}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ComponentsPage;
