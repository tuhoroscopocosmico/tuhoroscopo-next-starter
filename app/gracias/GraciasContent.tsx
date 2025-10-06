"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";

export default function GraciasContent() {
  const params = useSearchParams();

  function getId(): string | null {
    const q = params.get("id_suscriptor");
    if (q) return q;
    try {
      const raw = sessionStorage.getItem("registro");
      if (raw) return JSON.parse(raw)?.id_suscriptor ?? null;
    } catch {}
    return null;
  }

  useEffect(() => {
    const id = getId();
    if (!id) {
      // 🔁 Sin registro → volver al inicio
      window.location.href = "/";
      return;
    }

    async function verificar() {
      try {
        const r = await fetch(`/api/preapproval-status?id_suscriptor=${encodeURIComponent(id)}`, { cache: "no-store" });
        const j = await r.json();

        if (j?.status === "authorized") {
          lanzarConfeti();
          return;
        }

        if (j?.status === "pending" && j?.init_point) {
          // 🔁 Redirigir directo a Mercado Pago
          window.location.href = j.init_point as string;
          return;
        }

        // 🔁 Cualquier otro caso → volver al inicio
        window.location.href = "/";
      } catch {
        window.location.href = "/";
      }
    }

    verificar();
  }, []);

  function lanzarConfeti() {
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };

    frame();
  }

  return (
    <div className="container-narrow py-20 text-center text-white relative z-10">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-4 drop-shadow-[0_0_12px_#f0b6ff]">
        ✨ ¡Tu suscripción Premium fue activada! ✨
      </h1>
      <p className="text-white/80 mb-6 animate-pulse">
        En minutos recibirás tu primer mensaje en WhatsApp 🌙
      </p>
    </div>
  );
}
