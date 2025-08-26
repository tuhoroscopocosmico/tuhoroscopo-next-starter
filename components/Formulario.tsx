import { useState } from 'react';
import { useRouter } from 'next/router';

const signos = [
  'Aries','Tauro','Géminis','Cáncer','Leo','Virgo','Libra','Escorpio','Sagitario','Capricornio','Acuario','Piscis'
];

const preferencias = [
  { value: 'general', label: 'General (un poco de todo)' },
  { value: 'amor', label: 'Amor & vínculos' },
  { value: 'dinero', label: 'Dinero & carrera' },
  { value: 'bienestar', label: 'Bienestar & energía' },
  { value: 'espiritual', label: 'Energía espiritual' },
];

export default function Formulario() {
  const r = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acepta, setAcepta] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    signo: '',
    preferencia: 'general',
    whatsapp: '',
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!acepta) { setError('Debés aceptar la política de privacidad.'); return; }
    if (!form.nombre || !form.signo || !form.whatsapp) { setError('Completá todos los campos.'); return; }
    try {
      setLoading(true);
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          pais: 'UY',
          version_politica: 'v1.0',
          fuente: 'web-vercel'
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'No se pudo enviar el formulario');
      }
      r.push('/gracias');
    } catch (err: any) {
      setError(err.message || 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

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
        <p className="text-xs text-white/50 mt-1">
          Usaremos tu número para enviarte los mensajes diarios. Sin spam.
        </p>
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
  );
}
