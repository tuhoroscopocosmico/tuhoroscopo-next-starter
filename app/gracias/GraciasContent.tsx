// ============================================================
// === Archivo: app/gracias/GraciasContent.tsx
// === Descripción: Componente CLIENTE para la bienvenida.
// === (ACTUALIZADO: Lee y muestra Nombre y Signo)
// ============================================================

"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";

type AnyDict = Record<string, any>;

// --- (Aquí van tus 3 componentes de íconos: CheckIcon, ClockIcon, ErrorIcon) ---
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
// --- (Fin de los componentes de íconos) ---


export default function GraciasContent() {
  const sp = useSearchParams();

  // --- Lógica de Parámetros de URL ---
  // (Esta parte queda igual)
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

  // --- Estados de UI (ACTUALIZADO) ---
  const [uiStatus, setUiStatus] = useState<"idle" | "ok" | "warn" | "error">(
    "idle"
  );
  
  // ================================================================
  // <--- 1. ESTADOS PARA GUARDAR LOS DATOS DE SESIÓN
  const [nombre, setNombre] = useState<string | null>(null);
  const [signo, setSigno] = useState<string | null>(null); // <-- AÑADIDO
  // ================================================================


  // Reporte para enviar a la API de logs (queda igual)
  const report: AnyDict = {
    message: "BackURL recibido en /gracias (página de USUARIO)",
    params_crudos: allParams,
    campos: { id_suscriptor: id, preapproval_id, status },
    entorno: envSnapshot,
  };


  // ================================================================
  // <--- 2. USEEFFECT PARA LEER LOS DATOS DE SESSIONSTORAGE
  // Este efecto se ejecuta SÓLO UNA VEZ cuando el componente carga.
  // ================================================================
  useEffect(() => {
    try {
      // Leemos ambos datos desde sessionStorage
      const nombreGuardado = sessionStorage.getItem("thc_nombre_suscriptor"); 
      const signoGuardado = sessionStorage.getItem("thc_signo_suscriptor"); // <-- AÑADIDO

      if (nombreGuardado) {
        setNombre(nombreGuardado); // Guardamos el nombre en el estado
      }
      if (signoGuardado) {
        setSigno(signoGuardado); // Guardamos el signo en el estado
      }
      
      // Opcional: Limpiamos los datos para que no queden
      // en la sesión si el usuario navega hacia atrás y adelante.
      sessionStorage.removeItem("thc_nombre_suscriptor");
      sessionStorage.removeItem("thc_signo_suscriptor");

    } catch (e) {
      console.warn("No se pudo leer desde sessionStorage", e);
    }
  }, []); // El array vacío [] asegura que se ejecute solo una vez.
  // ================================================================


  // Efecto principal para procesar el pago (queda igual)
  useEffect(() => {
    async function procesarBackUrl() {
      // 1) Validación mínima
      if (!id || !preapproval_id) {
        setUiStatus("error"); 
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
            setUiStatus("warn"); 
          }
        } catch (e: any) {
          setUiStatus("error"); 
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

  
  // --- Función de Confeti (igual que antes) ---
  function lanzarConfeti() {
    const duration = 5000;
    const end = Date.now() + duration;
    (function frame() {
      confetti({ particleCount: 9, angle: 60, spread: 80, origin: { x: 0 } });
      confetti({ particleCount: 9, angle: 120, spread: 80, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }

  // --- Renderizado de UI (con el nombre y signo) ---
  return (
    <div className="mx-auto max-w-2xl p-4 py-16 sm:py-24 text-center text-white">
      
      {/* ===== DISEÑO 1: EL CAMINO FELIZ (ACTUALIZADO) ===== */}
      {uiStatus === "ok" && (
        <div className="space-y-6 flex flex-col items-center">
          <CheckIcon />

          {/* ================================================================ */}
          {/* <--- 3. MODIFICADO EL H1 Y AÑADIDO UN PÁRRAFO
                     PARA USAR EL NOMBRE Y EL SIGNO
          */}
          {/* ================================================================ */}
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            ¡Felicitaciones{nombre ? `, ${nombre}` : ""}!
          </h1>
          
          <p className="text-lg text-slate-300 -mt-2">
            Tu suscripción premium
            {/* Mostramos el signo si lo pudimos leer */}
            {signo ? ` para ${signo}` : ""} está activa.
          </p>
          
          <p className="text-lg text-slate-300">
            Acabamos de enviarte tu primer mensaje de bienvenida.
            Estás a punto de recibir la mejor energía del universo.
          </p>
          {/* ================================================================ */}

          {/* ONBOARDING (queda igual) */}
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

      {/* ===== DISEÑO 2: PAGO PENDIENTE (queda igual) ===== */}
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

      {/* ===== DISEÑO 3: ERROR EN EL PAGO (queda igual) ===== */}
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