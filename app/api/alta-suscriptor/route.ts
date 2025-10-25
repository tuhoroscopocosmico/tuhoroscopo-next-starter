// /api/alta-suscriptor/route.ts
import { NextResponse } from "next/server";
import { headers } from 'next/headers';
// ===========================================
// === IMPORTAR LIBRERÍA DE USER AGENT ===
// ===========================================
// Importamos la librería que instalaste para parsear el User Agent
import { UAParser } from 'ua-parser-js';

// ===========================================
// === CAMPOS REQUERIDOS EN EL BODY ===
// ===========================================
const REQUIRED = ["nombre", "telefono", "signo", "contenido_preferido", "acepto_politicas"] as const;

// ===========================================
// === FLAGS DE DEPURACIÓN ===
// ===========================================
const DES = false;
const DEBUG_LOGS = true;

export async function POST(req: Request) {
  // ===========================================
  // === LOG DE INICIO DE FUNCIÓN ===
  // ===========================================
  // (Para depurar error 405 de Vercel)
  if (DEBUG_LOGS) console.log("✅ [API] /api/alta-suscriptor: Función POST iniciada.");
  
  try {
    let body = await req.json().catch(() => null);

    // ===========================================
    // === MODO PRUEBA (DES) ===
    // ===========================================
    if (DES) {
      body = { nombre: "Juan Pérez", telefono: "98122322", signo: "Aries", contenido_preferido: "amor", acepto_politicas: true, version_politica: "v1.0" };
      if (DEBUG_LOGS) console.log("🧪 [API] Payload forzado en modo prueba:", body);
    } else {
      if (DEBUG_LOGS) console.log("🔍 [API] Body recibido en /alta-suscriptor:", body);
    }

    // ===========================================
    // === VALIDACIÓN DE CAMPOS REQUERIDOS ===
    // ===========================================
    for (const k of REQUIRED) { if (body?.[k] === undefined || body?.[k] === null || body?.[k] === '') { if (k === 'acepto_politicas' && body?.[k] === false) {} else { console.error("❌ Falta campo obligatorio o está vacío:", k, "Body:", body); return NextResponse.json( { resultado: "error", mensaje: `Falta ${k}` }, { status: 400 } ); } } }
    if (body?.acepto_politicas !== true) { console.error("❌ Política no aceptada:", "acepto_politicas:", body?.acepto_politicas); return NextResponse.json( { resultado: "error", mensaje: `Debe aceptar la política de privacidad` }, { status: 400 } ); }

    // ===========================================
    // === LECTURA DE VARIABLES DE ENTORNO (Servidor Vercel) ===
    // ===========================================
    const SUPABASE_URL_SERVER = process.env.SUPABASE_URL; // Usamos la variable de servidor
    const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL_SERVER || !SRK) {
        console.error("❌ Variables de entorno del SERVIDOR faltantes:", { SUPABASE_URL: SUPABASE_URL_SERVER ? "OK" : "MISSING", SRK: SRK ? "OK" : "MISSING" });
        return NextResponse.json( { resultado: "error", mensaje: "Faltan variables de entorno del servidor" }, { status: 500 });
    }
    
    const EDGE_BASE_URL = `${SUPABASE_URL_SERVER}/functions/v1`; 

    // ===========================================
    // === CAPTURA Y PARSEO DE DATOS DE CONSENTIMIENTO ===
    // ===========================================
    const headersList = headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "0.0.0.0";
    const fechaConsentimiento = new Date().toISOString();

    // ===========================================
    // === PARSEO PRECISO DE USER AGENT (USANDO LIBRERÍA) ===
    // ===========================================
    // 1. Obtenemos la cadena 'user-agent' genérica de las cabeceras
    const rawUserAgent = headersList.get("user-agent") || "desconocido";
    // 2. Usamos la librería ua-parser-js para analizarla
    const parser = new UAParser(rawUserAgent);
    const uaInfo = parser.getResult();
    // 3. Construimos un string limpio, ej: "Chrome 141.0.0.0 (Windows)"
    const userAgentLimpio = `${uaInfo.browser.name || 'N/D'} ${uaInfo.browser.version || ''} (${uaInfo.os.name || 'N/D'} ${uaInfo.os.version || ''})`;
    // ===========================================

    // ===========================================
    // === ARMADO DE PAYLOAD PARA EDGE FUNCTION ===
    // ===========================================
    const payload = {
      ...body,
      acepto_politicas: body?.acepto_politicas ?? false,
      // --- CORRECCIÓN: Renombrar 'version_politica' a 'version_politicas' ---
      version_politicas: body?.version_politica || "v1.0", // <-- CORREGIDO A PLURAL
      // -----------------------------------------------------------------
      medio_consentimiento: body?.fuente || "web-form",
      ip_consentimiento: ip,
      user_agent: userAgentLimpio, // <-- USAMOS EL STRING LIMPIO
      fecha_consentimiento: fechaConsentimiento,
      tipo_suscripcion: "premium",
    };
    // Eliminamos la clave singular vieja si existía en el body
    delete (payload as any).version_politica; 

    const url = `${EDGE_BASE_URL}/ef_alta_suscriptor_premium`;

    if (DEBUG_LOGS) console.log("🌐 Llamando a Edge Function:", url);
    if (DEBUG_LOGS) console.log("📦 Payload enviado a Edge Function:", payload);

    // ===========================================
    // === LLAMADA (PROXY) A EDGE FUNCTION ===
    // ===========================================
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SRK}` },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    // ===========================================
    // === MANEJO DE RESPUESTA DE EDGE FUNCTION (MEJORADO) ===
    // ===========================================
    let data;
    if (!res.ok) {
        console.error(`❌ Error ${res.status} desde Edge Function:`);
        try {
            data = await res.json();
            console.error("Detalle del error (JSON):", data);
        } catch (e) {
            const errorTexto = await res.text().catch(() => "Respuesta ilegible");
            console.error("Respuesta (no JSON) de Edge Function:", errorTexto);
            data = { resultado: "error", mensaje: "Error en la Edge Function", detalle: errorTexto };
        }
        return NextResponse.json(data, { status: res.status || 500 });
    }

    try { data = await res.json(); } 
    catch (e) {
        console.error("❌ Error al parsear JSON de respuesta OK:", e);
        const errorTexto = await res.text().catch(() => "Respuesta ilegible");
        console.error("Respuesta (no JSON) de Edge Function (en OK):", errorTexto);
        data = { resultado: "error", mensaje: "Respuesta OK pero JSON inválido", detalle: errorTexto };
        return NextResponse.json(data, { status: 500 });
    }

    if (DEBUG_LOGS) console.log("📩 Respuesta de Supabase (OK):", { status: res.status, data });
    return NextResponse.json(data, { status: res.status });

  } catch (e: any) {
    // ===========================================
    // === MANEJO DE ERROR DEL PROXY (CATCH PRINCIPAL) ===
    // ===========================================
    console.error("🔥 Error en /api/alta-suscriptor (Catch principal):", e);
    return NextResponse.json(
      { resultado: "error", mensaje: "Fallo en el proxy", detalle: e.message },
      { status: 500 }
    );
  }
}

// Healthcheck GET
export async function GET() {
  return NextResponse.json({ ok: true });
}
