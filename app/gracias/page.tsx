"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function Gracias() {
  const params = useSearchParams();
  const [msg, setMsg] = useState("Activando tu suscripción…");
  const [showButton, setShowButton] = useState(false);

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
    let id = getId();
    if (!id) {
      setMsg("No encontramos tu registro. Volvé al inicio.");
      setShowButton(false);
      return;
    }

    let cancelled = false;
    const start = Date.now();

    async function tick() {
      if (cancelled) return;
      try {
        const r = await fetch(`/api/preapproval-status?id_suscriptor=${encodeURIComponent(id!)}`, { cache: "no-store" });
        const j = await r.json();
        if (j?.exists && j?.init_point) {
          window.location.href = j.init_point as string;
          return;
        }
      } catch {}

      if (Date.now() - start > 25000) {
        setMsg("Pago recibido. Tocá “Continuar” para autorizar la renovación en Mercado Pago.");
        setShowButton(true);
        return;
      }
      setTimeout(tick, 1500);
    }

    tick();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function handleContinuar() {
    const id = getId();
    if (!id) return;
    try {
      const r = await fetch(`/api/preapproval-status?id_suscriptor=${encodeURIComponent(id)}`, { cache: "no-store" });
      const j = await r.json();
      if (j?.init_point) window.location.href = j.init_point as string;
    } catch {}
  }

  return (
    <div className="container-narrow py-16 text-center text-white">
      <h1 className="text-2xl font-semibold mb-2">¡Pago recibido!</h1>
      <p className="mb-6">{msg}</p>
      {showButton && (
        <>
          <button className="btn-cta" onClick={handleContinuar}>Continuar</button>
          <p className="mt-3 text-sm opacity-70">Si no te redirige solo, tocá Continuar.</p>
        </>
      )}
    </div>
  );
}
