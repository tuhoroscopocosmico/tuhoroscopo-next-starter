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
  email?: string
}

export default function PlanesPage() {
  const [reg, setReg] = useState<Registro | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('registro')
      if (raw) setReg(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  if (!reg) {
    return (
      <div className="container-narrow py-16 text-center">
        <p className="text-white/80">No encontramos tus datos. Volvé al inicio 🚀</p>
        <Link href="/registro" className="btn-cta inline-block mt-6">Ir al registro</Link>
      </div>
    )
  }

  const maskedWa = reg.whatsapp.replace(/^(\+\d{3})\d+(...)$/, '$1 *** $2')

  async function handleActivate() {
    if (!reg) return
    setLoading(true)
    try {
      // 👇 1) Pago único del primer mes
      const res = await fetch('/api/crear-pago-inicial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_suscriptor: reg.id_suscriptor,          // <- MUY IMPORTANTE (external_reference)
          nombre: reg.nombre,
          whatsapp: reg.whatsapp,
          signo: reg.signo,
          contenido_preferido: reg.contenido_preferido,
          // opcional: email explícito; si no, tu EF usa MP_TEST_PLAYER_EMAIL en sandbox o fallback
          email: reg.email
        })
      })

      const data = await res.json().catch(() => ({}))

      if (res.ok && data?.init_point) {
        // 👇 2) Redirige a Checkout Pro
        window.location.href = data.init_point
      } else {
        console.error('Respuesta inesperada:', data)
        alert(data?.error || 'No se pudo iniciar el pago.')
      }
    } catch (err) {
      console.error('Error creando pago inicial:', err)
      alert('Ocurrió un error al iniciar el pago.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-narrow py-12">
      <div className="mx-auto max-w-2xl bg-cosmic-surface rounded-2xl border border-white/10 p-6 md:p-8">
        <p className="text-center text-white/80 mb-2">
          ¡Hola, <span className="font-semibold text-white">{reg.nombre}</span>!
        </p>
        <div className="text-center text-sm text-white/60 mb-6">
          Estás a un paso de recibir tu contenido premium en{' '}
          <span className="font-mono text-white/80">{maskedWa}</span>.
        </div>

        <div className="rounded-xl bg-black/20 border border-white/10 p-6 text-center">
          <span className="inline-block text-xs uppercase tracking-widest text-amber-300/90 mb-2">
            Flexibilidad total
          </span>
          <h2 className="text-white text-xl font-bold mb-1">Suscripción premium mensual</h2>
          <div className="text-3xl font-extrabold text-white my-2">
            $U 390<span className="text-base font-semibold">/mes</span>
          </div>
          <ul className="text-white/80 text-sm space-y-1 mb-6">
            <li>Pagás el primer mes ahora.</li>
            <li>Queda la renovación automática (cancelás cuando quieras).</li>
            <li>Recibí tu primer mensaje en minutos.</li>
          </ul>

          <button onClick={handleActivate} className="btn-cta w-full" disabled={loading}>
            {loading ? 'Redirigiendo…' : 'Activá tu cuenta ahora'}
          </button>

          <p className="text-white/50 text-xs mt-3">
            Serás redirigido a Mercado Pago para pagar el primer mes de forma segura.
          </p>
        </div>

        <div className="mt-6 text-center text-xs text-white/50">
          Signo: <span className="text-white/70">{reg.signo}</span> · Preferencia:{' '}
          <span className="text-white/70">{reg.contenido_preferido}</span>
        </div>

        <div className="mt-6 text-center">
          <Link href="/registro?from=planes" className="text-white/75 underline hover:text-white">
            Editar mis datos
          </Link>
        </div>
      </div>
    </div>
  )
}
