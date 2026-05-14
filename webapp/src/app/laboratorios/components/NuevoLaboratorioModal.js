'use client'

import { useState } from 'react'
import { crearLaboratorio } from '../actions'

export default function NuevoLaboratorioModal({ onClose }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(formData) {
    setLoading(true)
    setError('')
    const result = await crearLaboratorio(formData)
    
    if (result?.success) {
      onClose()
    } else {
      setError(result?.error || 'Ocurrió un error inesperado.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="dashboard-card w-full max-w-lg bg-[#1a1a2e] border border-gray-800 shadow-2xl rounded-xl p-6 relative">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <i className="fa fa-times text-xl"></i>
        </button>

        <h3 className="text-2xl font-semibold mb-6 text-white flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#800020] flex items-center justify-center">
            <i className="fa fa-plus text-sm"></i>
          </div>
          Nuevo Laboratorio
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm">
            {error}
          </div>
        )}

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nombre del Laboratorio</label>
            <input 
              type="text" 
              name="nombre" 
              required 
              placeholder="Ej. Computación"
              className="w-full bg-[#0f0f1a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#800020] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Descripción</label>
            <textarea 
              name="descripcion" 
              rows="3"
              placeholder="Descripción del propósito del laboratorio..."
              className="w-full bg-[#0f0f1a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#800020] transition-colors"
            ></textarea>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Capacidad Total</label>
              <input 
                type="number" 
                name="capacidadTotal" 
                defaultValue="30"
                min="1"
                required
                className="w-full bg-[#0f0f1a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#800020] transition-colors"
              />
            </div>
            
            <div className="flex flex-col justify-end pb-2">
              <label className="flex items-center space-x-3 cursor-pointer group">
                <div className="relative">
                  <input type="checkbox" name="permiteDivision" className="sr-only peer" />
                  <div className="w-10 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#800020]"></div>
                </div>
                <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Permite División</span>
              </label>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-[#800020] hover:bg-[#9a0026] text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-[#800020]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <><i className="fa fa-spinner fa-spin"></i> Guardando...</>
              ) : (
                <><i className="fa fa-save"></i> Guardar</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
