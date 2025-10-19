// /api/alta-suscriptor/route.ts
import { NextResponse } from "next/server";
import { headers } from 'next/headers'; // Importar para leer cabeceras en App Router

const REQUIRED = ["nombre", "telefono", "signo", "contenido_preferido", "acepto_politicas"] as const; // Añadido acepto_politicas

// 🔹 Flags de entorno
const DES = false;
const DEBUG_LOGS = true;

export async function POST(req: Request) {
  try {
    let body = await req.json().catch(() => null);

    if (DES) {
      body = { nombre: "Juan Pérez", telefono: "98122322", signo: "Aries", contenido_preferido: "amor", acepto_politicas: true, version_politica: "v1.0" }; // Añadido para prueba
      if (DEBUG_LOGS) console.log("🧪 [API] Payload forzado en modo prueba:", body);
    } else {
      if (DEBUG_LOGS) console.log("🔍 [API] Body recibido en /alta-suscriptor:", body);
    }

    // Validación rápida (ahora incluye acepto_politicas)
    for (const k of REQUIRED) {
      // Manejar booleano acepto_politicas que puede ser false
      if (body?.[k] === undefined || body?.[k] === null || body?.[k] === '') {
         // Excepto si es acepto_politicas y es false
         if (k === 'acepto_politicas' && body?.[k] === false) {
             // Es válido que sea false, pero la lógica de negocio puede requerir true
             // Por ahora, asumimos que si llega false, la validación del form falló antes
         } else {
             console.error("❌ Falta campo obligatorio o está vacío:", k, "Body:", body);
             return NextResponse.json(
                 { resultado: "error", mensaje: `Falta ${k}` },
                 { status: 400 }
             );
         }
      }
    }
    // Específicamente validar que acepto_politicas sea true si es requerido
    if (body?.acepto_politicas !== true) {
         console.error("❌ Política no aceptada:", "acepto_politicas:", body?.acepto_politicas);
         return NextResponse.json(
             { resultado: "error", mensaje: `Debe aceptar la política de privacidad` },
             { status: 400 }
         );
    }


    const EDGE_BASE = process.env.NEXT_PUBLIC_EDGE_BASE;
    const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!EDGE_BASE || !SRK) { /* ... (manejo error env) ... */ }

    // 📌 Captura de datos de consentimiento desde Headers (usando next/headers)
    const headersList = headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "0.0.0.0"; // Añadir x-real-ip como fallback
    const userAgent = headersList.get("user-agent") || "desconocido";
    const fechaConsentimiento = new Date().toISOString();

    // Fusionamos body con campos de cumplimiento (CORREGIDO acepto_politicas)
    const payload = {
      ...body,
      acepto_politicas: body?.acepto_politicas ?? false, // <-- USA EL VALOR RECIBIDO
      version_politica: body?.version_politica || "v1.0", // Mantiene default
      medio_consentimiento: body?.fuente || "web-form",   // Mantiene default
      ip_consentimiento: ip,
      user_agent: userAgent,
      fecha_consentimiento: fechaConsentimiento,
      tipo_suscripcion: "premium",
    };

    const url = `${EDGE_BASE}/ef_alta_suscriptor_premium`;

    if (DEBUG_LOGS) console.log("🌐 Llamando a Edge Function:", url);
    if (DEBUG_LOGS) console.log("📦 Payload enviado a Edge Function:", payload);

    const res = await fetch(url, { /* ... (opciones fetch sin cambios) ... */ method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${SRK}` }, body: JSON.stringify(payload), cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (DEBUG_LOGS) console.log("📩 Respuesta de Supabase:", { status: res.status, data });

    // Normalización de respuesta (sin cambios)
    if (res.ok) { return NextResponse.json({ resultado: data.resultado || "ok", mensaje: data.mensaje || "Alta/Update exitoso", id_suscriptor: data.id_suscriptor || null }, { status: 200 }); }
    if (res.status === 409) { return NextResponse.json({ resultado: "duplicado", mensaje: data.mensaje || "El número ya está registrado como premium activo", id_suscriptor: data.id_suscriptor || null }, { status: 409 }); }
    return NextResponse.json({ resultado: "error", mensaje: data.mensaje || "Error en el alta", id_suscriptor: data.id_suscriptor || null }, { status: res.status });

  } catch (e: any) {
    console.error("🔥 Error en /api/alta-suscriptor:", e);
    return NextResponse.json({ resultado: "error", mensaje: "Fallo en el proxy", detalle: e.message }, { status: 500 });
  }
}

// Healthcheck GET (sin cambios)
export async function GET() { return NextResponse.json({ ok: true }); }