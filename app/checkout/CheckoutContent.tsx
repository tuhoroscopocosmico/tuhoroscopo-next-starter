// ============================================================
// === Archivo: app/checkout/CheckoutContent.tsx
// === Descripción:
// === Client Component del checkout (FRONTEND)
// ===
// === Responsabilidades de este archivo:
// === 1. Validar inputs del usuario
// === 2. Normalizar el WhatsApp correctamente (UY)
// === 3. Enviar payload LIMPIO al backend
// === 4. Redirigir a Mercado Pago
// ===
// === REGLA DE ORO (UY):
// === - Input usuario: 09XXXXXXXX (10 dígitos)
// === - Teléfono DB:   9XXXXXXXX  (9 dígitos)
// === - WhatsApp:      +5989XXXXXXXX
// ============================================================

'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { Loader2 } from 'lucide-react';
import LeadFormFields from '@/components/LeadFormFields';
import SubscriptionSummary from '@/components/SubscriptionSummary';

// ============================================================
// === Tipado del formulario
// ============================================================
interface FormData {
  name: string;
  signo: string;
  contenidoPreferido: string;
  whatsapp: string; // SIEMPRE número local ingresado por el usuario
}

// ============================================================
// === Normalización de WhatsApp Uruguay (FUNCIÓN FINAL)
// ============================================================
// Entrada esperada: 09XXXXXXXX (10 dígitos)
// Salida:
//   telefono: 9XXXXXXXX
//   whatsapp: +5989XXXXXXXX
// ============================================================
function normalizarUY(num: string): { telefono: string; whatsapp: string } {
  // Eliminamos cualquier cosa que no sea número
  const digits = num.replace(/\D/g, '');

  // Validación estricta UY
  if (!/^09\d{8}$/.test(digits)) {
    throw new Error(`Número de WhatsApp inválido (UY): ${num}`);
  }

  // Quitamos el 0 inicial → queda 9XXXXXXXX
  const telefono = digits.slice(1);

  // Construimos formato E.164
  const whatsapp = `+598${telefono}`;

  // Log defensivo (solo frontend)
  console.log('[normalizarUY]', {
    input: num,
    digits,
    telefono,
    whatsapp,
  });

  return { telefono, whatsapp };
}

// ============================================================
// === Componente principal
// ============================================================
export default function CheckoutContent() {
  // -------------------- STATE --------------------
  const [formData, setFormData] = useState<FormData>({
    name: '',
    signo: '',
    contenidoPreferido: '',
    whatsapp: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acepta, setAcepta] = useState(false);

  // ============================================================
  // === Handler de inputs
  // ============================================================
  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // Para WhatsApp SOLO dejamos números
    if (name === 'whatsapp') {
      setFormData(prev => ({
        ...prev,
        [name]: value.replace(/\D/g, ''),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }

    setError(null);
  };

  // ============================================================
  // === Checkbox políticas
  // ============================================================
  const handleCheckboxChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAcepta(e.target.checked);
    setError(null);
  };

  // ============================================================
  // === Submit principal
  // ============================================================
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    // ---------------- VALIDACIONES BÁSICAS ----------------
    if (!acepta) {
      setError('Debes aceptar la Política de Privacidad para continuar.');
      return;
    }

    if (
      !formData.name.trim() ||
      !formData.signo ||
      !formData.contenidoPreferido ||
      !formData.whatsapp.trim()
    ) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    // Validación estricta del input del usuario
    const whatsappRegex = /^09\d{8}$/;
    if (!whatsappRegex.test(formData.whatsapp)) {
      setError(
        'El número de WhatsApp debe comenzar con 09 y tener 10 dígitos (ej: 0999863263).'
      );
      return;
    }

    // ---------------- SESSION STORAGE ----------------
    try {
      sessionStorage.setItem(
        'checkoutData',
        JSON.stringify({
          name: formData.name.trim(),
          signo: formData.signo,
          contenidoPreferido: formData.contenidoPreferido,
          whatsapp: formData.whatsapp,
        })
      );
    } catch (e) {
      console.warn('No se pudo guardar sessionStorage:', e);
    }

    setIsLoading(true);

    try {
      // ---------------- NORMALIZACIÓN FINAL ----------------
      const { telefono, whatsapp } = normalizarUY(formData.whatsapp);

      // ---------------- PAYLOAD AL BACKEND ----------------
      const payload = {
        nombre: formData.name.trim(),
        telefono,                 // 9XXXXXXXX
        whatsapp,                 // +5989XXXXXXXX
        signo: formData.signo,
        contenido_preferido: formData.contenidoPreferido,
        pais: 'UY',
        fuente: 'web-vercel-checkout-v2',
        version_politicas: 'v1.0',
        acepto_politicas: acepta,
      };

      console.log('[checkout] Payload enviado:', payload);

      const response = await fetch('/api/iniciar-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Error iniciando checkout');
      }

      const result = await response.json();

      if (!result?.init_point) {
        throw new Error('No se recibió el link de pago');
      }

      // ---------------- REDIRECCIÓN MP ----------------
      window.location.href = result.init_point;
    } catch (err: any) {
      console.error('[checkout] Error:', err);
      setError(err.message || 'Error inesperado');
      setIsLoading(false);
    }
  };

  // ============================================================
  // === JSX
  // ============================================================
  return (
    <div className="mx-auto max-w-6xl">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Estás a un paso ✨
        </h1>
        <p className="text-white/70">
          Completa tus datos y confirma tu suscripción premium.
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-10 backdrop-blur-sm shadow-xl">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
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

            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white md:text-center">
                Tu Suscripción Premium
              </h2>
              <SubscriptionSummary />

              {error && (
                <p className="text-center text-rose-300 text-sm">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-8 py-4 rounded-xl text-lg font-bold bg-gradient-to-r from-amber-400 to-pink-400 text-violet-900"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="inline mr-2 animate-spin" />
                    Conectando con Mercado Pago...
                  </>
                ) : (
                  'Confirmar y pagar $U 390'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
