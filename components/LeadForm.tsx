// ============================================================
// === Archivo: components/LeadFormFields.tsx
// === Descripción: Componente "tonto" que renderiza los campos
// === del formulario, con estilos ajustados para mayor fidelidad.
// ============================================================
'use client';

import React from 'react';
import { Sparkles, Bot, Phone, ChevronDown } from 'lucide-react';

interface FormData {
  name: string;
  signo: string;
  contenidoPreferido: string;
  whatsapp: string;
}

interface LeadFormFieldsProps {
  formData: FormData;
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  isLoading: boolean;
}

const signosZodiacales = [
  'Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo',
  'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis'
];

const contenidoOpciones = [
 { value: 'amor', label: 'Amor y Relaciones' },
 { value: 'carrera', label: 'Carrera y Finanzas' },
 { value: 'bienestar', label: 'Bienestar y Crecimiento Personal' },
 { value: 'todo', label: '¡Todo!' },
 // { value: 'general', label: 'General (un poco de todo)' }, // Descomenta si necesitas esta opción
];


export default function LeadFormFields({
  formData,
  handleInputChange,
  isLoading,
}: LeadFormFieldsProps) {

  // Clases base para inputs y selects, buscando el estilo de image_7f32e5.png
  const inputBaseClasses = "w-full py-3 bg-[#2c2347] border border-transparent rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-1 focus:ring-purple-400 focus:border-purple-400 disabled:opacity-50";
  const selectBaseClasses = `${inputBaseClasses} appearance-none`; // Añade appearance-none para selects

  return (
    <div className="space-y-5">
      {/* Campo Nombre */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-white/80 mb-1">
          Nombre
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          disabled={isLoading}
          required
          placeholder="Tu nombre"
          // Aplica clases base + padding específico
          className={`${inputBaseClasses} px-4`}
        />
      </div>

      {/* Campo Signo Zodiacal */}
      <div className="relative">
        <label htmlFor="signo" className="block text-sm font-medium text-white/80 mb-1">
          Tu signo
        </label>
         <Sparkles className="absolute left-3 top-9 h-5 w-5 text-white/50 pointer-events-none z-10" />
        <select
          id="signo"
          name="signo"
          value={formData.signo}
          onChange={handleInputChange}
          disabled={isLoading}
          required
          // Aplica clases base + padding específico + padding derecho para flecha
          className={`${selectBaseClasses} pl-10 pr-10`}
        >
          <option value="" disabled>Seleccioná tu signo</option>
          {signosZodiacales.map(signo => (
            <option key={signo} value={signo}>{signo}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-9 h-5 w-5 text-white/50 pointer-events-none" />
      </div>

       {/* Campo Contenido Preferido */}
       <div className="relative">
        <label htmlFor="contenidoPreferido" className="block text-sm font-medium text-white/80 mb-1">
          Contenido preferido
        </label>
         <Bot className="absolute left-3 top-9 h-5 w-5 text-white/50 pointer-events-none z-10" />
        <select
          id="contenidoPreferido"
          name="contenidoPreferido"
          value={formData.contenidoPreferido}
          onChange={handleInputChange}
          disabled={isLoading}
          required
          // Aplica clases base + padding específico + padding derecho para flecha
           className={`${selectBaseClasses} pl-10 pr-10`}
        >
          <option value="" disabled>Selecciona una opción...</option>
           {contenidoOpciones.map(opcion => (
            <option key={opcion.value} value={opcion.value}>{opcion.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-9 h-5 w-5 text-white/50 pointer-events-none" />
      </div>

      {/* Campo WhatsApp */}
      <div className="relative">
        <label htmlFor="whatsapp" className="block text-sm font-medium text-white/80 mb-1">
          Número de WhatsApp (celular)
        </label>
        {/* Contenedor para prefijo e ícono */}
        <div className="absolute left-3 top-9 flex items-center space-x-2 pointer-events-none z-10">
           <span className="text-white/50">+598</span>
           <Phone className="h-5 w-5 text-white/50" />
        </div>
        <input
          type="tel"
          id="whatsapp"
          name="whatsapp"
          value={formData.whatsapp}
          onChange={handleInputChange}
          disabled={isLoading}
          required
          placeholder="09XXXXXXX"
          pattern="09\d{7}"
          title="Ingresa tu celular uruguayo sin el +598 (ej: 091234567)"
          // Aplica clases base + padding izquierdo mayor + padding derecho estándar
          className={`${inputBaseClasses} pl-[85px] pr-4`} // Ajusta pl-[85px] si es necesario
        />
        <p className="mt-1 text-xs text-white/60">Recibirás los mensajes premium en este número.</p>
      </div>
    </div>
  );
}

