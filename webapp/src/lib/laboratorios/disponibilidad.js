function formatHora(date) {
  return new Date(date).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })
}

function formatFechaCorta(date) {
  return new Date(date).toLocaleString('es-GT', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Calcula chip de disponibilidad para tarjetas de laboratorio. */
export function getDisponibilidadLab(lab) {
  if (lab.estado === 'MANTENIMIENTO') {
    return { status: 'mantenimiento', label: 'En mantenimiento', icon: 'fa-wrench' }
  }
  if (lab.estado === 'INACTIVO') {
    return { status: 'inactivo', label: 'Inactivo', icon: 'fa-ban' }
  }

  const now = Date.now()
  const reservas = (lab.reservas || []).filter((r) => r.estado === 'APROBADA')

  const actual = reservas.find((r) => {
    const ini = new Date(r.fechaInicio).getTime()
    const fin = new Date(r.fechaFin).getTime()
    return ini <= now && fin >= now
  })

  if (actual) {
    return {
      status: 'ocupado',
      label: `Ocupado hasta ${formatHora(actual.fechaFin)}`,
      icon: 'fa-clock-o',
    }
  }

  const proxima = reservas.find((r) => new Date(r.fechaInicio).getTime() > now)
  if (proxima) {
    return {
      status: 'proxima',
      label: `Libre · Próxima: ${formatFechaCorta(proxima.fechaInicio)}`,
      icon: 'fa-calendar',
    }
  }

  return { status: 'disponible', label: 'Disponible ahora', icon: 'fa-check-circle' }
}
