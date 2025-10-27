// ============================================================
// === Archivo: components/CTAButton.tsx
// === Descripción: Componente reutilizable para botones de llamada a la acción (Links).
// ===              Modificado para aceptar 'text' en lugar de 'children'.
// ============================================================
import Link, { type LinkProps } from "next/link";
import clsx from "clsx";
import type { Route } from "next";

// Define las props que acepta el componente
type CTAButtonProps = {
  href: Route | string; // Soporta rutas internas tipadas y URLs externas
  text: string;         // *** CAMBIO: Ahora espera 'text' en lugar de 'children' ***
  className?: string;   // className opcional para estilos adicionales
};

export function CTAButton({ href, text, className }: CTAButtonProps) {
  // Determina si el enlace es externo (empieza con http)
  const isExternal = typeof href === "string" && href.startsWith("http");

  // Clases base para el botón
  const baseClasses = "btn-cta w-full sm:w-auto text-center inline-block px-8 py-3 rounded-xl font-semibold transition duration-300 ease-in-out"; // Añadidas clases base ejemplo

  // Clases específicas de estilo (ajusta según tu diseño)
  const styleClasses = "bg-gradient-to-r from-amber-400 to-pink-400 text-violet-900 shadow-lg hover:from-amber-300 hover:to-pink-300 hover:scale-[1.03]";


  if (isExternal) {
    // 🔗 Renderiza como <a> para links externos
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        // Combina clases base, estilo y las recibidas por props
        className={clsx(baseClasses, styleClasses, className)}
      >
        {/* *** CAMBIO: Muestra el contenido de la prop 'text' *** */}
        {text}
      </a>
    );
  }

  // 🌀 Renderiza como <Link> para links internos
  return (
    <Link
      href={href as Route} // Casteo a Route para links internos
      // Combina clases base, estilo y las recibidas por props
      className={clsx(baseClasses, styleClasses, className)}
    >
      {/* *** CAMBIO: Muestra el contenido de la prop 'text' *** */}
      {text}
    </Link>
  );
}

// Nota: Asegúrate de tener las clases 'btn-cta' definidas globalmente
// o reemplaza `baseClasses` y `styleClasses` con las clases de Tailwind
// que definen la apariencia base y de estilo de tu botón.