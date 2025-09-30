'use client'
import { useEffect, useState } from 'react'
import PlanCard from '@/components/PlanCards2'

export default function PlanesClient() {
  const [mensaje, setMensaje] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('registro')
      if (raw) {
        const registro = JSON.parse(raw)

        // 👇 Solo si viene del return 409 duplicado mostramos popup
        if (registro.resultado === 'duplicado') {
          setMensaje(registro.mensaje || 'Ya tenés una suscripción activa.')
        }
      }
    } catch (err) {
      console.error('Error leyendo sessionStorage:', err)
    }
  }, [])

  return (
    <div className="px-4 py-12 relative">
      <PlanCard />

      {/* Popup flotante si hay mensaje */}
      {mensaje && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white text-gray-800 rounded-2xl shadow-xl p-6 max-w-sm text-center">
            <h2 className="text-lg font-semibold mb-3">Atención</h2>
            <p className="mb-4">{mensaje}</p>
            <button
              onClick={() => {
                setMensaje(null)
                window.location.href = "/registro?from=planes" // 👉 redirigir a modificar datos
              }}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-pink-400 px-6 py-3 font-semibold text-violet-900 shadow-lg hover:from-amber-300 hover:to-pink-300 transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
