import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { id_suscriptor, preapproval_id } = await req.json();

    if (!id_suscriptor || !preapproval_id) {
      return NextResponse.json(
        { ok: false, error: "Faltan parámetros requeridos" },
        { status: 400 }
      );
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { ok: false, error: "Faltan variables de entorno" },
        { status: 500 }
      );
    }

    // Actualizar el suscriptor a estado provisional premium
    const updateBody = {
      estado_suscripcion: "activa_provisional",
      premium_activo: true,
      premium_pendiente_confirmacion: true,
      preapproval_id,
      preapproval_status: "authorized",
      fecha_inicio_premium: new Date().toISOString(),
      fecha_vencimiento_premium: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      preapproval_actualizado_en: new Date().toISOString(),
      auto_renovacion_activa: true,
    };

    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/suscriptores?id=eq.${id_suscriptor}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify(updateBody),
      }
    );

    if (!r.ok) {
      const err = await r.text();
      console.error("Error actualizando suscriptor:", err);
      return NextResponse.json({ ok: false, error: "Error en Supabase" });
    }

    const data = await r.json();

    // Registrar log de función
    await fetch(`${SUPABASE_URL}/rest/v1/log_funciones`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify([
        {
          nombre_funcion: "activar-premium-provisorio",
          resultado: "OK",
          detalle: { id_suscriptor, preapproval_id },
          exito: true,
          creado_por: "backurl",
        },
      ]),
    });

    return NextResponse.json({ ok: true, data });
  } catch (e) {
    console.error("❌ Error activar-premium-provisorio:", e);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
