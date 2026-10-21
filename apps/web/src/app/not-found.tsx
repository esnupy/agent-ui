import Link from "next/link";

const NotFound = () => {
  return (
    <div className="mx-auto max-w-6xl px-6 py-24">
      <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">404</p>
      <h1 className="mt-4 font-serif text-5xl tracking-[-0.03em]">No encontramos esa página.</h1>
      <Link
        className="mt-8 inline-flex text-sm underline decoration-zinc-300 underline-offset-4 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-zinc-950 dark:decoration-zinc-700 dark:focus-visible:outline-zinc-50"
        href="/components"
      >
        Volver a componentes
      </Link>
    </div>
  );
};

export default NotFound;
