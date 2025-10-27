// ============================================================
// === Archivo: app/checkout/CheckoutContent.tsx
// === Descripción: Componente CLIENTE para el checkout.
// === (ACTUALIZADO: Guarda Nombre y Signo en sessionStorage)
// ============================================================

"use client";

import { useState } from "react";
// ...otras importaciones...

// --- Componente Principal del Checkout ---
export default function CheckoutContent() {
  
  // --- Estados del Componente ---
  const [nombre, setNombre] = useState("");
  const [signo, setSigno] = useState("");
  const [preferencia, setPreferencia] = useState("general"); 
  const [whatsapp, setWhatsapp] = useState("");
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [uiStatus, setUiStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- Lógica de Envío (Submit Handler) ---

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); 

    // 1. Validación simple
    if (!nombre || !signo || !whatsapp || !aceptaTerminos) {
      setErrorMsg("Por favor, completa todos los campos requeridos.");
      setUiStatus("error");
      return;
    }

    // 2. Iniciar estado de carga
    setUiStatus("loading");
    setErrorMsg(null);

    // ================================================================
    // <--- ¡AQUÍ GUARDAMOS EN SESSIONSTORAGE! (LA CORRECCIÓN)
    // Guardamos AMBOS datos (Nombre y Signo) antes de cualquier
    // llamada de red.
    // ================================================================
    try {
      sessionStorage.setItem("thc_nombre_suscriptor", nombre);
      sessionStorage.setItem("thc_signo_suscriptor", signo); // <-- AÑADIDO
    } catch (e) {
      console.warn("No se pudo guardar en sessionStorage", e);
    }
    // ================================================================

    // 4. Lógica de "Doble Paso" (Crear usuario y luego Pagar)
    try {
      // PASO A: Crear el suscriptor en tu backend (Supabase)
      const altaResponse = await fetch("/api/alta-suscriptor", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          signo,
          preferencia,
          whatsapp,
        }),
      });

      const altaData = await altaResponse.json();

      if (!altaResponse.ok || !altaData.id_suscriptor) {
        throw new Error(
          altaData.error || "No se pudo registrar al suscriptor."
        );
      }

      // PASO B: Crear la Preferencia de Pago en Mercado Pago
      const pagoResponse = await fetch("/api/crear-preferencia-mp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_suscriptor: altaData.id_suscriptor,
          nombre_usuario: nombre,
          signo_usuario: signo,
        }),
      });

      const pagoData = await pagoResponse.json();

      if (!pagoResponse.ok || !pagoData.init_point) {
        throw new Error(
          pagoData.error || "No se pudo inicializar el pago con Mercado Pago."
        );
      }

      // PASO C: Redirección Exitosa a Mercado Pago
      window.location.href = pagoData.init_point;

    } catch (err: any) {
      console.error("Error en handleSubmit de checkout:", err);
      setErrorMsg(
        err.message || "Hubo un problema al procesar tu suscripción."
      );
      setUiStatus("error"); 
    }
  };

  // --- Renderizado del Formulario (JSX) ---
  // (El JSX del formulario es el mismo que ya tienes, no lo pego
  // para no hacer esto larguísimo. Solo asegúrate de que el
  // <select> de Signo actualice el estado 'signo' con su onChange)
  // ej: onChange={(e) => setSigno(e.target.value)}
  //
  // ... (Aquí va todo tu JSX del 'return' que ya tenías) ...
  return (
    <div className="flex items-center justify-center min-h-screen py-12 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-4xl">
        {/* Título */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            Estás a un paso ✨
          </h1>
          <p className="text-lg text-slate-300 mt-2">
            Completa tus datos y confirma tu suscripción premium.
          </p>
        </div>
        
        {/* Panel Unificado */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-6 md:p-10 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            
            {/* Columna Izquierda: Formulario */}
            <div className="space-y-5">
              <h2 className="text-xl font-semibold text-white">
                Completa tus datos
              </h2>

              {/* Campo Nombre */}
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-slate-300 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  required
                />
              </div>

              {/* Campo Signo */}
              <div>
                <label htmlFor="signo" className="block text-sm font-medium text-slate-300 mb-1">
                  Tu signo
                </label>
                <select
                  id="signo"
                  value={signo}
                  onChange={(e) => setSigno(e.target.value)} // <-- Asegúrate que esto esté
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  required
                >
                  <option value="" disabled>Seleccioná tu signo</option>
                  <option value="Aries">Aries</option>
                  <option value="Tauro">Tauro</option>
                  <option value="Geminis">Géminis</option>
                  <option value="Cancer">Cáncer</option>
                  <option value="Leo">Leo</option>
                  <option value="Virgo">Virgo</option>
                  <option value="Libra">Libra</option>
                  <option value="Escorpio">Escorpio</option>
                  <option value="Sagitario">Sagitario</option>
                  <option value="Capricornio">Capricornio</option>
                  <option value="Acuario">Acuario</option>
                  <option value="Piscis">Piscis</option>
                </select>
              </div>

              {/* Campo Contenido Preferido */}
              <div>
                <label htmlFor="preferencia" className="block text-sm font-medium text-slate-300 mb-1">
                  Contenido preferido
                </label>
                <select
                  id="preferencia"
                  value={preferencia}
                  onChange={(e) => setPreferencia(e.target.value)}
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  required
                >
                  <option value="general">General (un poco de todo)</option>
                  <option value="amor">Amor y Relaciones</option>
                  <option value="trabajo">Trabajo y Carrera</option>
                  <option value="bienestar">Bienestar y Crecimiento</option>
                </select>
              </div>

              {/* Campo WhatsApp */}
              <div>
                <label htmlFor="whatsapp" className="block text-sm font-medium text-slate-300 mb-1">
                  Número de WhatsApp (celular)
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg bg-slate-700 border border-r-0 border-slate-600 text-slate-300 text-sm">
                    🇺🇾 +598
                  </span>
                  <input
                    type="tel"
                    id="whatsapp"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="099123456"
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-r-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    required
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Recibirás los mensajes premium en este número.
                </p>
              </div>
            </div>

            {/* Columna Derecha: Resumen y CTA */}
            <div className="flex flex-col justify-between space-y-6">
              <h2 className="text-xl font-semibold text-white md:invisible">
                Tu Suscripción
              </h2>

              {/* Caja de Resumen */}
              <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-6 space-y-3">
                <span className="text-sm font-bold text-indigo-400 uppercase tracking-wider">
                  Flexibilidad Total
                </span>
                <h3 className="text-2xl font-semibold text-white">
                  Suscripción premium mensual
                </h3>
                <div className="text-5xl font-bold text-white">
                  $U 390<span className="text-xl text-slate-300">/mes</span>
                </div>
                <ul className="text-slate-300 text-sm space-y-1 pt-2">
                  <li>✓ Pagás mes a mes, sin ataduras.</li>
                  <li>✓ Renovación automática. Cancelás cuando quieras.</li>
                  <li>✓ Recibís tu primer mensaje en minutos.</li>
                </ul>
                <p className="text-xs text-slate-400 pt-2">
                  Tus datos están protegidos. Podés cancelar online en cualquier momento.
                </p>
              </div>

              {/* Checkbox de Términos */}
              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aceptaTerminos}
                    onChange={(e) => setAceptaTerminos(e.target.checked)}
                    className="h-5 w-5 rounded bg-slate-700 border-slate-600 text-indigo-500 focus:ring-indigo-400"
                    required
                  />
                  <span className="text-sm text-slate-300">
                    Acepto la <a href="/politica-de-privacidad" target="_blank" className="underline hover:text-white">Política de Privacidad</a>.
                  </span>
                </label>
              </div>

              {/* Error y CTA */}
              <div className="space-y-4">
                {uiStatus === "error" && (
                  <div className="text-center p-3 rounded-lg bg-rose-900/50 border border-rose-500 text-rose-200 text-sm">
                    {errorMsg || "Ups, ocurrió un error. Revisa tus datos."}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={uiStatus === "loading"}
                  className="w-full rounded-lg px-8 py-4 font-bold text-white text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(90deg, #F5A623 0%, #FF4E6D 100%)",
                    opacity: uiStatus === "loading" ? 0.5 : 1,
                  }}
                >
                  {uiStatus === "loading" 
                    ? "Procesando..." 
                    : "Confirmar y pagar $U 390"}
                </button>
                <p className="text-xs text-slate-400 text-center">
                  Serás redirigido a Mercado Pago para finalizar de forma segura.
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}