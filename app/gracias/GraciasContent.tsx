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
      if (!id || !preapproval_id || !status) {
        window.location.href = "/";
        return;
      }

      try {
        const r = await fetch("/api/confirmar-suscripcion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_suscriptor: id, preapproval_id, status }),
        });

        const j = await r.json();
        if (!j.ok) throw new Error(j.error);

        if (status === "authorized") {
          lanzarConfeti();
        } else if (status === "pending") {
          // Redirigir directo a Mercado Pago para completar
          const resp = await fetch(`/api/preapproval-status?id_suscriptor=${id}`, { cache: "no-store" });
          const pj = await resp.json();
          if (pj?.init_point) window.location.href = pj.init_point;
        } else {
          window.location.href = "/";
        }
      } catch (err) {
        console.error(err);
        window.location.href = "/";
      }
    }

    confirmar();
  }, [id, preapproval_id, status]);

  function lanzarConfeti() {
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({ particleCount: 7, angle: 60, spread: 70, origin: { x: 0 } });
      confetti({ particleCount: 7, angle: 120, spread: 70, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };

    frame();
  }

  return (
    <div className="container-narrow text-center py-16 text-white">
      <h1 className="text-3xl font-bold mb-3">🎉 ¡Suscripción confirmada!</h1>
      <p>Gracias por activar tu plan Premium. Pronto recibirás tus mensajes cósmicos ✨</p>
    </div>
  );
}
