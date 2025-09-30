// app/api/crear-suscripcion/route.ts
import { NextResponse } from 'next/server'

function edgeBase() {
  const base = process.env.NEXT_PUBLIC_EDGE_BASE
    || (process.env.NEXT_PUBLIC_SUPABASE_URL
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/functions/v1`
        : undefined)
  return base
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { id_suscriptor, nombre, whatsapp, signo, contenido_preferido, email } = body || {}

    if (!id_suscriptor && !whatsapp) {
      return NextResponse.json({ error: 'Falta id_suscriptor o whatsapp' }, { status: 400 })
    }

    const EDGE = edgeBase()
    const SRK  = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!EDGE || !SRK) {
      return NextResponse.json({ error: 'Faltan variables EDGE_BASE/SRK' }, { status: 500 })
    }

    const url = `${EDGE}/ef_crear_suscripcion`
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SRK}` },
      body: JSON.stringify({ id_suscriptor, nombre, whatsapp, signo, contenido_preferido, email }),
    })

    const data = await r.json().catch(() => ({}))
    if (!r.ok) {
      console.error('EF error:', { status: r.status, data })
      const msg = data?.error || data?.message || 'Error creando suscripción'
      return NextResponse.json({ error: msg, detalle: data }, { status: r.status === 404 ? 502 : r.status })
    }

    const init_point = data.init_point ?? data.url // soporta ambas variantes
    if (!init_point) {
      return NextResponse.json({ error: 'No se obtuvo init_point' }, { status: 502 })
    }

    return NextResponse.json({
      init_point,
      preapproval_id: data.preapproval_id,
      preference_id: data.preference_id, // por compatibilidad si en algún momento usás checkout
      status: data.status,
    })
  } catch (e) {
    console.error('crear-suscripcion error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
