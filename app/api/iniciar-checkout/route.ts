// ============================================================
// === Archivo: app/api/iniciar-checkout/route.ts
// === Descripción: API Route unificada (Serverless Function)
// ===              para manejar el proceso de checkout completo.
// ===              1. Recibe datos del formulario del frontend.
// ===              2. Llama a EF para alta/update inicial del suscriptor (captura de lead).
// ===              3. Llama a EF para crear la intención de pago en Mercado Pago.
// ===              4. Devuelve la URL de pago (init_point) al cliente.
// ============================================================
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { UAParser } from 'ua-parser-js'; // Asegúrate de tener 'ua-parser-js' instalado: npm i ua-parser-js

// ===========================================
// === CONFIGURACIÓN Y CONSTANTES ===
// ===========================================

// Campos obligatorios que DEBEN venir del formulario para iniciar el proceso.
const REQUIRED_FIELDS = [
  'nombre',
  'telefono', // Teléfono local normalizado
  'signo',
  'contenido_preferido',
  'whatsapp', // Teléfono internacional (E.164) para comunicaciones
  'acepto_politicas', // Consentimiento legal explícito
] as const;

// Flag para logs detallados en Vercel. Útil para dev y debugging.
const DEBUG_LOGS = true;

// ===========================================
// === HANDLER PRINCIPAL (POST) ===
// ===========================================
export async function POST(req: Request) {
  const funcion = 'api_iniciar_checkout'; // Etiqueta para logs
  if (DEBUG_LOGS) console.log(`🚀 [${funcion}] Inicio del proceso de checkout.`);

  try {
    // ----------------------------------------------------------------
    // 1. Parseo y Validación Inicial del Request
    // ----------------------------------------------------------------
    const body = await req.json().catch(() => null);

    // Validación fail-fast: Si no hay JSON, abortamos.
    if (!body) {
      console.error(`❌ [${funcion}] Body vacío o inválido.`);
      return NextResponse.json({ resultado: 'error', mensaje: 'Datos no recibidos' }, { status: 400 });
    }

    if (DEBUG_LOGS) console.log(`🔍 [${funcion}] Datos recibidos del front:`, body);

    // Verificación de campos requeridos.
    for (const field of REQUIRED_FIELDS) {
      // Chequeo robusto: no debe ser undefined, null, ni string vacío.
      // Excepción: 'acepto_politicas' se valida específicamente después.
      if (body[field] === undefined || body[field] === null || (typeof body[field] === 'string' && body[field].trim() === '')) {
        // Si es 'acepto_politicas' y es false, dejamos que pase aquí para validarlo con mensaje específico abajo.
        if (field === 'acepto_politicas' && body[field] === false) continue;

        console.error(`❌ [${funcion}] Campo faltante o inválido: ${field}`);
        return NextResponse.json({ resultado: 'error', mensaje: `Falta completar: ${field}` }, { status: 400 });
      }
    }

    // Validación legal explícita.
    if (body.acepto_politicas !== true) {
      return NextResponse.json({ resultado: 'error', mensaje: 'Debes aceptar las políticas de privacidad para continuar.' }, { status: 400 });
    }

    // ----------------------------------------------------------------
    // 2. Configuración de Entorno y Metadatos
    // ----------------------------------------------------------------
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // ¡Usar Service Role para permisos de escritura!

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error(`❌ [${funcion}] Error crítico: Faltan variables de entorno de Supabase.`);
      return NextResponse.json({ resultado: 'error', mensaje: 'Error interno de configuración' }, { status: 500 });
    }

    const EDGE_BASE_URL = `${SUPABASE_URL}/functions/v1`;

    // Captura de metadatos para trazabilidad legal (IP, User Agent).
    const headersList = headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 'Unknown IP';
    const rawUA = headersList.get('user-agent') || '';
    const uaParser = new UAParser(rawUA);
    const ua = uaParser.getResult();
    const userAgentLimpio = `${ua.browser.name || ''} ${ua.browser.version || ''} (${ua.os.name || ''} ${ua.os.version || ''})`.trim() || rawUA;
    const fechaConsentimiento = new Date().toISOString();

    // ----------------------------------------------------------------
    // 3. PASO A: Llamada a EF 'ef_alta_suscriptor_premium' (Captura Lead)
    // ----------------------------------------------------------------
    // Objetivo: Registrar al usuario INMEDIATAMENTE, antes de cualquier intento de pago.
    const urlAlta = `${EDGE_BASE_URL}/ef_alta_suscriptor_premium`;
    const payloadAlta = {
      ...body, // Pasamos todo lo que vino del front
      ip_consentimiento: ip,
      user_agent: userAgentLimpio,
      fecha_consentimiento: fechaConsentimiento,
      medio_consentimiento: body.fuente || 'web-checkout', // Trazabilidad del origen
      tipo_suscripcion: 'premium' // Fijo para este funnel
    };

    // Limpieza: quitamos campos que NO corresponden al alta del usuario.
    delete (payloadAlta as any).monto;
    delete (payloadAlta as any).moneda;

    if (DEBUG_LOGS) console.log(`🌐 [${funcion}] Contactando EF Alta: ${urlAlta}`);

    const resAlta = await fetch(urlAlta, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify(payloadAlta),
      cache: 'no-store'
    });

    if (!resAlta.ok) {
      const errorDetail = await resAlta.text().catch(() => 'Sin detalle');
      console.error(`❌ [${funcion}] Falló EF Alta (${resAlta.status}): ${errorDetail}`);
      return NextResponse.json({ resultado: 'error', mensaje: 'No se pudo registrar el usuario. Intenta nuevamente.' }, { status: 502 });
    }

    const dataAlta = await resAlta.json();
    const idSuscriptor = dataAlta?.id_suscriptor; // ¡Dato CRÍTICO para el siguiente paso!

    if (!idSuscriptor) {
      console.error(`❌ [${funcion}] EF Alta no devolvió 'id_suscriptor'. Respuesta:`, dataAlta);
      return NextResponse.json({ resultado: 'error', mensaje: 'Error interno al procesar el registro.' }, { status: 500 });
    }

    if (DEBUG_LOGS) console.log(`✅ [${funcion}] Lead capturado. ID Suscriptor: ${idSuscriptor}`);

    // ----------------------------------------------------------------
    // 4. PASO B: Llamada a EF 'ef_crear_suscripcion' (Inicio Pago MP)
    // ----------------------------------------------------------------
    // Objetivo: Obtener el link de pago de Mercado Pago para este usuario.
    const urlSuscripcion = `${EDGE_BASE_URL}/ef_crear_suscripcion`;

    // Payload ROBUSTO: Enviamos TODO lo necesario para que la EF trabaje sin problemas.
    const payloadSuscripcion = {
      id_suscriptor: idSuscriptor,  // Vinculación fundamental
      whatsapp: body.whatsapp,      // Necesario para buzón sintético si falta email
      email: body.email,            // Email real si el usuario lo dio (opcional pero recomendado)
      nombre: body.nombre,          // Para personalizar la experiencia en MP si se usa
      monto: body.monto,            // (Opcional) La EF suele usar su propia ENV, pero lo pasamos por si acaso.
      moneda: body.moneda,          // Igual que monto.
      // Metadatos extra para logs o validaciones futuras en la EF
      telefono: body.telefono,
      signo: body.signo,
      contenido_preferido: body.contenido_preferido
    };

    if (DEBUG_LOGS) console.log(`🌐 [${funcion}] Contactando EF Suscripción MP: ${urlSuscripcion}`, payloadSuscripcion);

    const resSuscripcion = await fetch(urlSuscripcion, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify(payloadSuscripcion),
      cache: 'no-store'
    });

    // Manejo detallado de errores de la EF de suscripción (vital para debuggear MP).
    if (!resSuscripcion.ok) {
      let errorData;
      try {
        errorData = await resSuscripcion.json();
      } catch {
        errorData = { detail: await resSuscripcion.text() };
      }
      console.error(`❌ [${funcion}] Falló EF Suscripción (${resSuscripcion.status}):`, JSON.stringify(errorData));

      // Devolvemos un error genérico al usuario, pero logueamos el detalle técnico arriba.
      return NextResponse.json({
        resultado: 'error',
        mensaje: 'Hubo un problema al conectar con el proveedor de pagos. Por favor, intenta de nuevo en unos momentos.'
      }, { status: 502 });
    }

    const dataSuscripcion = await resSuscripcion.json();

    // Verificación final: ¿Recibimos el link de pago?
    if (!dataSuscripcion?.init_point) {
       console.error(`❌ [${funcion}] EF Suscripción OK, pero falta 'init_point'. Respuesta:`, dataSuscripcion);
       return NextResponse.json({ resultado: 'error', mensaje: 'No se pudo generar el link de pago.' }, { status: 500 });
    }

    if (DEBUG_LOGS) console.log(`🎉 [${funcion}] ¡Éxito! Link de pago obtenido:`, dataSuscripcion.init_point);

    // ----------------------------------------------------------------
    // 5. Respuesta Final Exitosa al Frontend
    // ----------------------------------------------------------------
    // Devolvemos exactamente lo que necesita el front para redirigir.
    return NextResponse.json({
        resultado: 'ok',
        init_point: dataSuscripcion.init_point, // La URL mágica para redirigir
        id_suscriptor: idSuscriptor // Útil si el front quiere guardar algo localmente
    }, { status: 200 });

  } catch (error: any) {
    // Catch-all para errores no previstos (bugs de código, timeouts extremos, etc.)
    console.error(`🔥 [${funcion}] Excepción no manejada:`, error);
    return NextResponse.json({
        resultado: 'error',
        mensaje: 'Ocurrió un error inesperado. Nuestro equipo ya fue notificado.'
    }, { status: 500 });
  }
}

// ===========================================
// === HEALTH CHECK (GET) ===
// ===========================================
export async function GET() {
  return NextResponse.json({ status: 'online', service: 'api_iniciar_checkout' });
}