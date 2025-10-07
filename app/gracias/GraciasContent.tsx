"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";

export default function GraciasContent() {
  const params = useSearchParams();

  // ✅ Obtener TODOS los parámetros recibidos
  const id = params.get("id_suscriptor");
  const preapproval_id = params.get("preapproval_id");
  const status = params.get("status");
  const payer_email = params.get("payer_email");
  const external_reference = params.get("external_reference");

  // 🧾 Armar un objeto con todos los datos recibidos para log
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
      // 1️⃣ Validar presencia de datos mínimos
      if (!id || !preapproval_id) {
        console.warn("⚠️ Falta id o preapproval_id, redirigiendo al inicio");
        window.location.href = "/";
        return;
      }

      try {
        // 2️⃣ Registrar los parámetros recibidos para trazabilidad
        await fetch("/api/log-backurl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(backParams),
        });

        // 3️⃣ Normalizar estado recibido desde Mercado Pago
        const statusNorm = (status || "").toLowerCase().trim();

        // Consideramos válidos estos estados (dependen del tipo de tarjeta)
        const positivos = [
          "authorized",
          "approved",
          "success",
          "complete",
          "finished",
          "active", // algunos retornan así
        ];

        const esPositivo = positivos.includes(statusNorm);

        // 4️⃣ Si MP no mandó estado pero tenemos los IDs → igual activamos
        if (esPositivo || !statusNorm) {
          console.log("🚀 Activando Premium provisorio:", { id, preapproval_id, status });

          const res = await fetch("/api/activar-premium-provisorio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id_suscriptor: id,
              preapproval_id,
              backParams,
            }),
          });

          const data = await res.json();
          if (data.ok) {
            console.log("✅ Premium provisorio activado correctamente");
            lanzarConfeti();
            return;
          } else {
            console.error("❌ Error activando premium:", data);
            window.location.href = "/";
            return;
          }
        }

        // 5️⃣ Si está pendiente → redirigimos nuevamente a Mercado Pago
        if (statusNorm === "pending" || statusNorm === "in_process") {
          console.log("⏳ Suscripción pendiente, redirigiendo a Mercado Pago…");
          const r = await fetch(
            `/api/preapproval-status?id_suscriptor=${encodeURIComponent(id)}`,
            { cache: "no-store" }
          );
          const j = await r.json();
          if (j?.init_point) {
            window.location.href = j.init_point;
            return;
          }
        }

        // 6️⃣ Cualquier otro caso → volver al inicio
        console.warn("⚠️ Estado no reconocido:", statusNorm);
        window.location.href = "/";
      } catch (e) {
        console.error("💥 Error procesando backurl:", e);
        window.location.href = "/";
      }
    }

    procesarBackUrl();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 🎊 Animación de confeti cósmico
  function lanzarConfeti() {
    const duration = 4000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 8,
        angle: 60,
        spread: 80,
        origin: { x: 0 },
        colors: ["#f0b6ff", "#ffe29f", "#a0c4ff"],
      });
      confetti({
        particleCount: 8,
        angle: 120,
        spread: 80,
        origin: { x: 1 },
        colors: ["#f0b6ff", "#ffe29f", "#a0c4ff"],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }

  return (
    <div className="container-narrow text-center py-24 text-white">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-4 drop-shadow-[0_0_16px_#f0b6ff] animate-pulse">
        🌟 ¡Tu suscripción Premium fue activada! 🌟
      </h1>
      <p className="text-white/80 text-lg mb-6">
        En minutos recibirás tus mensajes cósmicos diarios por WhatsApp ✨
      </p>
      <p className="text-sm opacity-60">
        Si ya ves esta pantalla, no hagas nada más — tu energía quedó alineada con el universo 🌙
      </p>
    </div>
  );
}
