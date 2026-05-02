import Link from "next/link";

const modules = [
  {
    href: "/sistema-academico",
    title: "Sistema académico",
    description: "Asignaciones, cursos, estudiantes, docentes, horarios y asistencia.",
  },
  {
    href: "/control-de-notas",
    title: "Control de notas",
    description: "Redes de curso por carrera, zonas, evaluaciones, cierres y graduaciones.",
  },
  {
    href: "/laboratorios",
    title: "Laboratorios",
    description: "Gestión de laboratorios.",
  },
  {
    href: "/biblioteca",
    title: "Biblioteca",
    description: "Material disponible, préstamos y estudiantes.",
  },
  {
    href: "/parqueo",
    title: "Parqueo",
    description: "Tarifas, ingresos y capacidades.",
  },
  {
    href: "/pagos-alumnos",
    title: "Pagos alumnos",
    description: "Inscripción, mensualidades, otros pagos y solvencias.",
  },
  {
    href: "/servicios-moviles-integrador",
    title: "Servicios móviles e integrador",
    description: "Servicios móviles e integración entre sistemas.",
  },
  {
    href: "/administracion",
    title: "Administración",
    description: "Planta física, aulas, auditorio, mantenimiento y logística.",
  },
  {
    href: "/otras-actividades",
    title: "Otras actividades",
    description: "Actividades extracurriculares, seminarios y deportes.",
  },
];

export default function Home() {
  return (
    <div className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white/80 px-6 py-10 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Universidad San Pablo de Guatemala · Ingeniería en Sistemas
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            Plataforma modular — proyecto integrador
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            Elige un módulo para continuar el desarrollo asignado a cada grupo.
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <li key={m.href}>
              <Link
                href={m.href}
                className="group flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
              >
                <span className="text-base font-semibold text-zinc-900 group-hover:text-zinc-950 dark:text-zinc-50 dark:group-hover:text-white">
                  {m.title}
                </span>
                <span className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {m.description}
                </span>
                <span className="mt-4 text-sm font-medium text-zinc-900 underline-offset-4 group-hover:underline dark:text-zinc-100">
                  Abrir módulo
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
