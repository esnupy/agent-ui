"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavLinkProps = {
  href: string;
  children: ReactNode;
};

/**
 * Enlace de navegación que marca la página actual.
 *
 * @param props - Destino y contenido.
 * @returns El enlace.
 */
export const NavLink = ({ href, children }: NavLinkProps) => {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className="text-sm text-zinc-600 underline-offset-4 hover:text-zinc-950 hover:underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-zinc-950 aria-[current=page]:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 dark:focus-visible:outline-zinc-50 dark:aria-[current=page]:text-zinc-50"
      href={href}
    >
      {children}
    </Link>
  );
};
