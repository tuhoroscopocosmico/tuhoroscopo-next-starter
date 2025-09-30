// app/api/crear-pago-inicial/route.ts
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // 👉 Ajustá con tu URL de Supabase
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const url = `${SUPABASE_URL}/functions/v1/ef_alta_pago_unico`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // ⚠️ NO uses service_role aquí. Tu EF ya usa su propia service_role internamente.
      body: JSON.stringify(body),
    });

    const data = await r.json().catch(() => ({}));
    return new Response(JSON.stringify(data), {
      status: r.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "internal", detalle: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
