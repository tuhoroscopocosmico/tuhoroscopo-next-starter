// app/registro/RegistroContent.tsx
"use client";

import { useEffect, useState } from "react";
import LeadForm from "@/components/LeadForm";
import Logo from "@/components/logo";

type Initial = {
  nombre?: string;
  signo?: string;
  preferencia?: string;
  whatsapp?: string; // siempre con 0 adelante
};

export default function RegistroContent() {
  const [initial, setInitial] = useState<Initial | undefined>();

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("registro");
      if (!raw) return;

      const r = JSON.parse(raw) as {
        nombre?: string;
        signo?: string;
        contenido_preferido?: string;
        whatsapp?: string;
        whatsappLocal?: string;
      };

      // Si tenemos guardado whatsappLocal (con 0 adelante), usarlo
      if (r.whatsappLocal) {
        setInitial({
          nombre: r.nombre || "",
          signo: r.signo || "",
          preferencia: r.contenido_preferido || "general",
          whatsapp: r.whatsappLocal, // 👈 garantizado con 0
        });
      } else {
        // si no, generamos desde el internacional
        const waDigits = (r.whatsapp || "").replace(/^\+598/, "").replace(/[^\d]/g, "");
        const withZero = waDigits && !waDigits.startsWith("0") ? `0${waDigits}` : waDigits;

        setInitial({
          nombre: r.nombre || "",
          signo: r.signo || "",
          preferencia: r.contenido_preferido || "general",
          whatsapp: withZero || "",
        });
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="container-narrow pb-16">
      {/* Logo arriba del formulario */}
      <div className="flex justify-center mb-8">
        <Logo />
      </div>

      <LeadForm initial={initial} />
    </div>
  );
}
