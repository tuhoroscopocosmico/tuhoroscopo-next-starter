// ============================================================
// === Archivo: app/checkout/page.tsx
// === Descripción: Página principal (Server Component) para
// === el flujo de checkout unificado.
// ============================================================

import CheckoutContent from './CheckoutContent';
import { Suspense } from "react";

export default function CheckoutPage() {
  // Puedes agregar Metadata aquí si lo necesitas
  // export const metadata = { title: 'Completa tu Suscripción' };

  return (
    <div className="container mx-auto px-4 py-8 md:py-16">
      {/* CheckoutContent es el Client Component que maneja el estado y la interacción */}
      <CheckoutContent />
    </div>
  );
}