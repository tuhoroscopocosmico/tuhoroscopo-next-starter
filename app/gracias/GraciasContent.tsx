"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";

export default function GraciasContent() {
  const params = useSearchParams();

  // Obtener TODOS los parámetros recibidos
  const id = params.get("id_suscriptor");
  const preapproval_id = params.get("preapproval_id");
  const status = params.get("status");
  const payer_email = params.get("payer_email");
  const external_reference = params.get("external_reference");

  // Armar un objeto con todos los datos recibidos para log
  const backParams = {
    id_suscriptor: id,
    preapproval_id,
    status,
    payer_email,
    external_reference,
    timestamp: new Date().toISOString(),
  };

  useEffect(() => {
    async function procesarBackUrl() {
      // 🔹 1. Validar presencia de datos mínimos
      if (!id || !preapproval_id) {
        window.location.href = "/";
        return;
      }

      try {
        // 🔹 2. Registrar los parámetros recibidos para trazabilidad
        await fetch("/api/log-backurl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(backParams),
        });

        // 🔹 3. Evaluar el estado recibido desde MP
        const positivo =
          ["authorized", "approved", "success"].includes(status?.toLowerCase() || "");

        if (positivo) {
          // Activar premium provisional
          const res = await fetch("/api/activar-premium-provisorio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_suscriptor: id, preapproval_id, backParams }),
          });
          const data = await res.json();
          if (data.ok) lanzarConfeti();
          else console.error("Error activando premium:", data);
          return;
        }

        // 🔹 4. Caso pendiente → redirigir a MP
        if (status === "pending") {
          const r = await fetch(`/api/preapproval-status?id_suscriptor=${encodeURIComponent(id)}`);
          const j = await r.json();
          if (j?.init_point) {
            window.location.href = j.init_point;
            return;
          }
        }

        // 🔹 5. Cualquier otro caso → volver al inicio
        window.location.href = "/";
      } catch (e) {
        console.error("Error procesando backurl:", e);
        window.location.href = "/";
      }
    }

    procesarBackUrl();
  }, []);

  // 🎊 Animación de confeti cósmico
  function lanzarConfeti() {
    const duration = 3 * 1000;
    const end = Date.now() + duration;
    (function frame() {
      confetti({ particleCount: 7, angle: 60, spread: 70, origin: { x: 0 } });
      confetti({ particleCount: 7, angle: 120, spread: 70, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }

  return (
    <div className="container-narrow text-center py-20 text-white">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-4 drop-shadow-[0_0_12px_#f0b6ff]">
        ✨ ¡Tu suscripción Premium fue activada! ✨
      </h1>
      <p className="text-white/80 mb-6 animate-pulse">
        En minutos recibirás tu primer mensaje en WhatsApp 🌙
      </p>
    </div>
  );
}
