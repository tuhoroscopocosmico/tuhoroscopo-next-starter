// components/LeadForms.tsx
'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import ReactCountryFlag from "react-country-flag";

const signos = [
  { value: 'Aries', label: '🐏 Aries' },
  { value: 'Tauro', label: '🐂 Tauro' },
  { value: 'Géminis', label: '👯‍♂️ Géminis' },
  { value: 'Cáncer', label: '🦀 Cáncer' },
  { value: 'Leo', label: '🦁 Leo' },
  { value: 'Virgo', label: '🌸 Virgo' },
  { value: 'Libra', label: '⚖️ Libra' },
  { value: 'Escorpio', label: '🦂 Escorpio' },
  { value: 'Sagitario', label: '🏹 Sagitario' },
  { value: 'Capricornio', label: '🐐 Capricornio' },
  { value: 'Acuario', label: '🌊 Acuario' },
  { value: 'Piscis', label: '🐟 Piscis' },
];

const preferencias = [
  { value: 'general', label: '🌌 General (un poco de todo)' },
  { value: 'amor', label: '💘 Amor' },
  { value: 'trabajo', label: '💼 Dinero y trabajo' },
  { value: 'bienestar', label: '🧘 Bienestar' },
  { value: 'espiritual', label: '🪄 Energía espiritual' },
];

type Initial = { nombre?: string; signo?: string; preferencia?: string; whatsapp?: string; whatsappLocal?: string }
type Props = { initial?: Initial }

