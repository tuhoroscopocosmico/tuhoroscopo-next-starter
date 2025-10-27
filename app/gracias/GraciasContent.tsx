// ============================================================
// === Archivo: app/gracias/GraciasContent.tsx
// === Descripción: Componente CLIENTE para la página de agradecimiento post-pago.
// ===              Lee el estado del pago desde URL y los datos del usuario
// ===              (incluyendo WhatsApp) desde sessionStorage.
// ============================================================

"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";
import { Loader2 } from 'lucide-react'; // Importar Loader2

// Tipo para los datos guardados en sessionStorage
interface CheckoutData {
  name?: string;
  signo?: string;
  contenidoPreferido?: string;
  whatsapp?: string; // Esperamos el formato 09...
}

// Tipo genérico para parámetros
type AnyDict = Record<string, any>;

// --- Componentes de Íconos (sin cambios) ---
function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="w-16 h-16 text-emerald-400"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-16 h-16 text-amber-400"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}
function ErrorIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-16 h-16 text-rose-500"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
      />
    </svg>
  );
}
// --- Fin Componentes de Íconos ---


export default function GraciasContent() {
  // Hook para leer parámetros de la URL
  const sp = useSearchParams();

  // --- Lógica de Parámetros de URL ---
  // Extrae todos los parámetros de la URL en un objeto
  const allParams = useMemo(() => {
    const obj: AnyDict = {};
    try {
      // `sp.entries()` devuelve un iterador, lo convertimos a array y lo recorremos
      for (const [k, v] of Array.from(sp.entries())) {
        // Maneja parámetros repetidos convirtiéndolos en array
        if (obj[k] === undefined) obj[k] = v;
        else obj[k] = Array.isArray(obj[k]) ? [...obj[k], v] : [obj[k], v];
      }
    } catch (_) {
        // Ignora errores si `sp` no es iterable (poco probable)
    }
    return obj;
  }, [sp]); // Se recalcula solo si cambian los searchParams

  // Extrae parámetros específicos necesarios para la lógica
  const id = (allParams.id_suscriptor ?? allParams.id ?? "") as string;
  const preapproval_id = (
    allParams.preapproval_id ?? allParams.preapproval ?? ""
  ) as string;
  const status = (allParams.status ?? allParams.collection_status ?? "") as string;

  // Guarda la URL actual para logging (solo una vez al montar)
  const envSnapshot = useMemo(
    () => ({
      href: typeof window !== "undefined" ? window.location.href : "", // Asegura que solo se ejecute en cliente
    }),
    []
  );

  // --- Estados de UI ---
  // Controla qué bloque de contenido mostrar (cargando, éxito, pendiente, error)
  const [uiStatus, setUiStatus] = useState<"idle" | "ok" | "warn" | "error">(
    "idle" // Comienza en 'idle' para mostrar el loader
  );
  // Almacena los datos del usuario recuperados de sessionStorage
  const [nombre, setNombre] = useState<string | null>(null);
  const [signo, setSigno] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState<string | null>(null);


  // Objeto con datos para enviar a la API de logs (sin cambios)
  const report: AnyDict = {
    message: "BackURL recibido en /gracias (página de USUARIO)",
    params_crudos: allParams,
    campos: { id_suscriptor: id, preapproval_id, status },
    entorno: envSnapshot,
  };


  // --- useEffect para leer datos de sessionStorage ---
  // Se ejecuta una sola vez al cargar el componente para personalizar el mensaje.
  useEffect(() => {
    // Usamos try/catch por si sessionStorage no está disponible o falla
    try {
      // Intentamos leer el objeto guardado desde CheckoutContent
      const dataString = sessionStorage.getItem('checkoutData');
      if (dataString) {
        // Parseamos el JSON guardado
        const data: CheckoutData = JSON.parse(dataString);
        // Si encontramos nombre, lo guardamos en el estado local
        if (data.name) {
          setNombre(data.name);
        }
        // Si encontramos signo, lo guardamos en el estado local
        if (data.signo) {
          setSigno(data.signo);
        }
        // Leer y guardar WhatsApp
        if (data.whatsapp) {
          setWhatsapp(data.whatsapp); // Guardamos el número local (ej: 099...)
        }
        console.log("Datos recuperados de sessionStorage:", data);
        // Limpiamos el item para no reutilizarlo si el usuario navega
        sessionStorage.removeItem('checkoutData');
        console.log("Datos de sessionStorage eliminados después de leer.");
      } else {
        // No se encontró el item, puede ser navegación directa o un error previo
        console.warn("No se encontraron datos en sessionStorage ('checkoutData').");
      }
    } catch (e) {
      console.error("Error al leer o parsear datos de sessionStorage:", e);
    }
  }, []); // El array vacío asegura ejecución única al montar


  // --- Efecto principal para procesar el estado del pago (sin cambios) ---
  useEffect(() => {
    async function procesarBackUrl() {
      // 1) Validación: Si no tenemos ID de suscriptor o preapproval, es un error
      if (!id || !preapproval_id) {
        console.error("Error: Faltan id_suscriptor o preapproval_id en URL");
        setUiStatus("error"); // Mostramos UI de error
        return; // Salimos de la función
      }

      // 2) Enviar log al backend (sin esperar respuesta, "fire and forget")
      try {
        fetch("/api/log-backurl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tipo: "BACKURL_MP_USUARIO", ...report }),
        });
      } catch (e) {
        console.warn("Fallo al enviar log de backurl:", e);
      }

      // 3) Normalizar el status recibido de Mercado Pago (minúsculas, sin espacios)
      const statusNorm = String(status || "").toLowerCase().trim();
      console.log("Status normalizado:", statusNorm);

      // Lista de estados considerados exitosos (incluye vacío por si MP no lo envía)
      const positivos = ["authorized", "approved", "success", "active", ""];
      const esPositivo = positivos.includes(statusNorm);

      // --- Rama: Pago Exitoso o Indeterminado ---
      if (esPositivo) {
        console.log("Status considerado POSITIVO. Intentando activar provisorio...");
        // Intentamos activar el estado premium provisorio llamando a otra API
        try {
          const r = await fetch("/api/activar-premium-provisorio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id_suscriptor: id,
              preapproval_id,
              backParams: { ...allParams, ...envSnapshot }, // Enviamos todos los params por si acaso
            }),
          });
          // Intentamos parsear la respuesta, default a {} si falla
          const j = await r.json().catch(() => ({}));
          console.log("Respuesta de /activar-premium-provisorio:", { status: r.status, body: j });

          // Si la API respondió OK y el cuerpo tiene { ok: true }
          if (r.ok && j?.ok) {
            setUiStatus("ok"); // Mostramos UI de éxito
            lanzarConfeti(); // Lanzamos confeti
          } else {
            // Si la activación falló (ej. ID no encontrado en DB)
            console.warn("Activación provisoria falló:", j);
            setUiStatus("warn"); // Mostrar como pendiente/advertencia
          }
        } catch (e: any) {
          // Si falló el fetch a la API de activación
          console.error("Error en fetch a /activar-premium-provisorio:", e);
          setUiStatus("error"); // Mostramos UI de error
        }
        return; // Salimos de la función
      }

      // --- Rama: Pago Pendiente ---
      if (statusNorm === "pending" || statusNorm === "in_process") {
        console.log("Status PENDIENTE.");
        setUiStatus("warn"); // Mostramos UI de pendiente/advertencia
        return; // Salimos de la función
      }

      // --- Rama: Pago Rechazado o Fallido ---
      // Cualquier otro status se considera error
      console.log("Status considerado ERROR/RECHAZADO:", statusNorm);
      setUiStatus("error"); // Mostramos UI de error
    }

    // Ejecutamos la función asíncrona definida arriba
    procesarBackUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dependencias vacías para ejecutar solo una vez al montar

  // --- Función de Confeti (sin cambios) ---
  function lanzarConfeti() {
    const duration = 8000;
    const end = Date.now() + duration;
    (function frame() {
      confetti({ particleCount: 8, angle: 60, spread: 80, origin: { x: 0 } });
      confetti({ particleCount: 8, angle: 120, spread: 80, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }


  // --- Renderizado de UI ---
  return (
    <div className="mx-auto max-w-2xl p-4 py-16 sm:py-24 text-center text-white">

      {/* Estado Idle: Muestra loader mientras se procesa el pago */}
       {uiStatus === "idle" && (
         <div className="space-y-6 flex flex-col items-center">
             <Loader2 className="w-16 h-16 text-slate-400 animate-spin" />
             <h1 className="text-2xl sm:text-3xl font-bold text-slate-300">
                Procesando información del pago...
             </h1>
         </div>
       )}

      {/* ===== DISEÑO 1: EL CAMINO FELIZ (ACTUALIZADO) ===== */}
      {uiStatus === "ok" && (
        <div className="space-y-6 flex flex-col items-center">
          <CheckIcon />
          {/* Saludo personalizado con nombre */}
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            ¡Felicitaciones{nombre ? `, ${nombre}` : ""}!
          </h1>
          {/* Mensaje personalizado con signo */}
          <p className="text-lg text-slate-300 -mt-2">
            Tu suscripción premium
            {signo ? ` para ${signo}` : ""} está activa.
          </p>
          <p className="text-lg text-slate-300">
            Acabamos de enviarte tu primer mensaje de bienvenida.
            Estás a punto de recibir la mejor energía del universo.
          </p>

          {/* ONBOARDING (ACTUALIZADO PASO 1) */}
          <div className="w-full rounded-lg border border-slate-700 bg-slate-900/40 p-6 text-left space-y-5">
            <h2 className="text-xl font-semibold text-white">
              Pasos siguientes:
            </h2>
            {/* *** PASO 1 MODIFICADO para incluir WhatsApp PARCIAL *** */}
            <div className="flex items-start gap-3">
              <div className="font-bold text-2xl text-indigo-400 pt-0.5">1.</div>
              <p className="text-base">
                <strong>Revisá tu WhatsApp.</strong> Ya deberías tener nuestro
                mensaje en el número que registraste
                {/* Mostramos solo los últimos 3 dígitos si tenemos el número */}
                {whatsapp ? ` (terminado en ...${whatsapp.slice(-3)})` : ""}.
              </p>
            </div>
            {/* ****************************************************** */}
            {/* Paso 2 (sin cambios) */}
            <div className="flex items-start gap-3">
              <div className="font-bold text-2xl text-indigo-400 pt-0.5">2.</div>
              <p className="text-base">
                <strong>¡Agréganos a tus contactos!</strong> Este es el paso más
                importante para asegurar que siempre recibas nuestros mensajes
                y audios.
              </p>
            </div>
            {/* Paso 3 (sin cambios) */}
            <div className="flex items-start gap-3">
              <div className="font-bold text-2xl text-indigo-400 pt-0.5">3.</div>
              <p className="text-base">
                <strong>¿No recibiste nada?</strong> Si en 5 minutos no ves nuestro
                mensaje, escríbenos a{" "}
                <a
                  href="mailto:soporte@tuhoroscopocosmico.com" // Email de soporte
                  className="font-bold underline hover:text-indigo-300"
                >
                  soporte@tuhoroscopocosmico.com
                </a>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pago Pendiente (sin cambios) */}
      {uiStatus === "warn" && (
        <div className="space-y-6 flex flex-col items-center">
          <ClockIcon />
          <h1 className="text-3xl sm:text-4xl font-bold text-amber-400">
            Tu pago está pendiente.
          </h1>
          <p className="text-lg text-slate-300">
            No te preocupes, esto es normal. A veces Mercado Pago (o la
            tarjeta) demora unos minutos en procesar la suscripción.
          </p>
          <div className="w-full rounded-lg border border-slate-700 bg-slate-900/40 p-6 text-slate-300">
            <p>
              Te avisaremos por WhatsApp (al número que registraste)
              apenas se confirme el pago. No necesitas hacer nada más.
            </p>
          </div>
        </div>
      )}

      {/* Error en el Pago (sin cambios) */}
      {uiStatus === "error" && (
        <div className="space-y-6 flex flex-col items-center">
          <ErrorIcon />
          <h1 className="text-3xl sm:text-4xl font-bold text-rose-500">
            Ups, ocurrió un error.
          </h1>
          <p className="text-lg text-slate-300">
            No te preocupes, no se realizó ningún cargo en tu tarjeta.
          </p>
          <div className="w-full rounded-lg border border-slate-700 bg-slate-900/40 p-6 space-y-5">
            <p>
              Parece que hubo un problema al procesar tu suscripción
              (el pago pudo ser rechazado o faltaron datos).
              Por favor, vuelve a intentarlo.
            </p>
            <a
              href="/checkout" // Enlace a tu página de checkout unificada
              className="inline-block rounded-lg px-8 py-3 font-bold text-violet-900 bg-gradient-to-r from-amber-400 to-pink-400 shadow-lg hover:from-amber-300 hover:to-pink-300 hover:scale-[1.03]"
            >
              Intentar pagar de nuevo
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

