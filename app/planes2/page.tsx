// app/planes2/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Registro = {
  id_suscriptor?: string
  nombre: string
  signo: string
  contenido_preferido: string
  telefono: string
  whatsapp: string
}

export default function PlanesPage() {
  const [reg, setReg] = useState<Registro | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('registro')
      if (raw) setReg(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  if (!reg) {
    return (
      <div className="max-w-[720px] mx-auto px-4 py-16 text-center">
        <p className="text-white/80">No encontramos tus datos. Volvé al inicio 🚀</p>
        <Link href="/registro" className="inline-block mt-6 rounded-xl2 px-5 py-3 font-semibold text-[#1a0935] bg-cta-grad shadow-glow">
          Ir al registro
        </Link>
      </div>
    )
  }

  // +598xxxxxxxx  ->  +598 *** 123
  const maskedWa = reg.whatsapp.replace(/^(\+\d{3})\d+(\d{3})$/, '$1 *** $2')

  function handleActivate() {
    // Reemplazá por tu preferencia/link real de MP
    window.location.href = 'https://mpago.la/tu-link-de-preferencia'
  }

  return (
    <div className="px-4 py-12">
      <div className="mx-auto max-w-3xl">
        {/* Banner superior con saludo */}
        <div className="mx-auto max-w-2xl mb-6 rounded-full bg-cosmic-surface/75 border border-white/10 text-center px-5 py-3">
          <p className="text-white/80">
            ¡Hola, <span className="font-semibold text-white">{reg.nombre}</span>! Estás a un paso de recibir tu contenido premium en{' '}
            <span className="font-mono text-white/90">{maskedWa}</span>
          </p>
        </div>

        {/* Tarjeta principal */}
        <div className="rounded-xl2 bg-cosmic-surface/70 border border-white/10 p-6 md:p-8 shadow-glow backdrop-blur-sm">
          <div className="mx-auto max-w-xl text-center">
            <span className="inline-block text-[11px] tracking-widest uppercase text-cosmic-gold/90 bg-black/20 border border-white/10 rounded-full px-3 py-1 mb-3">
              Flexibilidad total
            </span>

            <h1 className="text-white text-2xl md:text-3xl font-extrabold">
              Suscripción premium mensual
            </h1>

            <div className="my-4">
              <span className="text-4xl md:text-5xl font-extrabold text-white">$U 390</span>
              <span className="text-white/80 font-semibold ml-1">/mes</span>
            </div>

            <ul className="text-white/80 text-sm space-y-1 mb-6">
              <li>Pagás mes a mes, sin ataduras.</li>
              <li>Renovación automática. Cancelás cuando quieras.</li>
              <li>Recibí tu primer mensaje en minutos.</li>
            </ul>

            <button
              onClick={handleActivate}
              className="w-full rounded-xl2 px-5 py-3 font-bold text-[#1a0935] bg-cta-grad shadow-glow hover:opacity-[.98] transition"
            >
              Activá tu cuenta ahora
            </button>

            <p className="text-white/55 text-xs mt-3">
              Serás redirigido a Mercado Pago para finalizar el pago de forma segura.
            </p>
          </div>

          {/* Meta info */}
          <div className="mt-6 text-center text-xs text-white/55">
            Signo: <span className="text-white/75">{reg.signo || '—'}</span> · Preferencia:{' '}
            <span className="text-white/75">{reg.contenido_preferido || '—'}</span>
          </div>

          <div className="mt-4 text-center">
            <Link href="/registro" className="text-white/70 underline hover:text-white">
              Editar mis datos
            </Link>
          </div>

          <div className="mt-6 text-center text-[11px] text-white/50">
            Tus datos están protegidos. Podés cancelar online en cualquier momento.
          </div>
        </div>
      </div>
    </div>
  )
}
