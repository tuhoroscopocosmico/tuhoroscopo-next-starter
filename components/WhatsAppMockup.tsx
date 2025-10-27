// ============================================================
// === Archivo: components/WhatsAppMockup.tsx
// === Descripción: Componente visual que simula una pantalla
// ===              de smartphone mostrando un mensaje de WhatsApp de ejemplo.
// ============================================================
'use client';

import { Play } from 'lucide-react'; // Ícono para el reproductor de audio

export default function WhatsAppMockup() {
  return (
    // Contenedor principal del mockup de teléfono
    <div className="w-full max-w-xs mx-auto bg-gray-900 border-4 border-gray-700 rounded-[2.5rem] shadow-lg overflow-hidden">
      <div className="relative h-[480px] bg-gradient-to-b from-[#075E54] to-[#128C7E] p-3"> {/* Fondo tipo WhatsApp */}
        {/* Notch/Barra superior simulada */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-5 bg-gray-900 rounded-b-lg"></div>

        {/* Contenido del chat */}
        <div className="mt-8 space-y-3">
            {/* Mensaje de Bienvenida o Info */}
            <div className="bg-yellow-100/80 text-center text-xs text-yellow-900 rounded-lg p-1.5 mx-4 shadow-sm">
                Mensajes cifrados de extremo a extremo.
            </div>

             {/* Burbuja de mensaje de "Tu Horóscopo Cósmico" */}
            <div className="flex justify-start">
                <div className="bg-white rounded-lg rounded-tl-none p-3 max-w-[80%] shadow-md">
                   <p className="text-sm text-gray-800 leading-snug">
                       ¡Buen día, Leo! ☀️ Tu energía hoy está radiante. Es un gran momento para enfocarte en ese proyecto creativo. Escuchá tu audio para más detalles 👇
                   </p>
                   {/* Reproductor de audio simulado */}
                   <div className="mt-2 flex items-center bg-gray-100 rounded-lg p-2 border border-gray-200">
                        <button className="bg-teal-500 text-white rounded-full p-1.5 mr-2 focus:outline-none focus:ring-2 focus:ring-teal-400">
                            <Play size={16} fill="white"/>
                        </button>
                        <div className="flex-grow h-1 bg-gray-300 rounded-full relative">
                            <div className="absolute left-0 top-0 h-1 w-1/3 bg-teal-500 rounded-full"></div> {/* Progreso */}
                            <div className="absolute left-1/3 top-1/2 transform -translate-y-1/2 h-2.5 w-2.5 bg-teal-600 rounded-full"></div> {/* Cabezal */}
                        </div>
                        <span className="text-xs text-gray-500 ml-2 font-mono">0:45</span>
                   </div>
                   <p className="text-right text-[10px] text-gray-500/70 mt-1">10:05 AM ✓✓</p> {/* Hora y doble check azul */}
                </div>
            </div>

            {/* Placeholder para un posible mensaje del usuario (opcional) */}
            {/* <div className="flex justify-end">
                <div className="bg-[#DCF8C6] rounded-lg rounded-tr-none p-2 max-w-[70%] shadow-sm">
                   <p className="text-sm text-gray-800">¡Gracias!</p>
                   <p className="text-right text-[10px] text-gray-500/70 mt-0.5">10:06 AM ✓✓</p>
                </div>
            </div> */}

        </div>
      </div>
       {/* Botón Home simulado */}
       <div className="h-8 bg-gray-900 flex items-center justify-center">
         <div className="w-16 h-1 bg-gray-600 rounded-full"></div>
       </div>
    </div>
  );
}
