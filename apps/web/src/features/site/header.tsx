import Link from "next/link";
import { brand } from "@/config";
import { NavLink } from "./nav-link";
import { ThemeToggle } from "./theme-toggle";

/**
 * Barra superior con la marca, el índice y el tema.
 *
 * @returns El header del sitio.
 */
export const Header = () => {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-[#f3f3f0]/85 backdrop-blur-md dark:border-zinc-800/80 dark:bg-[#090909]/85">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link
          className="font-serif text-lg tracking-[-0.03em] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-zinc-950 dark:focus-visible:outline-zinc-50"
          href="/"
        >
          {brand.name}
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-6">
          <NavLink href="/components">Componentes</NavLink>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
};
