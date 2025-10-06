export const dynamic = "force-dynamic";

import { Suspense } from "react";
import RegistroContent from "./RegistroContent";

export default function RegistroPage() {
  return (
    <Suspense fallback={<div className="text-center text-white py-16">Cargando...</div>}>
      <RegistroContent />
    </Suspense>
  );
}
