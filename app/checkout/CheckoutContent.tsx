// ============================================================
// === Archivo: app/checkout/CheckoutContent.tsx
// === Descripción: Client Component con diseño unificado ("Tablero Cósmico").
// === Refinamientos: Panel único, títulos simplificados, botón vibrante.
// === VERIFICACIÓN: Asegurar que llama al endpoint unificado /api/iniciar-checkout
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
    // Caso: 091234567 -> 91234567
    if (sin0.length === 8 && solo.startsWith('09')) {
      // Devolvemos el número *con* 9 dígitos para la DB
      return { telefono: `9${sin0}`, whatsapp: `+5989${sin0}` };
    }
    // Caso: 91234567 -> 91234567 (ya está bien)
    if (sin0.length === 9 && sin0.startsWith('9')) {
      return { telefono: sin0, whatsapp: `+598${sin0}` };
    }
    // Caso fallback o inesperado
    console.warn("Número WhatsApp no normalizado como se esperaba:", num, "->", { telefono: sin0, whatsapp: `+598${sin0}` })
    return { telefono: sin0, whatsapp: `+598${sin0}` }; // Devolver algo, aunque puede ser inválido
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
       // Limpiar para mantener solo números, pero permitir que el usuario escriba
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

  // *** VERIFICAR ESTA FUNCIÓN ***
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    // Validaciones (igual que antes)
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

      // Payload ÚNICO para la nueva API /api/iniciar-checkout
      const payload = {
        nombre: formData.name.trim(),
        telefono: telefono, // Número normalizado
        signo: formData.signo,
        contenido_preferido: formData.contenidoPreferido, // Nombre backend esperado por alta-suscriptor
        whatsapp: waE164, // E.164
        pais: 'UY',
        fuente: 'web-vercel-checkout-v2', // Fuente actualizada
        version_politica: 'v1.0', // Nombre consistency (iniciar-checkout lo ajustará si es necesario)
        acepto_politicas: acepta,
        // Añadimos monto y moneda porque iniciar-checkout los necesita para pasarlos
        monto: 390,
        moneda: 'UYU'
      };

      // --- Llamada a la API Unificada ---
      console.log('>>> LLAMANDO A /api/iniciar-checkout con payload:', payload); // Log específico

      // *** ASEGÚRATE QUE ESTA ES LA URL CORRECTA ***
      const response = await fetch('/api/iniciar-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('/api/iniciar-checkout status:', response.status); // Log status

      if (!response.ok) {
        let errorData = { message: 'Hubo un problema al iniciar el proceso.' }; // Default
        try {
            errorData = await response.json();
            console.error('Error en /api/iniciar-checkout (respuesta JSON):', errorData);
        } catch (jsonError) {
            const errorText = await response.text();
            console.error('Error en /api/iniciar-checkout (respuesta no JSON):', errorText);
            // Usar el texto si existe, sino el mensaje de errorData (más genérico) o el de jsonError
             errorData.message = errorText || errorData.message || (jsonError as Error).message;
        }
        // Lanzamos el error con el mensaje obtenido
        throw new Error(errorData.message);
      }

      // --- Redirección ---
      const result = await response.json();
      // Esperamos que la API unificada devuelva la respuesta de crear-suscripcion
      const init_point = result?.init_point;
      console.log('Proceso exitoso con /api/iniciar-checkout, redirigiendo a:', init_point);

      if (init_point) {
        window.location.href = init_point;
      } else {
        console.error("Error crítico: /api/iniciar-checkout OK pero no devolvió init_point. Respuesta:", result);
        throw new Error('No se recibió la URL de pago de Mercado Pago.');
      }
    } catch (err: any) {
      console.error('Error capturado en handleSubmit:', err);
      setError(err.message || 'Ocurrió un error inesperado. Verifica tus datos e intenta de nuevo.');
      setIsLoading(false);
    }
  };


  // --- RESTO DEL JSX (SIN CAMBIOS) ---
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

      {/* Panel Central Unificado */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-10 backdrop-blur-sm shadow-xl">
          <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
                  {/* Columna Izquierda: Formulario */}
                  <div className="space-y-6">
                      <h2 className="text-xl font-semibold text-white">
                          Completa tus datos
                      </h2>
                      <LeadFormFields
                          formData={formData}
                          handleInputChange={handleInputChange}
                          isLoading={isLoading}
                          acepta={acepta}
                          handleCheckboxChange={handleCheckboxChange}
                      />
                  </div>

                  {/* Columna Derecha: Resumen y Botón */}
                  <div className="space-y-6">
                      <h2 className="text-xl font-semibold text-white md:text-center">
                          Tu Suscripción Premium
                      </h2>
                      <SubscriptionSummary />

                      {/* Mensaje de Error */}
                      {error && (
                          <p className="mt-4 text-center text-rose-300 text-sm px-4">{error}</p>
                      )}

                      {/* Botón de Pago Unificado */}
                      <div className="mt-6 mx-auto max-w-xl text-center">
                          <button
                              type="submit"
                              disabled={isLoading}
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

