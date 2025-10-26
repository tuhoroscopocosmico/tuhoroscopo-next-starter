// ============================================================
// === Archivo: app/checkout/CheckoutContent.tsx
// === Descripción: Client Component con diseño unificado ("Tablero Cósmico").
// === Refinamientos: Panel único, títulos simplificados, botón vibrante.
// ============================================================
'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { Loader2 } from 'lucide-react';
import LeadFormFields from '@/components/LeadFormFields';
import SubscriptionSummary from '@/components/SubscriptionSummary';

interface FormData {
  name: string;
  signo: string;
  contenidoPreferido: string;
  whatsapp: string;
}

// Helper para normalizar WhatsApp
function normalizarUY(num: string): { telefono: string; whatsapp: string } {
    const solo = num.replace(/[^\d]/g, '');
    const sin0 = solo.replace(/^0/, '');
    if (sin0.length === 8 && solo.startsWith('09')) {
      return { telefono: `9${sin0}`, whatsapp: `+5989${sin0}` };
    }
    if (sin0.length === 9 && sin0.startsWith('9')) {
      return { telefono: sin0, whatsapp: `+598${sin0}` };
    }
    console.warn("Número no normalizado correctamente:", num)
    return { telefono: sin0, whatsapp: `+598${sin0}` };
}


export default function CheckoutContent() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    signo: '',
    contenidoPreferido: '',
    whatsapp: '',
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [acepta, setAcepta] = useState<boolean>(false);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'whatsapp') {
       setFormData((prev) => ({ ...prev, [name]: value.replace(/[^\d]/g, '') }));
    } else {
       setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setError(null);
  };

  const handleCheckboxChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAcepta(e.target.checked);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    // Validaciones
    if (!acepta) {
      setError('Debes aceptar la Política de Privacidad para continuar.');
      return;
    }
    if (!formData.name.trim() || !formData.signo || !formData.contenidoPreferido || !formData.whatsapp.trim()) {
      setError('Por favor, completa todos los campos.');
      return;
    }
    const whatsappSanitized = formData.whatsapp.replace(/\s+/g, '');
    const whatsappRegex = /^09\d{7}$/;
    if (!whatsappRegex.test(whatsappSanitized)) {
       setError('El número de WhatsApp debe comenzar con 09 y tener 9 dígitos (ej: 099123456).');
       return;
    }

    setIsLoading(true);

    try {
      const { telefono, whatsapp: waE164 } = normalizarUY(whatsappSanitized);
      if (!telefono || telefono.length !== 9 || !telefono.startsWith('9')) {
         console.error("Error post-normalización:", {telefono, waE164});
         throw new Error('El número de WhatsApp proporcionado no es válido tras normalizar.');
      }

      // Payload para la API
      const payload = {
        nombre: formData.name.trim(),
        telefono: telefono,
        signo: formData.signo,
        contenido_preferido: formData.contenidoPreferido,
        whatsapp: waE164,
        pais: 'UY',
        fuente: 'web-vercel-checkout-v2', // Fuente actualizada
        version_politica: 'v1.0',
        acepto_politicas: acepta
      };

      // --- Llamadas API Secuenciales ---
      console.log('Intentando dar de alta al usuario:', payload);
      const altaResponse = await fetch('/api/alta-suscriptor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!altaResponse.ok) {
        const errorData = await altaResponse.json().catch(() => ({ message: 'Error de red o respuesta inválida al registrar.' }));
        throw new Error(errorData.message || 'Hubo un problema al registrar tus datos.');
      }

      const altaResult = await altaResponse.json();
      const userId = altaResult.userId || altaResult.id_suscriptor;
      console.log('Usuario creado/actualizado con ID:', userId);

      if (!userId) {
        throw new Error('No se recibió el ID de usuario tras el registro.');
      }

      console.log('Creando preferencia de Mercado Pago para userId:', userId);
      const preferenceResponse = await fetch('/api/crear-suscripcion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId, price: 390 }),
      });

      if (!preferenceResponse.ok) {
        const errorData = await preferenceResponse.json().catch(() => ({ message: 'Error de red o respuesta inválida al crear preferencia.' }));
        throw new Error(errorData.message || 'Hubo un problema al iniciar el proceso de pago.');
      }

      const { init_point } = await preferenceResponse.json();
      console.log('Preferencia creada, redirigiendo a:', init_point);

      if (init_point) {
        window.location.href = init_point;
      } else {
        throw new Error('No se recibió la URL de pago de Mercado Pago.');
      }
    } catch (err: any) {
      console.error('Error en handleSubmit:', err);
      setError(err.message || 'Ocurrió un error inesperado. Verifica tus datos e intenta de nuevo.');
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* Encabezado Principal */}
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Estás a un paso ✨
        </h1>
        <p className="text-white/70">
          Completa tus datos y confirma tu suscripción premium.
        </p>
      </div>

      {/* *** Panel Central Unificado ("Tablero Cósmico") *** */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-10 backdrop-blur-sm shadow-xl">
          {/* Mantenemos el grid de dos columnas DENTRO del panel único */}
          <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">

                  {/* --- Columna Izquierda: Formulario --- */}
                  <div className="space-y-6"> {/* Espaciado entre título y campos */}
                      {/* Título simplificado para la columna */}
                      <h2 className="text-xl font-semibold text-white">
                          Completa tus datos
                      </h2>
                      {/* Componente con los campos del formulario */}
                      <LeadFormFields
                          formData={formData}
                          handleInputChange={handleInputChange}
                          isLoading={isLoading}
                          acepta={acepta}
                          handleCheckboxChange={handleCheckboxChange}
                      />
                  </div>

                  {/* --- Columna Derecha: Resumen y Botón --- */}
                  <div className="space-y-6"> {/* Espaciado entre título y contenido */}
                       {/* Título simplificado para la columna */}
                      <h2 className="text-xl font-semibold text-white md:text-center">
                          Tu Suscripción Premium
                      </h2>
                      {/* Resumen del Plan */}
                      <SubscriptionSummary />

                      {/* Mensaje de Error (oculto por defecto) */}
                      {error && (
                          <p className="mt-4 text-center text-rose-300 text-sm px-4">{error}</p>
                      )}

                      {/* Botón de Pago Unificado */}
                      <div className="mt-6 mx-auto max-w-xl text-center">
                          <button
                              type="submit"
                              disabled={isLoading}
                              // *** Estilo Vibrante para el botón ***
                              className={`w-full px-8 py-4 rounded-xl text-lg font-bold transition-all duration-300 ease-in-out flex items-center justify-center ${
                                  isLoading
                                  ? 'bg-purple-400/50 text-white/70 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-amber-400 to-pink-400 text-violet-900 shadow-lg hover:from-amber-300 hover:to-pink-300 hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-pink-400/50 focus:ring-offset-2 focus:ring-offset-black/50 disabled:opacity-60'
                              }`}
                          >
                              {isLoading ? (
                                  <>
                                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                      Procesando pago...
                                  </>
                              ) : (
                                  'Confirmar y pagar $U 390'
                              )}
                          </button>
                          {!isLoading && (
                              <p className="text-white/55 text-xs mt-3 px-4">
                                  Serás redirigido a Mercado Pago para finalizar de forma segura.
                              </p>
                          )}
                      </div>
                  </div>
              </div>
          </form>
      </div>
    </div>
  );
}

