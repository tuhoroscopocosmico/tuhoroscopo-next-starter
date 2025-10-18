import { NextResponse } from "next/server";

// === FUNCIONES AUXILIARES ===

/**
 * Calcula la fecha de vencimiento añadiendo un mes exacto a la fecha de inicio.
 * @param startDate - La fecha actual de inicio.
 * @returns La fecha de vencimiento en formato ISO string.
 */
const getFechaVencimientoMensual = (startDate: Date): string => {
  const nextMonth = new Date(startDate);
  // Añade 1 mes a la fecha de inicio
  nextMonth.setMonth(startDate.getMonth() + 1); 
  return nextMonth.toISOString();
};

/**
 * Registra un evento en la tabla log_funciones de Supabase.
 */
async function logFunction(supabaseUrl: string, serviceKey: string, logData: any) {
  try {
    await fetch(`${supabaseUrl}/rest/v1/log_funciones`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify([logData]),
    });
  } catch (error) {
    // Si el log falla, solo imprimimos el error, pero no bloqueamos el flujo principal.
    console.error("Error al registrar log de función:", error); 
  }
}

// === API ROUTE PRINCIPAL ===

export async function POST(req: Request) {
  const currentTimestamp = new Date();
  const logDetails = { creado_por: "backurl" };

  // 1. EXTRAER y VALIDAR Parámetros de Entrada
  try {
    // Se espera que el Frontend envíe el collection_status leído del BackURL de MP.
    const { id_suscriptor, preapproval_id, collection_status } = await req.json();

    if (!id_suscriptor || !preapproval_id || !collection_status) {
      await logFunction(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
          nombre_funcion: "backurl-mp",
          resultado: "ERROR_PARAMS",
          detalle: { error: "Faltan parámetros requeridos", campos_recibidos: { id_suscriptor, preapproval_id, collection_status } },
          exito: false, ...logDetails
      });
      return NextResponse.json(
        { ok: false, error: "Faltan id_suscriptor, preapproval_id o collection_status" },
        { status: 400 }
      );
    }

    // 2. Validar Variables de Entorno
    const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

    if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { ok: false, error: "Faltan variables de entorno de Supabase" },
        { status: 500 }
      );
    }
    
    const supabaseUrl = NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = SUPABASE_SERVICE_ROLE_KEY;
    const isApproved = collection_status === 'approved';

    // 3. Definir Cuerpo de Actualización Condicional (LÓGICA CORREGIDA)
    
    // Estados básicos
    const updateBody: Record<string, any> = {
      // Si fue aprobado, el estado es 'activa', sino 'pendiente_pago' (o 'rechazada').
      estado_suscripcion: isApproved ? "activa" : "pendiente_pago", 
      premium_activo: isApproved, // Solo dar acceso si fue aprobado.
      premium_pendiente_confirmacion: !isApproved, // Si no está aprobado, está pendiente.
      preapproval_id,
      preapproval_status: isApproved ? "authorized" : "pending", 
      preapproval_actualizado_en: currentTimestamp.toISOString(),
      auto_renovacion_activa: isApproved, 
    };
    
    // Si fue aprobado, se establecen las fechas Premium
    if (isApproved) {
        updateBody.fecha_inicio_premium = currentTimestamp.toISOString();
        updateBody.fecha_vencimiento_premium = getFechaVencimientoMensual(currentTimestamp);
    }

    // 4. Ejecutar PATCH en Supabase
    const r = await fetch(
      `${supabaseUrl}/rest/v1/suscriptores?id=eq.${id_suscriptor}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify(updateBody),
      }
    );

    // 5. Manejo de error de Supabase
    if (!r.ok) {
      const err = await r.text();
      console.error("❌ Error actualizando suscriptor en Supabase:", err);
      // Registrar error
      await logFunction(supabaseUrl, serviceKey, {
        nombre_funcion: "backurl-mp-final",
        resultado: "ERROR_DB",
        detalle: { id_suscriptor, preapproval_id, status: collection_status, error: err },
        exito: false, ...logDetails
      });
      return NextResponse.json({ ok: false, error: "Error en Supabase" }, { status: 500 });
    }

    const data = await r.json();

    // 6. Registrar log de función exitoso
    await logFunction(supabaseUrl, serviceKey, {
      nombre_funcion: "backurl-mp-final",
      resultado: isApproved ? "OK_ACTIVACION_FINAL" : "OK_PENDIENTE",
      detalle: { id_suscriptor, preapproval_id, status: collection_status, estado_final: updateBody.estado_suscripcion },
      exito: true, ...logDetails
    });

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error("❌ Error en la ruta backurl-mp-final:", e);
    // Asumimos que si falla aquí, el log no se pudo enviar
    return NextResponse.json({ ok: false, error: "Error interno del servidor" }, { status: 500 });
  }
}