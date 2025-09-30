'use client'
import { useEffect, useState } from 'react'
import PlanCard from '@/components/PlanCards2'

export default function PlanesClient() {
  const [mensaje, setMensaje] = useState<string | null>(null)

  useEffect(() => {
    function checkRegistro() {
      try {
        const raw = sessionStorage.getItem('registro')
        if (raw) {
          const registro = JSON.parse(raw)
          if (registro.resultado === 'duplicado') {
            setMensaje(registro.mensaje || 'Ya tenés una suscripción activa.')
          }
        }
      } catch (err) {
        console.error('Error leyendo sessionStorage:', err)
      }
    }

    // Primera ejecución
    checkRegistro()

    // 🔄 Revisar periódicamente mientras el usuario esté en /planes
    const interval = setInterval(checkRegistro, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="px-4 py-12 relative">
      {/* Tu card de planes */}
      <PlanCard />

      {/* Popup flotante si hay mensaje */}
      {mensaje && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
          <div className="bg-gradient-to-b from-violet-900/95 to-indigo-800/95 rounded-3xl shadow-2xl p-8 max-w-sm w-[90%] text-center transform transition-all duration-300 scale-95 animate-fade-in">
            
            {/* Ícono */}
            <div className="flex justify-center mb-4">
              <span className="text-5xl">🔔</span>
            </div>

            {/* Título */}
            <h2 className="text-2xl font-bold text-white mb-3">Aviso importante</h2>

            {/* Mensaje dinámico */}
            <p className="mb-6 text-white/90 leading-relaxed">
              {mensaje}
            </p>

            {/* Botón CTA */}
            <button
              onClick={() => {
                setMensaje(null)
                window.location.href = "/registro?from=planes" // 👈 redirigir a la página de edición
              }}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-pink-400 px-6 py-3 font-semibold text-violet-900 shadow-lg hover:from-amber-300 hover:to-pink-300 transition"
            >
              Editar mis datos
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