export default function LeadForm({ initial }: Props) {
  const router = useRouter()
  const params = useSearchParams()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [nombre, setNombre] = useState('')
  const [signo, setSigno] = useState('')
  const [pref, setPref] = useState(preferencias[0].value)
  const [whatsapp, setWhatsapp] = useState('')
  const [acepta, setAcepta] = useState(false)

  // Prefill si vienen datos iniciales
  useEffect(() => {
    if (initial?.nombre) setNombre(initial.nombre)
    if (initial?.signo) setSigno(initial.signo)
    if (initial?.preferencia) setPref(initial.preferencia)
    if (initial?.whatsappLocal) {
      setWhatsapp(initial.whatsappLocal)
    } else if (initial?.whatsapp) {
      const solo = initial.whatsapp.replace(/[^\d]/g, '')
      setWhatsapp(solo.startsWith('598') ? `0${solo.slice(3)}` : solo)
    }
  }, [initial])

  // Si viene desde /planes → marcar checkbox
  useEffect(() => {
    if (params.get('from') === 'planes') setAcepta(true)
  }, [params])

  function normalizarUY(num: string) {
    const solo = num.replace(/[^\d]/g, '')
    const sin0 = solo.replace(/^0/, '')
    return { telefono: sin0, whatsapp: `+598${sin0}` }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!acepta) { setError('Debés aceptar la Política de Privacidad.'); return }
    if (!nombre || !signo || !whatsapp) { setError('Completá todos los campos.'); return }

    const telSolo = whatsapp.replace(/[^\d]/g, '')
    if (!/^09\d{7}$/.test(telSolo)) {
      setError('El número debe comenzar con 09 y tener 9 dígitos (ej: 099123456).')
      return
    }

    setLoading(true)
    try {
      const { telefono, whatsapp: waE164 } = normalizarUY(whatsapp)

      // 🔑 payload exacto para route.ts
      const payload = {
        nombre: nombre.trim(),
        telefono,
        signo,
        contenido_preferido: pref,
        whatsapp: waE164,
        pais: 'UY',
        fuente: 'web-vercel',
        version_politica: 'v1.0',
        acepto_politicas: acepta // <-- MODIFICACIÓN AÑADIDA
      }

      // 👉 Guardamos algo inicial (con whatsappLocal también)
      sessionStorage.setItem('registro', JSON.stringify({
        nombre: payload.nombre,
        whatsapp: payload.whatsapp,
        whatsappLocal: `0${telefono}`,
        signo: payload.signo,
        contenido_preferido: payload.contenido_preferido,
      }))

      // 🚀 Redirigir enseguida
      router.push('/planes')

      // 🔄 Validación en paralelo
      fetch('/alta-suscriptor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), // <-- Ahora payload incluye acepto_politicas
      })
        .then(async res => {
          const data = await res.json().catch(() => ({}))
          // Actualizamos sessionStorage con la respuesta del backend
          sessionStorage.setItem('registro', JSON.stringify({
            ...payload, // Guardamos todo lo enviado
            whatsappLocal: `0${telefono}`,
            id_suscriptor: data.id_suscriptor || null, // ID devuelto por el backend
            resultado: data.resultado || null,
            mensaje: data.mensaje || null,
          }))
        })
        .catch(err => {
          console.error('Error validando en segundo plano:', err)
          // Opcional: Podrías guardar el error en sessionStorage también
          sessionStorage.setItem('registro', JSON.stringify({
            ...payload,
            whatsappLocal: `0${telefono}`,
            error_backend: err.message || 'Error desconocido'
          }))
        })

    } catch (err) {
      console.error(err)
      setError('Ocurrió un error. Probá de nuevo.')
      setLoading(false) // Asegurarse de quitar loading si hay error aquí
    }
    // No ponemos setLoading(false) aquí porque ya redirigimos
  }

  return (
    <form
      id="form"
      onSubmit={onSubmit}
      className="mx-auto mt-10 w-full max-w-xl rounded-3xl bg-white/10 p-6 md:p-8 shadow-2xl ring-1 ring-white/15 backdrop-blur"
    >
      <h2 className="text-center text-2xl md:text-3xl font-bold mb-8 text-white drop-shadow-sm">
        Empezá tu experiencia premium
      </h2>

      {/* Inputs para nombre, signo, preferencia */}
      <label className="block text-sm text-white/80 mb-1">Nombre</label>
      <input
        className="mb-4 w-full rounded-xl bg-white/8 px-4 py-3 ring-1 ring-white/15 focus:outline-none focus:ring-2 focus:ring-pink-300"
        placeholder="Tu nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        required
      />

      <label className="block text-sm text-white/80 mb-1">Tu signo</label>
      <select
        className="mb-4 w-full rounded-xl bg-white/8 px-4 py-3 ring-1 ring-white/15 focus:outline-none focus:ring-2 focus:ring-pink-300"
        value={signo}
        onChange={(e) => setSigno(e.target.value)}
        required
      >
        <option value="" disabled>✨ Seleccioná tu signo</option>
        {signos.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <label className="block text-sm text-white/80 mb-1">Contenido preferido</label>
      <select
        className="mb-4 w-full rounded-xl bg-white/8 px-4 py-3 ring-1 ring-white/15 focus:outline-none focus:ring-2 focus:ring-pink-300"
        value={pref}
        onChange={(e) => setPref(e.target.value)}
        required
      >
        {preferencias.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>

      {/* Input WhatsApp */}
      <label className="block text-sm text-white/80 mb-1">Número de WhatsApp (celular) </label>
      <div className="flex gap-2 items-center">
        <div className="flex items-center gap-2 rounded-xl bg-white/8 px-3 ring-1 ring-white/15 h-[52px]">
          <ReactCountryFlag
            countryCode="UY"
            svg
            style={{ width: "24px", height: "18px", borderRadius: "2px" }}
            title="Uruguay"
            className="shadow-sm"
          />
          <span className="text-white/70 font-medium tracking-wide">+598</span>
        </div>
        <input
          className="flex-1 rounded-xl bg-white/8 px-4 py-3 h-[52px] ring-1 ring-white/15 focus:outline-none focus:ring-2 focus:ring-pink-300 placeholder:text-white/40"
          placeholder="099123456"
          inputMode="numeric"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value.replace(/[^\d]/g, ''))}
          required
        />
      </div>

      {/* Checkbox Política de Privacidad */}
      <label className="mt-4 flex items-start gap-2 text-sm text-white/80">
        <input
          type="checkbox"
          checked={acepta}
          onChange={() => setAcepta(a => !a)}
          required
          className="mt-1"
        />
        <span>
          Acepto la{' '}
          <a className="underline hover:text-pink-300" href="/politica-de-privacidad" target="_blank" rel="noreferrer">
            Política de Privacidad
          </a>.
        </span>
      </label>

      {/* Mensaje de Error */}
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

      {/* Botón Submit */}
      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-2xl bg-gradient-to-r from-amber-400 to-pink-400 px-6 py-3 font-semibold text-violet-900 shadow-lg hover:from-amber-300 hover:to-pink-300 disabled:opacity-60"
      >
        {loading ? 'Enviando...' : 'Continuar y elegir mi plan'}
      </button>
    </form>
  )
}