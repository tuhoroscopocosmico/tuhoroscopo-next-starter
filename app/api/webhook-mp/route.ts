import { NextRequest, NextResponse } from "next/server";

// Webhook MercadoPago (placeholder)
export async function POST(req: NextRequest) {
  return NextResponse.json({ status: "ok", message: "Webhook recibido" });
}