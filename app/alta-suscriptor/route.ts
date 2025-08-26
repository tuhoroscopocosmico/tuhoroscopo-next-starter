import { NextResponse } from "next/server";

const REQUIRED = ["nombre", "telefono", "signo", "contenido_preferido"] as const;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ✅ Validaciones mínimas
    for (const k of REQUIRED) {
      if (!body?.[k]) {
        return NextResponse.json(
          { resultado: "error", mensaje: `Falta ${k}` },
          { status: 400 }
        );
      }
    }

    // 🔑 Variables de entorno
    const EDGE_BASE = process.env.NEXT_PUBLIC_EDGE_BASE;
    const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!EDGE_BASE || !SRK) {
      return NextResponse.json(
        { resultado: "error", mensaje: "Faltan variables de entorno" },
        { status: 500 }
      );
    }

    // URL de la función en Supabase
    const url = `${EDGE_BASE}/ef_alta_suscriptor_premium`;

    // 🔒 Llamada server→server con Service Role Key
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SRK}`, // 👈 solo aquí viaja la clave secreta
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json(
      { resultado: "error", mensaje: "Fallo en el proxy" },
      { status: 500 }
    );
  }
}

// Healthcheck
export async function GET() {
  return NextResponse.json({ ok: true });
}
