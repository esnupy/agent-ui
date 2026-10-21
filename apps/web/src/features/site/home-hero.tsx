"use client";

import Link from "next/link";
import { useState } from "react";
import { brand } from "@/config";
import { ComponentCarousel } from "./component-carousel";

/**
 * Presentación del inicio: el texto, la acción y el carrusel de demos.
 *
 * El comando de instalación sigue al componente que está en pantalla.
 *
 * @returns La sección principal.
 */
export const HomeHero = () => {
  const [index, setIndex] = useState(0);

  return (
    <section className="mx-auto grid max-w-6xl items-end gap-14 px-6 pb-16 pt-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.9fr)] lg:gap-16 lg:pt-24">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
          Código abierto · MIT
        </p>
        <h1 className="mt-6 max-w-xl font-serif text-5xl leading-[0.96] tracking-[-0.03em] md:text-7xl">
          Componentes para la interfaz <em className="italic">de un agente.</em>
        </h1>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          {brand.name} es una biblioteca React para productos de IA y agentes de código. Gratis,
          original, y lista para claro y oscuro.
        </p>
        <div className="mt-8">
          <Link
            className="inline-flex h-11 items-center bg-zinc-950 px-4 text-sm text-white transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-3 focus-visible:outline-zinc-950 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 dark:focus-visible:outline-zinc-50"
            href="/components"
          >
            Ver componentes
          </Link>
        </div>
      </div>
      <ComponentCarousel index={index} onIndexChange={setIndex} />
    </section>
  );
};
