"use client";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const signos = [
  "Aries","Tauro","Géminis","Cáncer","Leo","Virgo",
  "Libra","Escorpio","Sagitario","Capricornio","Acuario","Piscis",
];

const preferencias = [
  { value: "general", label: "General (un poco de todo)" },
  { value: "amor", label: "Amor" },
  { value: "trabajo", label: "Trabajo" },
  { value: "bienestar", label: "Bienestar" },
];

export default function LeadForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [nombre, setNombre] = useState("");
  const [signo, setSigno] = useState("");
  const [pref, setPref] = useState(preferencias[0].value);
  const [whatsapp, setWhatsapp] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          signo,
          preferencia: pref,
          whatsapp,
        }),
      });

      // No rompamos el flujo actual:
      router.push(
        `/periodo-suscripcion?nombre=${encodeURIComponent(
          nombre
        )}&signo=${encodeURIComponent(signo)}&whatsapp=${encodeURIComponent(
          whatsapp
        )}`
      );
    } catch (err) {
      console.error(err);
      alert("Ocurrió un error. Por favor, probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form id="form" onSubmit={onSubmit}
      className="mx-auto mt-10 w-full max-w-xl rounded-3xl bg-white/10 p-6 md:p-8 shadow-2xl ring-1 ring-white/15 backdrop-blur">
      <h2 className="text-center text-xl font-semibold mb-6">Empezá tu experiencia premium</h2>

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
        <option value="" disabled>Seleccioná tu signo</option>
        {signos.map((s) => <option key={s} value={s}>{s}</option>)}
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

      <label className="block text-sm text-white/80 mb-1">Número de WhatsApp</label>
      <div className="flex gap-2">
        <span className="inline-flex items-center rounded-xl bg-white/8 px-3 ring-1 ring-white/15">+598</span>
        <input
          className="flex-1 rounded-xl bg-white/8 px-4 py-3 ring-1 ring-white/15 focus:outline-none focus:ring-2 focus:ring-pink-300"
          placeholder="099123456"
          inputMode="numeric"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          required
        />
      </div>

      <label className="mt-4 flex items-start gap-2 text-sm text-white/80">
        <input type="checkbox" required className="mt-1" />
        <span>Acepto la <a className="underline hover:text-pink-300" href="/politica">Política de Privacidad</a>.</span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-2xl bg-gradient-to-r from-amber-400 to-pink-400 px-6 py-3 font-semibold text-violet-900 shadow-lg hover:from-amber-300 hover:to-pink-300 disabled:opacity-60"
      >
        {loading ? "Enviando..." : "Continuar y elegir mi plan"}
      </button>

    </form>
  );
}
