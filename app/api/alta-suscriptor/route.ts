import { NextResponse } from "next/server";

const REQUIRED = ["nombre", "telefono", "signo", "contenido_preferido"] as const;

// 🔹 Flags de entorno
const DES = false; // true = payload de prueba
const DEBUG_LOGS = true; // true = log en consola

export async function POST(req: Request) {
  try {
    let body = await req.json().catch(() => null);

    // Si estamos en modo prueba, machacamos el body
    if (DES) {
      body = {
        nombre: "Juan Pérez",
        telefono: "98122322",
        signo: "Aries",
        contenido_preferido: "amor",
      };
      if (DEBUG_LOGS) console.log("🧪 [API] Payload forzado en modo prueba:", body);
    } else {
      if (DEBUG_LOGS) console.log("🔍 [API] Body recibido en /alta-suscriptor:", body);
    }

    // Validación rápida antes de llamar a Supabase
    for (const k of REQUIRED) {
      if (!body?.[k]) {
        console.error("❌ Falta campo obligatorio:", k, "Body:", body);
        return NextResponse.json(
          { resultado: "error", mensaje: `Falta ${k}` },
          { status: 400 }
        );
      }
    }

    const EDGE_BASE = process.env.NEXT_PUBLIC_EDGE_BASE;
    const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!EDGE_BASE || !SRK) {
      console.error("❌ Variables de entorno faltantes:", {
        EDGE_BASE,
        SRK: SRK ? "OK" : "MISSING",
      });
      return NextResponse.json(
        { resultado: "error", mensaje: "Faltan variables de entorno" },
        { status: 500 }
      );
    }

    // 📌 Captura de datos de consentimiento
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || "0.0.0.0";

    const userAgent = req.headers.get("user-agent") || "desconocido";
    const fechaConsentimiento = new Date().toISOString();

    // Fusionamos body con campos de cumplimiento
    const payload = {
      ...body,
      acepto_politicas: true,
      version_politica: body?.version_politica || "v1.0",
      medio_consentimiento: body?.fuente || "web-form",
      ip_consentimiento: ip,
      user_agent: userAgent,
      fecha_consentimiento: fechaConsentimiento,
      tipo_suscripcion: "premium", // 🔒 default
    };

    const url = `${EDGE_BASE}/ef_alta_suscriptor_premium`;

    if (DEBUG_LOGS) console.log("🌐 Llamando a Edge Function:", url);
    if (DEBUG_LOGS) console.log("📦 Payload enviado a Edge Function:", payload);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SRK}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (DEBUG_LOGS) console.log("📩 Respuesta de Supabase:", { status: res.status, data });

    // 🟢 Normalización de la respuesta para el frontend
    if (res.ok) {
      return NextResponse.json(
        {
          resultado: data.resultado || "ok",
          mensaje: data.mensaje || "Alta/Update exitoso",
          id_suscriptor: data.id_suscriptor || null, // 👈 siempre devolver id
        },
        { status: 200 }
      );
    }

    if (res.status === 409) {
      // Caso duplicado bloqueante (ej: ya premium activo)
      return NextResponse.json(
        {
          resultado: "duplicado",
          mensaje: data.mensaje || "El número ya está registrado como premium activo",
          id_suscriptor: data.id_suscriptor || null, // 👈 devolver id aunque esté duplicado
        },
        { status: 409 }
      );
    }

    // Otros errores
    return NextResponse.json(
      {
        resultado: "error",
        mensaje: data.mensaje || "Error en el alta",
        id_suscriptor: data.id_suscriptor || null, // 👈 devolver id si existe
      },
      { status: res.status }
    );
  } catch (e: any) {
    console.error("🔥 Error en /api/alta-suscriptor:", e);
    return NextResponse.json(
      { resultado: "error", mensaje: "Fallo en el proxy", detalle: e.message },
      { status: 500 }
    );
  }
}

// Healthcheck
export async function GET() {
  return NextResponse.json({ ok: true });
}
