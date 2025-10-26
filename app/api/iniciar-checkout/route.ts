import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { UAParser } from 'ua-parser-js';

// Campos requeridos del frontend
const REQUIRED_FIELDS = [
  'nombre',
  'telefono',
  'signo',
  'contenido_preferido',
  'acepto_politicas',
] as const;

// Constantes de depuración (ajusta según necesites)
const DEBUG_LOGS = true;

export async function POST(req: Request) {
  const funcion = 'api_iniciar_checkout'; // Nombre para logging
  if (DEBUG_LOGS) console.log(`🚀 [${funcion}] Función POST iniciada.`);

  try {
    const body = await req.json().catch(() => null);
    if (DEBUG_LOGS) console.log(`🔍 [${funcion}] Body recibido:`, body);

    // 1. Validar campos requeridos del frontend
    for (const k of REQUIRED_FIELDS) {
      if (
        body?.[k] === undefined ||
        body?.[k] === null ||
        (typeof body?.[k] === 'string' && body?.[k] === '')
      ) {
        // Excepción: acepto_politicas puede ser false aquí, pero debe ser true para continuar
        if (k !== 'acepto_politicas' || body?.[k] !== false) {
          console.error(
            `❌ [${funcion}] Falta campo obligatorio o está vacío:`,
            k,
            'Body:',
            body
          );
          return NextResponse.json(
            { resultado: 'error', mensaje: `Falta ${k}` },
            { status: 400 }
          );
        }
      }
    }
    if (body?.acepto_politicas !== true) {
      console.error(
        `❌ [${funcion}] Política no aceptada:`,
        'acepto_politicas:',
        body?.acepto_politicas
      );
      return NextResponse.json(
        { resultado: 'error', mensaje: `Debe aceptar la política de privacidad` },
        { status: 400 }
      );
    }

    // 2. Leer variables de entorno (necesarias para ambas llamadas a Edge Functions)
    const SUPABASE_URL_SERVER = process.env.SUPABASE_URL;
    const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL_SERVER || !SRK) {
      console.error(
        `❌ [${funcion}] Variables de entorno del SERVIDOR faltantes`
      );
      return NextResponse.json(
        { resultado: 'error', mensaje: 'Error de configuración del servidor' },
        { status: 500 }
      );
    }
    const EDGE_BASE_URL = `${SUPABASE_URL_SERVER}/functions/v1`;

    // 3. Preparar datos de consentimiento (de alta-suscriptor)
    const headersList = headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const ip =
      forwardedFor?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '0.0.0.0';
    const fechaConsentimiento = new Date().toISOString();
    const rawUserAgent = headersList.get('user-agent') || 'desconocido';
    const parser = new UAParser(rawUserAgent);
    const uaInfo = parser.getResult();
    const userAgentLimpio = `${uaInfo.browser.name || 'N/D'} ${
      uaInfo.browser.version || ''
    } (${uaInfo.os.name || 'N/D'} ${uaInfo.os.version || ''})`;

    // --- LLAMADA 1: Alta Suscriptor ---
    const urlAlta = `${EDGE_BASE_URL}/ef_alta_suscriptor_premium`;
    const payloadAlta = {
      ...body,
      acepto_politicas: body.acepto_politicas,
      version_politicas: body.version_politica || 'v1.0', // Asegurar que backend espera plural
      medio_consentimiento: body.fuente || 'web-checkout-v2', // Fuente actualizada
      ip_consentimiento: ip,
      user_agent: userAgentLimpio,
      fecha_consentimiento: fechaConsentimiento,
      tipo_suscripcion: 'premium',
    };
     // Eliminar claves que no espera la EF de alta (ajustar si es necesario)
    delete (payloadAlta as any).version_politica; // Si pasaste la versión vieja
    delete (payloadAlta as any).monto; // El monto no va al alta
    delete (payloadAlta as any).price; // El price tampoco

    if (DEBUG_LOGS) console.log(`🌐 [${funcion}] Llamando a ${urlAlta}...`);
    if (DEBUG_LOGS) console.log(`📦 [${funcion}] Payload para alta:`, payloadAlta);

    const resAlta = await fetch(urlAlta, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SRK}`,
      },
      body: JSON.stringify(payloadAlta),
      cache: 'no-store',
    });

    let dataAlta;
    if (!resAlta.ok) {
      console.error(`❌ [${funcion}] Error ${resAlta.status} desde ${urlAlta}`);
      try {
        dataAlta = await resAlta.json();
        console.error('Detalle del error (JSON):', dataAlta);
      } catch (e) {
        const errorTexto = await resAlta
          .text()
          .catch(() => 'Respuesta ilegible');
        console.error('Respuesta (no JSON) de Edge Function:', errorTexto);
        dataAlta = {
          resultado: 'error',
          mensaje: 'Error en alta de suscriptor (Edge)',
          detalle: errorTexto,
        };
      }
      return NextResponse.json(dataAlta, { status: resAlta.status || 500 });
    }

    try {
        dataAlta = await resAlta.json();
    } catch (e) {
        console.error(`❌ [${funcion}] Error al parsear JSON de respuesta OK de ${urlAlta}:`, e);
        const errorTexto = await resAlta.text().catch(() => "Respuesta ilegible");
        console.error(`Respuesta (no JSON) de ${urlAlta} (en OK):`, errorTexto);
        return NextResponse.json(
            { resultado: "error", mensaje: "Respuesta OK de alta, pero JSON inválido", detalle: errorTexto },
            { status: 500 }
        );
    }


    if (DEBUG_LOGS)
      console.log(`📩 [${funcion}] Respuesta OK de ${urlAlta}:`, {
        status: resAlta.status,
        data: dataAlta,
      });

    // Extraer id_suscriptor (importante que la EF lo devuelva así)
    const id_suscriptor = dataAlta?.id_suscriptor;
    if (!id_suscriptor) {
      console.error(
        `❌ [${funcion}] ${urlAlta} OK pero no devolvió 'id_suscriptor'. Respuesta:`,
        dataAlta
      );
      return NextResponse.json(
        { resultado: 'error', mensaje: 'ID de suscriptor no recibido.' },
        { status: 500 }
      );
    }

    // --- LLAMADA 2: Crear Suscripción ---
    const urlSuscripcion = `${EDGE_BASE_URL}/ef_crear_suscripcion`;
    const payloadSuscripcion = {
      // Datos que espera ef_crear_suscripcion (basado en tu código anterior)
      id_suscriptor: id_suscriptor,
      monto: 390, // O tomarlo del body si fuera variable: body.monto
      moneda: 'UYU',
      // Pasar datos adicionales si la EF los necesita para MP (ej. email si lo tienes)
      // nombre: body.nombre,
      // whatsapp: body.whatsapp,
      // ...etc
    };

    if (DEBUG_LOGS)
      console.log(`🌐 [${funcion}] Llamando a ${urlSuscripcion}...`);
    if (DEBUG_LOGS)
      console.log(`📦 [${funcion}] Payload para suscripción:`, payloadSuscripcion);

    const resSuscripcion = await fetch(urlSuscripcion, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SRK}`,
      },
      body: JSON.stringify(payloadSuscripcion),
      cache: 'no-store',
    });

    let dataSuscripcion;
    if (!resSuscripcion.ok) {
      console.error(
        `❌ [${funcion}] Error ${resSuscripcion.status} desde ${urlSuscripcion}`
      );
      try {
        dataSuscripcion = await resSuscripcion.json();
        console.error('Detalle del error (JSON):', dataSuscripcion);
      } catch (e) {
        const errorTexto = await resSuscripcion
          .text()
          .catch(() => 'Respuesta ilegible');
        console.error('Respuesta (no JSON) de Edge Function:', errorTexto);
        dataSuscripcion = {
          resultado: 'error',
          mensaje: 'Error al crear suscripción (Edge)',
          detalle: errorTexto,
        };
      }
      // Devolvemos el error específico de la creación de suscripción
      return NextResponse.json(dataSuscripcion, { status: resSuscripcion.status || 500 });
    }

     try {
        dataSuscripcion = await resSuscripcion.json();
    } catch (e) {
        console.error(`❌ [${funcion}] Error al parsear JSON de respuesta OK de ${urlSuscripcion}:`, e);
        const errorTexto = await resSuscripcion.text().catch(() => "Respuesta ilegible");
        console.error(`Respuesta (no JSON) de ${urlSuscripcion} (en OK):`, errorTexto);
        return NextResponse.json(
            { resultado: "error", mensaje: "Respuesta OK de suscripción, pero JSON inválido", detalle: errorTexto },
            { status: 500 }
        );
    }


    if (DEBUG_LOGS)
      console.log(`📩 [${funcion}] Respuesta OK de ${urlSuscripcion}:`, {
        status: resSuscripcion.status,
        data: dataSuscripcion,
      });

    // Devolver la respuesta final (que debe contener init_point)
    // Aseguramos que el status sea 200 aunque la EF devolviera 201 u otro 2xx
    return NextResponse.json(dataSuscripcion, { status: 200 });

  } catch (e: any) {
    console.error(`🔥 [${funcion}] Error en Catch principal:`, e);
    return NextResponse.json(
      { resultado: 'error', mensaje: 'Fallo general en iniciar-checkout', detalle: e.message },
      { status: 500 }
    );
  }
}

// Opcional: Healthcheck GET
export async function GET() {
  return NextResponse.json({ ok: true, message: "Iniciar Checkout endpoint is healthy" });
}
