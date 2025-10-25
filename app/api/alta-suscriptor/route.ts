// /api/alta-suscriptor/route.ts
import { NextResponse } from "next/server";
import { headers } from 'next/headers'; // Importar para leer cabeceras en App Router

// ===========================================
// === CAMPOS REQUERIDOS EN EL BODY ===
// ===========================================
// Define los campos que deben venir desde el frontend
const REQUIRED = ["nombre", "telefono", "signo", "contenido_preferido", "acepto_politicas"] as const;

// ===========================================
// === FLAGS DE DEPURACIÓN ===
// ===========================================
const DES = false; // true = payload de prueba
const DEBUG_LOGS = true; // true = log en consola

export async function POST(req: Request) {
  const funcion = "api-alta-suscriptor"; // Nombre para logging
  let supabase; // Cliente de Supabase para logging de errores
  
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
    // === LECTURA DE VARIABLES DE ENTORNO (Servidor Vercel) ===
    // ===========================================
    // Leemos las variables del lado del SERVIDOR (sin NEXT_PUBLIC_)
    // Estas deben estar configuradas en Vercel
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SRK) {
      console.error("❌ Faltan variables de entorno del SERVIDOR: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
      return NextResponse.json( { resultado: "error", mensaje: "Faltan variables de entorno del servidor" }, { status: 500 });
    }
    
    // Construimos la URL base completa de las funciones
    const EDGE_BASE_URL = `${SUPABASE_URL}/functions/v1`; 

    // ===========================================
    // === VALIDACIÓN DE CAMPOS REQUERIDOS ===
    // ===========================================
    // Validamos el body después de tener las ENVs para poder loguear el error a Supabase
    if (!body) {
      return NextResponse.json({ resultado: "error", mensaje: "Body JSON inválido" }, { status: 400 });
    }

    for (const k of REQUIRED) {
      if (body?.[k] === undefined || body?.[k] === null || body?.[k] === '') {
        if (k === 'acepto_politicas' && body?.[k] === false) {
           // Si es 'acepto_politicas' y es false, fallará en la siguiente validación
        } else {
            console.error("❌ Falta campo obligatorio o está vacío:", k, "Body:", body);
            return NextResponse.json( { resultado: "error", mensaje: `Falta ${k}` }, { status: 400 } );
        }
      }
    }
    // Específicamente validar que acepto_politicas sea true
    if (body?.acepto_politicas !== true) {
        console.error("❌ Política no aceptada:", "acepto_politicas:", body?.acepto_politicas);
        return NextResponse.json( { resultado: "error", mensaje: `Debe aceptar la política de privacidad` }, { status: 400 } );
    }

    // ===========================================
    // === CAPTURA DE DATOS DE CONSENTIMIENTO ===
    // ===========================================
    // Capturamos IP y User Agent desde las cabeceras de la petición
    const headersList = headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "0.0.0.0";
    const userAgent = headersList.get("user-agent") || "desconocido";
    const fechaConsentimiento = new Date().toISOString();

    // ===========================================
    // === ARMADO DE PAYLOAD PARA EDGE FUNCTION ===
    // ===========================================
    // Enriquecemos el body del frontend con los datos del servidor
    const payload = {
      ...body,
      acepto_politicas: body?.acepto_politicas ?? false,
      version_politica: body?.version_politica || "v1.0",
      medio_consentimiento: body?.fuente || "web-form",
      ip_consentimiento: ip,
      user_agent: userAgent,
      fecha_consentimiento: fechaConsentimiento,
      tipo_suscripcion: "premium",
    };

    const url = `${EDGE_BASE_URL}/ef_alta_suscriptor_premium`;

    if (DEBUG_LOGS) console.log("🌐 Llamando a Edge Function:", url);
    if (DEBUG_LOGS) console.log("📦 Payload enviado a Edge Function:", payload);

    // ===========================================
    // === LLAMADA (PROXY) A EDGE FUNCTION ===
    // ===========================================
    // Esta API Route actúa como un proxy seguro
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SRK}`, // Autenticación con la Service Key
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    // ===========================================
    // === MANEJO DE RESPUESTA DE EDGE FUNCTION ===
    // ===========================================
    let data;
    // Manejamos el caso donde la Edge Function crashea y devuelve HTML/texto
    try {
        data = await res.json();
    } catch (e) {
        console.error("❌ Error al parsear JSON de Edge Function (probablemente crasheó):", e);
        const errorTexto = await res.text();
        console.error("Respuesta (no JSON) de Edge Function:", errorTexto);
        // Creamos un objeto de error estándar
        data = { resultado: "error", mensaje: "Error en la Edge Function", detalle: errorTexto };
        return NextResponse.json(data, { status: res.status || 500 });
    }

    if (DEBUG_LOGS) console.log("📩 Respuesta de Supabase:", { status: res.status, data });

    // Reenviar la respuesta de la Edge Function (OK, 409, 500, etc.) al frontend
    return NextResponse.json(data, { status: res.status });

  } catch (e: any) {
    // ===========================================
    // === MANEJO DE ERROR DEL PROXY (CATCH PRINCIPAL) ===
    // ===========================================
    console.error("🔥 Error en /api/alta-suscriptor (Catch principal):", e);
    // Este es el error "Fallo en el proxy" que viste (ej. URL inválida)
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
