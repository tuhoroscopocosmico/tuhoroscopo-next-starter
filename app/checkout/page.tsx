// ============================================================
// === Archivo: app/checkout/page.tsx
// === Descripción: Página principal (Server Component) para
// === el flujo de checkout unificado.
// ===
// === NOTA: Este es el "Server Component Shell" o "Contenedor".
// === Su único trabajo es cargar el fondo (si aplica) y
// === "Suspender" el componente cliente que hace el trabajo.
// ============================================================

// --- Importaciones ---

// CheckoutContent es tu componente cliente (el que tiene "use client")
// y que (asumimos) usa el hook 'useSearchParams'.
import CheckoutContent from './CheckoutContent';

// Suspense es NECESARIO para que Next.js/Vercel pueda
// pre-renderizar la página (el "fallback") en el servidor,
// y dejar que el componente cliente (CheckoutContent)
// se cargue después en el navegador.
import { Suspense } from "react";

// --- Componente de Carga (Fallback) ---
//
// Esta es una MEJORA CRÍTICA.
// Vercel (durante el 'build') necesita algo que mostrar
// mientras el componente cliente (<CheckoutContent>) aún no se ha cargado.
// Este es el "fallback" que <Suspense> usará.
// Debe ser un componente simple, sin hooks de cliente.
//
function LoadingCheckoutFallback() {
  return (
    <div className="flex justify-center items-center min-h-screen text-white text-lg">
      {/* Este texto se mostrará brevemente mientras 
        el navegador carga el Javascript de CheckoutContent.
      */}
      Cargando checkout...
    </div>
  );
}

// --- Página Principal (Server Component) ---
export default function CheckoutPage() {
  // Puedes agregar Metadata aquí si lo necesitas
  // export const metadata = { title: 'Completa tu Suscripción' };

  // --- Renderizado de la Página ---
  return (
    <div 
      className="w-full min-h-screen"
      style={{
        // Re-usamos el fondo cósmico que definimos para 'gracias'
        // Es una buena práctica de UX mantener la consistencia visual
        // en todo el flujo de pago.
        backgroundImage: "url('/bg-stars.svg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* ¡ESTA ES LA CORRECCIÓN VITAL!
        
        El error de Vercel (useSearchParams) ocurre porque
        Vercel intenta "pre-renderizar" estáticamente esta página en el servidor.
        Pero <CheckoutContent> usa 'useSearchParams', que SÓLO funciona
        en el navegador del cliente (porque necesita leer la URL).

        Al envolver <CheckoutContent> en <Suspense>, le decimos a Next.js:
        
        1. "No intentes renderizar <CheckoutContent> en el servidor".
        2. "En su lugar, renderiza el 'fallback' (nuestro <LoadingCheckoutFallback />)".
        3. "Cuando la página se cargue en el NAVEGADOR del cliente,
           React se encargará de cargar <CheckoutContent> dinámicamente."
        
        Esto SOLUCIONA el error de 'build' de Vercel.
      */}
      <Suspense fallback={<LoadingCheckoutFallback />}>
        {/* Ahora CheckoutContent (el Client Component) se cargará 
          de forma segura en el lado del cliente.
        */}
        <CheckoutContent />
      </Suspense>
    </div>
  );
}