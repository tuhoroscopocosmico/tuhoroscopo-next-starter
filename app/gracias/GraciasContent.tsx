"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";

export default function GraciasContent() {
  const params = useSearchParams();

  const id = params.get("id_suscriptor");
  const preapproval_id = params.get("preapproval_id");
  const status = params.get("status");

  useEffect(() => {
    async function confirmar() {
      // 🟣 1. Validación inicial
      if (!id || !preapproval_id || !status) {
        window.location.href = "/";
        return;
      }

      try {
        // 🟣 2. Caso AUTORIZADO → activar premium provisional
        if (status === "authorized") {
          const res = await fetch("/api/activar-premium-provisorio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_suscriptor: id, preapproval_id }),
          });

          const data = await res.json();
          if (!data.ok) throw new Error(data.error || "Error al activar premium");

          // 🎊 Lanzar confeti tras actualización exitosa
          lanzarConfeti();
          return;
        }

        // 🟣 3. Caso PENDIENTE → redirigir automáticamente a Mercado Pago
        if (status === "pending") {
          const resp = await fetch(`/api/preapproval-status?id_suscriptor=${encodeURIComponent(id)}`, {
            cache: "no-store",
          });
          const j = await resp.json();
          if (j?.init_point) {
            window.location.href = j.init_point;
            return;
          }
        }

        // 🟣 4. Cualquier otro caso → volver al inicio
        window.location.href = "/";
      } catch (err) {
        console.error("❌ Error al confirmar suscripción:", err);
        window.location.href = "/";
      }
    }

    confirmar();
  }, [id, preapproval_id, status]);

  // 🎆 Confeti visual
  function lanzarConfeti() {
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 } });
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
