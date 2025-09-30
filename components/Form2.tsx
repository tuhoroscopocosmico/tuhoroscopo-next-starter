'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const signos = ['Aries','Tauro','Géminis','Cáncer','Leo','Virgo','Libra','Escorpio','Sagitario','Capricornio','Acuario','Piscis']
const preferencias = [
  { value: 'general', label: 'General (un poco de todo)' },
  { value: 'amor', label: 'Amor & vínculos' },
  { value: 'dinero', label: 'Dinero & carrera' },
  { value: 'bienestar', label: 'Bienestar & energía' },
  { value: 'espiritual', label: 'Energía espiritual' },
]

export default function Formulario() {
  const r = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [acepta, setAcepta] = useState(false)
  const [form, setForm] = useState({ nombre: '', signo: '', preferencia: 'general', whatsapp: '' })

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!acepta) return setError('Debés aceptar la política de privacidad.')
    if (!form.nombre || !form.signo || !form.whatsapp) return setError('Completá todos los campos.')

    setLoading(true)

    // normalizar UY (+598) sin 0 inicial
    const tel = form.whatsapp.replace(/[^\d]/g, '').replace(/^0/, '')
    const payload = {
      nombre: form.nombre.trim(),
      signo: form.signo,
      contenido_preferido: form.preferencia,
      telefono: tel,
      whatsapp: `+598${tel}`,
      pais: 'UY',
      version_politica: 'v1.0',
      fuente: 'web-vercel',
    }

    // guardar para /planes
    sessionStorage.setItem('registro', JSON.stringify({ nombre: payload.nombre, whatsapp: payload.whatsapp }))

    // disparo en segundo plano (proxy interno)
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
    if ('sendBeacon' in navigator) {
      navigator.sendBeacon('/api/alta-suscriptor', blob)
    } else {
      fetch('/api/alta-suscriptor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {})
    }

    // redirigir ya
    r.push('/planes')
    setLoading(false)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label">Nombre</label>
        <input className="input" placeholder="Tu nombre" value={form.nombre}
          onChange={e => setForm({ ...form, nombre: e.target.value })} />
      </div>

      <div>
        <label className="label">Tu signo</label>
        <select className="input" value={form.signo}
          onChange={e => setForm({ ...form, signo: e.target.value })}>
          <option value="">Seleccioná tu signo</option>
          {signos.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label className="label">Contenido preferido</label>
        <select className="input" value={form.preferencia}
          onChange={e => setForm({ ...form, preferencia: e.target.value })}>
          {preferencias.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      <div>
        <label className="label">Número de WhatsApp</label>
        <div className="flex items-center bg-violet-900/60 rounded-lg overflow-hidden">
          <span className="pl-3 pr-2 text-lg">🇺🇾</span>
          <input
            className="flex-1 bg-transparent outline-none px-3 py-2 text-white placeholder-white/40"
            placeholder="+59899123456"
            value={form.whatsapp}
            onChange={e => setForm({ ...form, whatsapp: e.target.value })}
          />
        </div>
        <p className="text-xs text-white/50 mt-1">Usaremos tu número para enviarte los mensajes diarios. Sin spam.</p>
      </div>

      <div className="flex items-center gap-2">
        <input id="acepta" type="checkbox" checked={acepta} onChange={() => setAcepta(!acepta)} />
        <label htmlFor="acepta" className="text-sm text-white/80">
          Acepto la <a className="underline" href="/politica" target="_blank" rel="noreferrer">Política de Privacidad</a>.
        </label>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button className="btn" disabled={loading}>
        {loading ? 'Enviando...' : 'Continuar y elegir mi plan'}
      </button>
    </form>
  )
}
