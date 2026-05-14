'use client'

import { useState } from 'react'
import NuevoLaboratorioModal from './components/NuevoLaboratorioModal'

export default function LaboratoriosClient({ laboratorios }) {
  const [showModal, setShowModal] = useState(false)

  // Función para determinar el icono basado en el nombre
  const getIcon = (nombre) => {
    const lowerName = nombre.toLowerCase()
    if (lowerName.includes('computación') || lowerName.includes('computacion')) return 'fa-desktop'
    if (lowerName.includes('química') || lowerName.includes('quimica')) return 'fa-flask'
    if (lowerName.includes('física') || lowerName.includes('fisica')) return 'fa-magnet'
    if (lowerName.includes('plc') || lowerName.includes('cnc')) return 'fa-cogs'
    return 'fa-building'
  }

  // Color de estado
  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'ACTIVO': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'INACTIVO': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'MANTENIMIENTO': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Administración de Laboratorios</h2>
          <p className="text-gray-400 text-sm mt-1">Gestión de espacios, configuraciones y estado operativo.</p>
        </div>
        
        <button 
          onClick={() => setShowModal(true)}
          className="bg-[#800020] hover:bg-[#9a0026] text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-[#800020]/20 flex items-center gap-2"
        >
          <i className="fa fa-plus"></i>
          Nuevo Laboratorio
        </button>
      </div>

      {/* Grid */}
      {laboratorios.length === 0 ? (
        <div className="dashboard-card p-12 text-center rounded-xl border border-gray-800 bg-[#1a1a2e]">
          <div className="w-16 h-16 mx-auto bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <i className="fa fa-flask text-2xl text-gray-400"></i>
          </div>
          <h3 className="text-xl text-white font-medium mb-2">No hay laboratorios registrados</h3>
          <p className="text-gray-400 max-w-md mx-auto mb-6">Aún no se ha creado ningún laboratorio en el sistema. Puedes agregar el primero haciendo clic en el botón superior.</p>
          <button 
            onClick={() => setShowModal(true)}
            className="text-[#800020] hover:text-white transition-colors font-medium"
          >
            Crear ahora <i className="fa fa-arrow-right ml-1"></i>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {laboratorios.map((lab) => (
            <div key={lab.id} className="dashboard-card bg-[#1a1a2e] border border-gray-800 rounded-xl p-6 hover:-translate-y-1 transition-transform duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-lg bg-[#800020]/10 flex items-center justify-center text-[#800020] border border-[#800020]/20">
                  <i className={`fa ${getIcon(lab.nombre)} text-xl`}></i>
                </div>
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getEstadoBadge(lab.estado)}`}>
                  {lab.estado}
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">{lab.nombre}</h3>
              <p className="text-gray-400 text-sm mb-5 line-clamp-2 min-h-[40px]">
                {lab.descripcion || 'Sin descripción detallada.'}
              </p>
              
              <div className="grid grid-cols-2 gap-4 border-t border-gray-800 pt-4">
                <div>
                  <span className="block text-xs uppercase tracking-wider text-gray-500 mb-1">Capacidad</span>
                  <span className="text-white font-medium flex items-center gap-1.5">
                    <i className="fa fa-users text-gray-400 text-xs"></i>
                    {lab.capacidadTotal}
                  </span>
                </div>
                <div>
                  <span className="block text-xs uppercase tracking-wider text-gray-500 mb-1">División</span>
                  <span className="text-white font-medium flex items-center gap-1.5">
                    <i className={`fa ${lab.permiteDivision ? 'fa-check text-green-500' : 'fa-times text-red-500'} text-xs`}></i>
                    {lab.permiteDivision ? 'Flexible' : 'No'}
                  </span>
                </div>
              </div>
              
              <div className="mt-5 flex gap-2">
                <button className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                  <i className="fa fa-cog mr-1"></i> Gestionar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <NuevoLaboratorioModal onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
