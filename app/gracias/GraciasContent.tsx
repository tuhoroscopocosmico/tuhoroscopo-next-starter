// ============================================================
// === Archivo: app/gracias/GraciasContent.tsx
// === Descripción: Componente CLIENTE para la página de agradecimiento post-pago.
// ===              Lee el estado del pago desde URL y los datos del usuario
// ===              desde sessionStorage para personalizar el mensaje.
// ============================================================

"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";
import { Loader2 } from 'lucide-react'; // *** AÑADIDO: Importar Loader2 ***

// Tipo para los datos guardados en sessionStorage
interface CheckoutData {
  name?: string;
  signo?: string;
  contenidoPreferido?: string;
  whatsapp?: string;
}

// Tipo genérico para parámetros (sin cambios)
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
  const sp = useSearchParams();

  // --- Lógica de Parámetros de URL (sin cambios) ---
  const allParams = useMemo(() => {
    const obj: AnyDict = {};
    try {
      for (const [k, v] of Array.from(sp.entries())) {
        if (obj[k] === undefined) obj[k] = v;
        else obj[k] = Array.isArray(obj[k]) ? [...obj[k], v] : [obj[k], v];
      }
    } catch (_) {}
    return obj;
  }, [sp]);

  const id = (allParams.id_suscriptor ?? allParams.id ?? "") as string;
  const preapproval_id = (
    allParams.preapproval_id ?? allParams.preapproval ?? ""
  ) as string;
  const status = (allParams.status ?? allParams.collection_status ?? "") as string;

  const envSnapshot = useMemo(
    () => ({
      href: typeof window !== "undefined" ? window.location.href : "",
    }),
    []
  );

  // --- Estados de UI ---
  const [uiStatus, setUiStatus] = useState<"idle" | "ok" | "warn" | "error">(
    "idle"
  );
  // Estados para guardar los datos de sessionStorage
  const [nombre, setNombre] = useState<string | null>(null);
  const [signo, setSigno] = useState<string | null>(null);


  // Reporte para enviar a la API de logs (sin cambios)
  const report: AnyDict = {
    message: "BackURL recibido en /gracias (página de USUARIO)",
    params_crudos: allParams,
    campos: { id_suscriptor: id, preapproval_id, status },
    entorno: envSnapshot,
  };


  // useEffect para leer los datos de sessionStorage (sin cambios)
  useEffect(() => {
    try {
      const dataString = sessionStorage.getItem('checkoutData');
      if (dataString) {
        const data: CheckoutData = JSON.parse(dataString);
        if (data.name) {
          setNombre(data.name);
        }
        if (data.signo) {
          setSigno(data.signo);
        }
        console.log("Datos recuperados de sessionStorage:", data);
        sessionStorage.removeItem('checkoutData');
        console.log("Datos de sessionStorage eliminados después de leer.");
      } else {
        console.warn("No se encontraron datos en sessionStorage ('checkoutData').");
      }
    } catch (e) {
      console.error("Error al leer o parsear datos de sessionStorage:", e);
    }
  }, []);


  // --- Efecto principal para procesar el pago (sin cambios) ---
  useEffect(() => {
    async function procesarBackUrl() {
      if (!id || !preapproval_id) {
        console.error("Error: Faltan id_suscriptor o preapproval_id en URL");
        setUiStatus("error");
        return;
      }

      try {
        fetch("/api/log-backurl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tipo: "BACKURL_MP_USUARIO", ...report }),
        });
      } catch (e) {
        console.warn("Fallo al enviar log de backurl:", e);
      }

      const statusNorm = String(status || "").toLowerCase().trim();
      console.log("Status normalizado:", statusNorm);

      const positivos = ["authorized", "approved", "success", "active", ""];
      const esPositivo = positivos.includes(statusNorm);

      if (esPositivo) {
        console.log("Status considerado POSITIVO. Intentando activar provisorio...");
        try {
          const r = await fetch("/api/activar-premium-provisorio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id_suscriptor: id,
              preapproval_id,
              backParams: { ...allParams, ...envSnapshot },
            }),
          });
          const j = await r.json().catch(() => ({}));
          console.log("Respuesta de /activar-premium-provisorio:", { status: r.status, body: j });

          if (r.ok && j?.ok) {
            setUiStatus("ok");
            lanzarConfeti();
          } else {
            console.warn("Activación provisoria falló:", j);
            setUiStatus("warn");
          }
        } catch (e: any) {
          console.error("Error en fetch a /activar-premium-provisorio:", e);
          setUiStatus("error");
        }
        return;
      }

      if (statusNorm === "pending" || statusNorm === "in_process") {
        console.log("Status PENDIENTE.");
        setUiStatus("warn");
        return;
      }

      console.log("Status considerado ERROR/RECHAZADO:", statusNorm);
      setUiStatus("error");
    }

    procesarBackUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // --- Renderizado de UI (sin cambios respecto a la versión anterior) ---
  return (
    <div className="mx-auto max-w-2xl p-4 py-16 sm:py-24 text-center text-white">

      {/* Estado Idle */}
       {uiStatus === "idle" && (
         <div className="space-y-6 flex flex-col items-center">
             {/* *** AHORA Loader2 ESTÁ IMPORTADO Y DEBERÍA FUNCIONAR *** */}
             <Loader2 className="w-16 h-16 text-slate-400 animate-spin" />
             <h1 className="text-2xl sm:text-3xl font-bold text-slate-300">
                Procesando información del pago...
             </h1>
         </div>
       )}

      {/* Camino Feliz */}
      {uiStatus === "ok" && (
        <div className="space-y-6 flex flex-col items-center">
          <CheckIcon />
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            ¡Felicitaciones{nombre ? `, ${nombre}` : ""}!
          </h1>
          <p className="text-lg text-slate-300 -mt-2">
            Tu suscripción premium
            {signo ? ` para ${signo}` : ""} está activa.
          </p>
          <p className="text-lg text-slate-300">
            Acabamos de enviarte tu primer mensaje de bienvenida.
            Estás a punto de recibir la mejor energía del universo.
          </p>
          <div className="w-full rounded-lg border border-slate-700 bg-slate-900/40 p-6 text-left space-y-5">
            <h2 className="text-xl font-semibold text-white">
              Pasos siguientes:
            </h2>
            <div className="flex items-start gap-3">
              <div className="font-bold text-2xl text-indigo-400 pt-0.5">1.</div>
              <p className="text-base">
                <strong>Revisá tu WhatsApp.</strong> Ya deberías tener nuestro
                mensaje en el número que registraste.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="font-bold text-2xl text-indigo-400 pt-0.5">2.</div>
              <p className="text-base">
                <strong>¡Agréganos a tus contactos!</strong> Este es el paso más
                importante para asegurar que siempre recibas nuestros mensajes
                y audios.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="font-bold text-2xl text-indigo-400 pt-0.5">3.</div>
              <p className="text-base">
                <strong>¿No recibiste nada?</strong> Si en 5 minutos no ves nuestro
                mensaje, escríbenos a{" "}
                <a
                  href="mailto:soporte@tuhoroscopocosmico.com"
                  className="font-bold underline hover:text-indigo-300"
                >
                  soporte@tuhoroscopocosmico.com
                </a>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pago Pendiente */}
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

      {/* Error en el Pago */}
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
              href="/checkout"
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

