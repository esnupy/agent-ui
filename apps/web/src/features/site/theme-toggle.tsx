"use client";

import { useEffect, useState } from "react";

/**
 * Alterna data-theme en el documento y lo recuerda en localStorage.
 *
 * @returns El botón de tema.
 */
export const ThemeToggle = () => {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "dark" : "light");
    setReady(true);
  }, []);

  const handleToggle = () => {
    const current =
      document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    setTheme(next);
  };

  const label = !ready ? "Cambiar tema" : theme === "dark" ? "Cambiar a claro" : "Cambiar a oscuro";

  return (
    <button
      aria-label={label}
      className="inline-flex size-8 items-center justify-center text-zinc-700 transition-colors hover:text-zinc-950 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50 dark:focus-visible:outline-zinc-50"
      onClick={handleToggle}
      type="button"
    >
      <span className="dark:hidden">
        <MoonIcon />
      </span>
      <span className="hidden dark:inline-flex">
        <SunIcon />
      </span>
    </button>
  );
};

/**
 * Luna: la acción es pasar a oscuro.
 *
 * @returns El ícono.
 */
const MoonIcon = () => {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 16 16">
      <path
        d="M9.1 1.9a5.35 5.35 0 1 0 4.9 8.1A4.55 4.55 0 0 1 9.1 1.9Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.35"
      />
    </svg>
  );
};

/**
 * Sol: la acción es pasar a claro.
 *
 * @returns El ícono.
 */
const SunIcon = () => {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 16 16">
      <circle cx="8" cy="8" fill="none" r="2.35" stroke="currentColor" strokeWidth="1.35" />
      <path
        d="M8 1.7v1.7M8 12.6v1.7M1.7 8h1.7M12.6 8h1.7M3.35 3.35l1.2 1.2M11.45 11.45l1.2 1.2M12.65 3.35l-1.2 1.2M4.55 11.45l-1.2 1.2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.35"
      />
    </svg>
  );
};
