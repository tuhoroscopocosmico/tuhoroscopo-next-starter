export const dynamic = "force-dynamic";

import { Suspense } from "react";
import GraciasContent from "./GraciasContent";

export default function GraciasPage() {
  return (
    <Suspense fallback={<div className="text-center text-white py-16">Cargando...</div>}>
      <GraciasContent />
    </Suspense>
  );
}
