import type { Metadata } from "next";
import { Newsreader, Public_Sans } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";
import { brand } from "@/config";
import { Header } from "@/features/site/header";
import "@/generated/components";
import "./globals.css";

const sans = Public_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans-face",
});

const serif = Newsreader({
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  variable: "--font-serif-face",
});

export const metadata: Metadata = {
  title: {
    default: brand.name,
    template: `%s · ${brand.name}`,
  },
  description: brand.description,
};

const themeBoot = `(function(){try{var key="theme";var stored=localStorage.getItem(key);var dark=window.matchMedia("(prefers-color-scheme: dark)").matches;var next=stored==="light"||stored==="dark"?stored:(dark?"dark":"light");document.documentElement.setAttribute("data-theme",next);}catch(e){}})();`;

const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <html
      className={`${sans.variable} ${serif.variable}`}
      data-theme="light"
      lang="es-MX"
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-[#f3f3f0] font-sans text-zinc-950 antialiased dark:bg-[#090909] dark:text-zinc-50">
        <Script id="theme-boot" strategy="beforeInteractive">
          {themeBoot}
        </Script>
        <a
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-zinc-950 focus:px-3 focus:py-2 focus:text-white dark:focus:bg-zinc-50 dark:focus:text-zinc-950"
          href="#contenido"
        >
          Saltar al contenido
        </a>
        <Header />
        <main id="contenido">{children}</main>
        <footer className="mx-auto flex max-w-6xl items-center justify-between px-6 py-10 text-xs uppercase tracking-[0.16em] text-zinc-500">
          <span>MIT</span>
          <span>Código original</span>
        </footer>
      </body>
    </html>
  );
};

export default RootLayout;
