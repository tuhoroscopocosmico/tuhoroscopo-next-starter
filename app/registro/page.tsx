'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function RegistroPage() {
  const router = useRouter()

  // Estado unificado para el formulario
  const [formData, setFormData] = useState({
    nombre: '',
    signo: '',
    contenido: 'general',
    codPais: '+598',
    whatsapp: ''
  })

  const signos = [
    'Aries','Tauro','Géminis','Cáncer','Leo','Virgo',
    'Libra','Escorpio','Sagitario','Capricornio','Acuario','Piscis'
  ]

  // 🔹 Maneja cambios en cualquier input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target

    // validación: solo números en whatsapp
    if (name === "whatsapp") {
      const soloNumeros = value.replace(/\D/g, "")
      setFormData(prev => ({ ...prev, whatsapp: soloNumeros }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  // 🔹 Submit
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      nombre: formData.nombre,
      signo: formData.signo,
      contenido: formData.contenido,
      whatsapp: `${formData.codPais}${formData.whatsapp.replace(/^0/, '')}`
    }

    // Guarda datos en sessionStorage (más seguro que query string)
    sessionStorage.setItem("registro", JSON.stringify(payload))

    // Redirige a la página de planes
    router.push("/planes")
  }

  return (
    <div className="container-narrow pb-16">
      <form
        onSubmit={onSubmit}
        className="mx-auto max-w-xl bg-cosmic-surface px-6 py-8 rounded-2xl border border-white/10"
      >
        <h1 className="h1">🚀 Activá tu experiencia Premium</h1>

        {/* Nombre */}
        <label className="block mt-6 text-white/90 text-sm font-semibold" htmlFor="nombre">
          Nombre
        </label>
        <input
          id="nombre"
          name="nombre"
          className="mt-2 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-white outline-none"
          placeholder="Tu nombre"
          value={formData.nombre}
          onChange={handleChange}
          required
          autoComplete="off"
        />

        {/* Signo */}
        <label className="block mt-6 text-white/90 text-sm font-semibold" htmlFor="signo">
          Tu signo
        </label>
        <select
          id="signo"
          name="signo"
          className="mt-2 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-white"
          value={formData.signo}
          onChange={handleChange}
          required
        >
          <option value="" disabled>Seleccioná tu signo</option>
          {signos.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Contenido preferido */}
        <label className="block mt-6 text-white/90 text-sm font-semibold" htmlFor="contenido">
          Contenido preferido
        </label>
        <select
          id="contenido"
          name="contenido"
          className="mt-2 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-white"
          value={formData.contenido}
          onChange={handleChange}
        >
          <option value="general">General (un poco de todo)</option>
          <option value="amor">Amor & vínculos</option>
          <option value="dinero">Dinero & trabajo</option>
          <option value="bienestar">Bienestar & calma</option>
          <option value="espiritual">Energía espiritual</option>
        </select>

        {/* WhatsApp */}
        <label className="block mt-6 text-white/90 text-sm font-semibold" htmlFor="whatsapp">
          Número de WhatsApp
        </label>
        <div className="mt-2 flex gap-2">
          <select
            name="codPais"
            value={formData.codPais}
            onChange={handleChange}
            className="w-28 rounded-xl bg-black/20 border border-white/10 p-3 text-white"
          >
            <option value="+598">🇺🇾 +598</option>
            <option value="+54">🇦🇷 +54</option>
            <option value="+56">🇨🇱 +56</option>
            <option value="+57">🇨🇴 +57</option>
            <option value="+51">🇵🇪 +51</option>
            <option value="+52">🇲🇽 +52</option>
          </select>
          <input
            id="whatsapp"
            name="whatsapp"
            className="flex-1 rounded-xl bg-black/20 border border-white/10 p-3 text-white"
            placeholder="099123456"
            value={formData.whatsapp}
            onChange={handleChange}
            required
            minLength={8}
            maxLength={12}
            autoComplete="off"
          />
        </div>

        {/* Botón */}
        <button className="btn-cta w-full mt-8" type="submit">
          Continuar y elegir mi plan
        </button>

        <p className="text-white/60 text-center text-sm mt-4">
          Tus datos están seguros. Solo se usan para personalizar tu experiencia Premium.
        </p>
      </form>
    </div>
  )
}
