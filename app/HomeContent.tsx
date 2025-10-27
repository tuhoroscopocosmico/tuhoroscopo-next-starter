// ============================================================
// === Archivo: app/HomeContent.tsx
// === Descripción: Componente principal de la Landing Page.
// ===              Muestra H1, Mockup, Beneficios, Testimonios y CTA.
// ===              Modificado para mejorar persuasión y claridad.
// ============================================================
'use client'; // Necesario porque importa Client Components

// --- IMPORTACIONES ---
// Verifica CUIDADOSAMENTE que estas rutas coincidan EXACTAMENTE
// con la ubicación y el nombre (MAYÚSCULAS/minúsculas) de tus archivos.

import { CTAButton } from '@/components/CTAButton';
import Logo from '@/components/logo';
import BenefitsGridLite from '@/components/Benefits/BenefitsGridLite'; // ¿Está en components/Benefits/ ?
import Testimonios from '@/components/Testimonios';         // ¿Está en components/ ?
import WhatsAppMockup from '@/components/WhatsAppMockup';     // ¿Está en components/ ?
import SubscriptionSummary from '@/components/SubscriptionSummary';

export default function HomeContent() {

  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      {/* Sección Hero Principal */}
      <section className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
        <div className="mb-6">
          <Logo className="h-16 w-auto mx-auto" /> {/* Logo */}
        </div>

        {/* Título Principal (H1) */}
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
          Recibí tu Horóscopo Premium. Personalizado y directo a tu WhatsApp.
        </h1>
        {/* Subtítulo */}
        <p className="text-lg md:text-xl text-white/70 mb-8">
          Comenzá cada día con la guía astrológica que necesitás, incluyendo mensajes de audio y consejos únicos para vos.
        </p>

        {/* Mockup Visual de WhatsApp */}
        <div className="my-10 md:my-12 flex justify-center">
            <WhatsAppMockup />
        </div>

        {/* CTA Principal */}
        <CTAButton href="/checkout" text="Recibir mi Horóscopo Premium Ahora" className="text-lg" />
        <p className="text-xs text-white/50 mt-2">Suscripción mensual $U 390. Cancelás cuando quieras.</p>
      </section>

      {/* Sección de Beneficios */}
      <section className="mb-16 md:mb-24">
        {/* Título para Beneficios */}
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-10 md:mb-12">
          Tu suscripción premium incluye todo esto:
        </h2>
        {/* Grid de Beneficios */}
        <BenefitsGridLite />
      </section>

       {/* Sección de Testimonios */}
      <section className="mb-16 md:mb-24">
        <Testimonios />
      </section>

      {/* Sección Final de Precio/CTA */}
      <section className="text-center max-w-2xl mx-auto">
         {/* Título CTA Final */}
         <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
          Listo para transformar tu día a día?
        </h2>
        {/* Resumen del plan */}
        <SubscriptionSummary />
         {/* Botón CTA Final */}
         <div className="mt-8">
             <CTAButton href="/checkout" text="Empezar mi Suscripción Premium" className="text-xl" />
         </div>
      </section>

    </div>
  );
}

