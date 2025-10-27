// ============================================================
// === Archivo: components/Testimonios.tsx
// === Descripción: Sección de "Prueba Social" con testimonios
// ===              de usuarios (placeholders).
// ============================================================
'use client';

// Ícono opcional para citas
import { Quote } from 'lucide-react';

// Estructura de datos para un testimonio (puedes expandirla)
interface TestimonioData {
  cita: string;
  autor: string;
  contexto?: string; // Ej. Signo zodiacal
}

// Datos de ejemplo (placeholders)
const testimoniosEjemplo: TestimonioData[] = [
  {
    cita: "Me encanta recibir el audio corto cada mañana. Es mucho más profundo que cualquier horóscopo que haya leído antes. ¡Gracias!",
    autor: "Lucía M.",
    contexto: "(Aries)"
  },
  {
    cita: "Al principio dudé, pero ahora no puedo empezar mi día sin él. Los consejos sobre trabajo han sido súper acertados.",
    autor: "Martín R.",
    contexto: "(Capricornio)"
  },
  {
    cita: "La combinación del mensaje escrito y el audio es perfecta. Me ayuda a centrarme y entender mejor la energía del día. ¡Muy recomendado!",
    autor: "Sofía L.",
    contexto: "(Libra)"
  }
];

// Componente para una tarjeta de testimonio individual
function TestimonioCard({ testimonio }: { testimonio: TestimonioData }) {
  return (
    <div className="bg-white/10 border border-white/15 rounded-xl p-6 shadow-lg backdrop-blur-sm relative overflow-hidden">
        {/* Ícono de cita decorativo (opcional) */}
        <Quote className="absolute top-4 right-4 h-12 w-12 text-white/10 transform rotate-12" strokeWidth={1} />
        <blockquote className="text-white/80 italic mb-4 relative z-10">
            "{testimonio.cita}"
        </blockquote>
        <footer className="text-sm text-white relative z-10">
            <span className="font-semibold">{testimonio.autor}</span>
            {testimonio.contexto && <span className="text-white/60 ml-1">{testimonio.contexto}</span>}
        </footer>
    </div>
  );
}

// Componente principal de la sección de testimonios
export default function Testimonios() {
  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-10 md:mb-12">
        Lo que dicen nuestros suscriptores
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {testimoniosEjemplo.map((testimonio, index) => (
          <TestimonioCard key={index} testimonio={testimonio} />
        ))}
      </div>
    </div>
  );
}
