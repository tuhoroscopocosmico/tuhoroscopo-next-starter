"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";

type AnyDict = Record<string, any>;

// Componente visual para un ícono de check (Éxito)
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

// Componente visual para un ícono de reloj (Pendiente)
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

// Componente visual para un ícono de error (Error)
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

export default function GraciasContent() {
  const sp = useSearchParams();

  // ─────────────────────────────────────────────────────────────
  // TODA LA LÓGICA DE DIAGNÓSTICO SE MANTIENE
  // ─────────────────────────────────────────────────────────────
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

  const [uiStatus, setUiStatus] = useState<"idle" | "ok" | "warn" | "error">(
    "idle"
  );
  const [nombre, setNombre] = useState<string | null>(null); // <-- 1. AÑADIDO ESTADO PARA EL NOMBRE

  // Reporte para enviar a la API de logs
  const report: AnyDict = {
    message: "BackURL recibido en /gracias (página de USUARIO)",
    params_crudos: allParams,
    campos: { id_suscriptor: id, preapproval_id, status },
    entorno: envSnapshot,
  };

  // <-- 2. AÑADIDO USEEFFECT PARA LEER LOCALSTORAGE
  // Efecto para leer el nombre desde localStorage
  useEffect(() => {
    try {
      // Revisa si este 'key' es el correcto que usaste al guardar
      const nombreGuardado = localStorage.getItem("thc_nombre_suscriptor");
      if (nombreGuardado) {
        setNombre(nombreGuardado);
      }
    } catch (e) {
      // No es un error crítico, solo un warning en consola
      console.warn("No se pudo leer el nombre desde localStorage", e);
    }
  }, []); // El array vacío asegura que se ejecute solo una vez

  useEffect(() => {
    async function procesarBackUrl() {
      // 1) Validación mínima
      if (!id || !preapproval_id) {
        setUiStatus("error"); // Faltan params, mostramos error
        return;
      }

      // 2) Enviar log al servidor (en segundo plano)
      try {
        fetch("/api/log-backurl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tipo: "BACKURL_MP_USUARIO", ...report }),
        });
      } catch (e) {}

      // 3) Normalizar status
      const statusNorm = String(status || "").toLowerCase().trim();

      // Estados positivos
      const positivos = ["authorized", "approved", "success", "active"];
      const esPositivo = positivos.includes(statusNorm) || statusNorm === "";

      if (esPositivo) {
        // Intento activar premium provisorio
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

          if (r.ok && j?.ok) {
            setUiStatus("ok");
            lanzarConfeti();
          } else {
            setUiStatus("warn"); // Falló la activación, queda pendiente
          }
        } catch (e: any) {
          setUiStatus("error"); // Error de red
        }
        return;
      }

      // 4) Estados pendientes
      if (statusNorm === "pending" || statusNorm === "in_process") {
        setUiStatus("warn");
        return;
      }

      // 5) Otros estados (rechazado, fallido, etc.)
      setUiStatus("error");
    }

    procesarBackUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─────────────────────────────────────────────────────────────
  // UI HELPER: FUNCIÓN DE CONFETI
  // ─────────────────────────────────────────────────────────────
  function lanzarConfeti() {
    const duration = 3000;
    const end = Date.now() + duration;
    (function frame() {
      confetti({ particleCount: 8, angle: 60, spread: 80, origin: { x: 0 } });
      confetti({ particleCount: 8, angle: 120, spread: 80, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }

  // ─────────────────────────────────────────────────────────────
  // NUEVO RETURN (UI PARA EL USUARIO)
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl p-4 py-16 sm:py-24 text-center text-white">
      {/* Mientras uiStatus === 'idle', el Suspense de page.tsx 
        muestra "Cargando...".
        Solo renderizamos cuando tenemos un estado final.
      */}

      {/* ===== DISEÑO 1: EL CAMINO FELIZ ===== */}
      {uiStatus === "ok" && (
        <div className="space-y-6 flex flex-col items-center">
          <CheckIcon />
          {/* // <-- 3. MODIFICADO H1 PARA USAR EL NOMBRE */}
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            ¡Felicitaciones{nombre ? `, ${nombre}` : ""}! Tu suscripción está
            activa.
          </h1>
          <p className="text-lg text-slate-300">
            Acabamos de enviarte tu primer mensaje de bienvenida. Estás a punto
            de recibir la mejor energía del universo.
          </p>

          {/* ONBOARDING */}
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
                importante para asegurar que siempre recibas nuestros mensajes y
                audios.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="font-bold text-2xl text-indigo-400 pt-0.5">3.</div>
              <p className="text-base">
                <strong>¿No recibiste nada?</strong> Si en 5 minutos no ves
                nuestro mensaje, escríbenos a{" "}
                <a
                  href="mailto:soporte@tuhoroscopo.com" // <-- CAMBIA ESTE EMAIL
                  className="font-bold underline hover:text-indigo-300"
                >
                  soporte@tuhoroscopo.com
                </a>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===== DISEÑO 2: PAGO PENDIENTE =====  */}
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
              Te avisaremos por WhatsApp (al número que registraste) apenas se
              confirme el pago. No necesitas hacer nada más.
            </p>
          </div>
        </div>
      )}

      {/* ===== DISEÑO 3: ERROR EN EL PAGO ===== */}
      {uiStatus === "error" && (
        <div className="space-y-6 flex flex-col items-center">
          <ErrorIcon />
          <h1 className="text-3xl sm:text-4xl font-bold text-rose-500">
            Ups, ocurrió un error.
          </h1>
          <p className="text-lg text-slate-300">
            No te preocupes, no se realizó ningún cargo en tu tarjeta.
          </p> {/* // <-- 4. CORREGIDO CIERRE DE ETIQUETA */}
          <div className="w-full rounded-lg border border-slate-700 bg-slate-900/40 p-6 space-y-5">
            <p>
              Parece que hubo un problema al procesar tu suscripción (el pago
              pudo ser rechazado o faltaron datos). Por favor, vuelve a
              intentarlo.
            </p>
            <a
              href="/#checkout" // <-- Ajusta esto a tu página de checkout
              className="inline-block rounded-lg px-8 py-3 font-bold text-white"
              style={{
                // Re-usamos el estilo del botón CTA
                background: "linear-gradient(90deg, #F5A623 0%, #FF4E6D 100%)",
              }}
            >
              Intentar pagar de nuevo
            </a>
          </div>
        </div>
      )}
    </div>
  );
}