"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";

type AnyDict = Record<string, any>;

export default function GraciasContent() {
  const sp = useSearchParams();

  // ─────────────────────────────────────────────────────────────
  // 1) Captura cruda de TODO lo que venga por querystring
  // ─────────────────────────────────────────────────────────────
  const allParams = useMemo(() => {
    const obj: AnyDict = {};
    try {
      for (const [k, v] of Array.from(sp.entries())) {
        // si un parámetro viene duplicado, lo guardamos como array
        if (obj[k] === undefined) obj[k] = v;
        else obj[k] = Array.isArray(obj[k]) ? [...obj[k], v] : [obj[k], v];
      }
    } catch (_) {}
    return obj;
  }, [sp]);

  // 2) Campos “clásicos” (puede que alguno no venga)
  const id = (allParams.id_suscriptor ?? allParams.id ?? "") as string;
  const preapproval_id = (allParams.preapproval_id ?? allParams.preapproval ?? "") as string;
  const status = (allParams.status ?? allParams.collection_status ?? "") as string;
  const payer_email = (allParams.payer_email ?? allParams.email ?? "") as string;
  const external_reference = (allParams.external_reference ?? "") as string;

  // 3) Datos extra del entorno/URL para diagnóstico
  const envSnapshot = useMemo(
    () => ({
      href: typeof window !== "undefined" ? window.location.href : "",
      referrer: typeof document !== "undefined" ? document.referrer : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      timestamp: new Date().toISOString(),
    }),
    []
  );

  // Panel de estado/errores y timeline
  const [uiStatus, setUiStatus] = useState<"idle" | "ok" | "warn" | "error">("idle");
  const [uiTitle, setUiTitle] = useState<string>("Analizando respuesta de Mercado Pago…");
  const [logs, setLogs] = useState<Array<{ step: string; data?: AnyDict; level?: "info" | "warn" | "error" }>>([]);

  const pushLog = (step: string, data?: AnyDict, level: "info" | "warn" | "error" = "info") =>
    setLogs((p) => [...p, { step, data, level }]);

  // Report consolidado para copiar
  const report: AnyDict = {
    message: "BackURL recibido en /gracias-premium (no hay redirecciones activas)",
    params_crudos: allParams,
    campos: { id_suscriptor: id, preapproval_id, status, payer_email, external_reference },
    entorno: envSnapshot,
    timeline: logs,
  };

  useEffect(() => {
    async function procesarBackUrl() {
      // 0) log de entrada
      pushLog("INICIO", { ...report });

      // 1) Validación mínima (no redirige; sólo muestra)
      if (!id || !preapproval_id) {
        const detail = { motivo: "Falta id_suscriptor o preapproval_id", id, preapproval_id };
        pushLog("VALIDACION_MINIMA_FALLA", detail, "warn");
        setUiStatus("warn");
        setUiTitle("⚠️ Faltan parámetros mínimos (id_suscriptor o preapproval_id).");
        // window.location.href = "/"; // ← redirección deshabilitada
        return;
      }

      // 2) Enviar log al servidor (si existe /api/log-backurl) para que quede en Vercel
      try {
        const body = {
          tipo: "BACKURL_MP",
          ...report,
        };
        const res = await fetch("/api/log-backurl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        pushLog("LOG_BACKURL_POST", { ok: res.ok, status: res.status });
      } catch (e: any) {
        pushLog("LOG_BACKURL_POST_ERROR", { error: String(e) }, "warn");
      }

      // 3) Normalizar status
      const statusNorm = String(status || "").toLowerCase().trim();
      pushLog("STATUS_NORMALIZADO", { status_raw: status, statusNorm });

      // Estados “positivos” conocidos en distintos flujos
      const positivos = ["authorized", "approved", "success", "complete", "finished", "active"];
      const esPositivo = positivos.includes(statusNorm) || statusNorm === "";
      if (esPositivo) {
        // Intento activar premium provisorio (NO redirige, sólo muestra resultado)
        try {
          pushLog("ACTIVAR_PREMIUM_PROVISORIO_TRY", { id, preapproval_id });
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
          pushLog("ACTIVAR_PREMIUM_PROVISORIO_RESP", { http: r.status, json: j });
          if (r.ok && j?.ok) {
            setUiStatus("ok");
            setUiTitle("✅ Premium provisorio activado (sin redirección).");
            lanzarConfeti();
          } else {
            setUiStatus("warn");
            setUiTitle("⚠️ No se pudo activar premium provisorio (revisar respuesta).");
          }
        } catch (e: any) {
          pushLog("ACTIVAR_PREMIUM_PROVISORIO_ERROR", { error: String(e) }, "error");
          setUiStatus("error");
          setUiTitle("❌ Error activando premium provisorio.");
        }
        // return; // ← si querés cortar acá, dejá el return. Lo dejo comentado para seguir recolectando data.
      }

      // 4) Si el estado parece “pendiente”, consultamos a nuestra API el init_point
      if (statusNorm === "pending" || statusNorm === "in_process") {
        try {
          pushLog("PENDIENTE_CHECK_PREAPPROVAL_STATUS_TRY", { id });
          const r = await fetch(`/api/preapproval-status?id_suscriptor=${encodeURIComponent(id)}`, {
            cache: "no-store",
          });
          const j = await r.json().catch(() => ({}));
          pushLog("PENDIENTE_CHECK_PREAPPROVAL_STATUS_RESP", { http: r.status, json: j });
          // if (j?.init_point) window.location.href = j.init_point; // ← deshabilitado
          setUiStatus("warn");
          setUiTitle("⏳ Suscripción pendiente. Se consultó /preapproval-status (sin redirigir).");
        } catch (e: any) {
          pushLog("PENDIENTE_CHECK_PREAPPROVAL_STATUS_ERROR", { error: String(e) }, "error");
          setUiStatus("error");
          setUiTitle("❌ Error consultando estado de preapproval.");
        }
      }

      // 5) Si llega un estado desconocido, lo dejamos visible
      if (!esPositivo && statusNorm && statusNorm !== "pending" && statusNorm !== "in_process") {
        pushLog("ESTADO_NO_RECONOCIDO", { statusNorm }, "warn");
        setUiStatus("warn");
        setUiTitle(`⚠️ Estado no reconocido por el cliente: "${statusNorm}" (no se redirige).`);
        // window.location.href = "/"; // ← deshabilitado
      }
    }

    procesarBackUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─────────────────────────────────────────────────────────────
  // UI helpers
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

  async function copiarReporte() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      pushLog("CLIPBOARD_OK");
    } catch (e: any) {
      pushLog("CLIPBOARD_ERROR", { error: String(e) }, "warn");
    }
  }

  // Paleta de estilos rápidos (Tailwind-friendly; adaptá a tu setup)
  const tone =
    uiStatus === "ok"
      ? "bg-emerald-950/40 border-emerald-500 text-emerald-100"
      : uiStatus === "warn"
      ? "bg-amber-950/40 border-amber-400 text-amber-100"
      : uiStatus === "error"
      ? "bg-rose-950/40 border-rose-500 text-rose-100"
      : "bg-slate-900/60 border-slate-600 text-slate-100";

  return (
    <div className="mx-auto max-w-3xl p-4 space-y-6">
      {/* Banner de estado visible */}
      <div className={`rounded-xl border p-4 ${tone}`}>
        <h1 className="text-xl font-bold mb-1">
          {uiTitle || "Analizando respuesta de Mercado Pago…"}
        </h1>
        <p className="opacity-80 text-sm">
          Esta pantalla está en <strong>modo diagnóstico</strong>. No hay redirecciones activas; todo lo recibido
          se muestra abajo y también se intenta registrar un log en el servidor.
        </p>
      </div>

      {/* Botón copiar todo */}
      <div className="flex gap-2">
        <button
          onClick={copiarReporte}
          className="rounded-md border px-3 py-1 text-sm hover:bg-white/10"
          title="Copia todo el reporte en el portapapeles"
        >
          Copiar reporte JSON
        </button>
      </div>

      {/* Sección: campos clásicos */}
      <section className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
        <h2 className="font-semibold mb-2">Campos principales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm">
          <div><span className="opacity-70">id_suscriptor:</span> <code>{String(id || "—")}</code></div>
          <div><span className="opacity-70">preapproval_id:</span> <code>{String(preapproval_id || "—")}</code></div>
          <div><span className="opacity-70">status:</span> <code>{String(status || "—")}</code></div>
          <div><span className="opacity-70">payer_email:</span> <code>{String(payer_email || "—")}</code></div>
          <div className="md:col-span-2"><span className="opacity-70">external_reference:</span> <code>{String(external_reference || "—")}</code></div>
        </div>
      </section>

      {/* Sección: parámetros crudos */}
      <section className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
        <h2 className="font-semibold mb-2">Parámetros crudos (querystring)</h2>
        <pre className="text-xs whitespace-pre-wrap break-words">
          {JSON.stringify(allParams, null, 2)}
        </pre>
      </section>

      {/* Sección: entorno */}
      <section className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
        <h2 className="font-semibold mb-2">Entorno/URL</h2>
        <pre className="text-xs whitespace-pre-wrap break-words">
          {JSON.stringify(envSnapshot, null, 2)}
        </pre>
      </section>

      {/* Sección: timeline / acciones realizadas */}
      <section className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
        <h2 className="font-semibold mb-2">Acciones y logs (timeline)</h2>
        {logs.length === 0 ? (
          <p className="text-sm opacity-70">Sin registros aún…</p>
        ) : (
          <ul className="space-y-2 text-xs">
            {logs.map((l, i) => (
              <li
                key={i}
                className={`rounded-md border p-2 ${
                  l.level === "error"
                    ? "border-rose-500/60 bg-rose-950/30"
                    : l.level === "warn"
                    ? "border-amber-400/60 bg-amber-950/30"
                    : "border-slate-600/60 bg-slate-950/30"
                }`}
              >
                <div className="font-mono text-[11px] opacity-80">{l.step}</div>
                {l.data && (
                  <pre className="mt-1 whitespace-pre-wrap break-words">
                    {JSON.stringify(l.data, null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="opacity-60 text-xs">
        Modo diagnóstico activo: <strong>sin redirecciones</strong>. Descomentar en el código si
        querés volver a habilitarlas.
      </footer>
    </div>
  );
}
