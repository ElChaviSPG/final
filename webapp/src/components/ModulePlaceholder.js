import Link from "next/link";

export default function ModulePlaceholder({ title }) {
  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col px-6 py-16">
      <Link
        href="/"
        className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        ← Inicio
      </Link>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {title}
      </h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        Módulo en desarrollo por el grupo asignado.
      </p>
    </div>
  );
}
