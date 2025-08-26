"use client";
import { useEffect, useState } from "react";

interface LeadData {
  nombre: string;
  signo: string;
  preferencia: string;
  whatsapp: string;
}

export default function PeriodoSuscripcionPage() {
  const [lead, setLead] = useState<LeadData | null>(null);

  useEffect(() => {
    const data = localStorage.getItem("leadData");
    if (data) {
      setLead(JSON.parse(data));
    }
  }, []);

  if (!lead) {
    return <p className="text-center mt-10">No encontramos tus datos. Volvé al inicio 🚀</p>;
  }

  return (
    <div className="mx-auto max-w-2xl p-6 text-center">
      <h1 className="text-2xl font-bold mb-6">Confirmá tus datos</h1>
      
      <div className="space-y-4 bg-white/10 p-6 rounded-2xl shadow-lg">
        <p><strong>Nombre:</strong> {lead.nombre}</p>
        <p><strong>Signo:</strong> {lead.signo}</p>
        <p><strong>Preferencia:</strong> {lead.preferencia}</p>
        <p><strong>WhatsApp:</strong> {lead.whatsapp}</p>
      </div>

      <button
        className="mt-8 w-full rounded-2xl bg-gradient-to-r from-amber-400 to-pink-400 px-6 py-3 font-semibold text-violet-900 shadow-lg hover:from-amber-300 hover:to-pink-300"
        onClick={() => alert("👉 Acá va la integración con Mercado Pago")}
      >
        Continuar al pago
      </button>
    </div>
  );
}
