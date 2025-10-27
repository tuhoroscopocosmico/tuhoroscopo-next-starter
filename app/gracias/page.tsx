// gracias>page.tsx

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import GraciasContent from "./GraciasContent";

export default function GraciasPage() {
  return (
    <div
      className="w-full min-h-screen"
      style={{
        // Re-usamos el fondo cósmico del resto del sitio
        backgroundImage: "url('/bg-stars.svg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Suspense
        fallback={
          <div className="text-center text-white py-16 text-lg">
            Cargando...
          </div>
        }
      >
        <GraciasContent />
      </Suspense>
    </div>
  );
}