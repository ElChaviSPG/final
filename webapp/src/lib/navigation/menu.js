export const MODULE_MENU_ITEMS = [
  { name: 'Dashboard', path: '/', icon: 'fa-dashboard' },
  { name: 'Sistema Académico', path: '/sistema-academico', icon: 'fa-graduation-cap' },
  { name: 'Control de Notas', path: '/control-de-notas', icon: 'fa-file-text-o' },
  { name: 'Laboratorios', path: '/laboratorios', icon: 'fa-flask' },
  { name: 'Biblioteca', path: '/biblioteca', icon: 'fa-book' },
  { name: 'Parqueo', path: '/parqueo', icon: 'fa-car' },
  { name: 'Pagos Alumnos', path: '/pagos-alumnos', icon: 'fa-money' },
  { name: 'Servicios Móviles e Integrador', path: '/servicios-moviles-integrador', icon: 'fa-mobile' },
  { name: 'Administración', path: '/administracion', icon: 'fa-cogs' },
  { name: 'Otras actividades', path: '/otras-actividades', icon: 'fa-star' },
]

/** Ruta activa: coincide exacta o subruta (excepto inicio). */
export function isNavActive(itemPath, pathname) {
  if (!pathname) return false
  if (itemPath === '/') return pathname === '/'
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`)
}
