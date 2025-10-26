// ============================================================
// === Archivo: app/HomeContent.tsx
// === Descripción: Componente principal de la Landing Page (Paso 1).
// === Muestra beneficios, precio y CTAs a /checkout.
// ============================================================
"use client";

import Link from "next/link";
import Logo from "@/components/logo";
// --- FORMULARIO Y CTA FLOTANTE ELIMINADOS DE LA LANDING ---
import BenefitsGridLite from "@/components/Benefits/BenefitsGridLite";

export default function HomeContent() {
  return (
    <div className="body-overlay min-h-screen relative flex flex-col">
      <main className="relative z-[1] flex-grow">
        {/* HERO */}
        <section className="mx-auto max-w-5xl px-4 text-center">
          <Link href="/" className="inline-flex items-center gap-3">
            <Logo />
          </Link>

          <h2 className="mt-8 text-2xl md:text-4xl font-extrabold leading-snug">
            <span className="inline-block align-middle">🌟</span>{" "}
            Comenzá cada día recibiendo tu mensaje personalizado con la{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-pink-300">
              mejor energía del universo
            </span>
          </h2>

          <p className="mt-4 text-white/85">
            Astrología moderna, práctica y hecha para vos. Sin apps. Sin vueltas. Lista para{" "}
            <strong>Uruguay</strong>.
          </p>
          <p className="text-white/70">
            Sólo mensajes premium, únicos, directo a tu WhatsApp para arrancar tu día con claridad y buena energía.
          </p>

          {/* Primer bloque de beneficios */}
          <BenefitsGridLite start={0} end={6} />

          {/* =========================================== */}
          {/* === CTA MODIFICADO (APUNTA A /checkout) === */}
          {/* =========================================== */}
          <div className="mt-10 text-center">
            <Link
              href="/checkout" // <-- CAMBIADO: Apunta a /checkout
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-amber-400 to-pink-400 px-7 py-3 font-semibold text-violet-900 shadow-lg hover:from-amber-300 hover:to-pink-300"
            >
              Suscribirme ahora por $U 390
            </Link>
          </div>

          {/* =========================================== */}
          {/* === NUEVO BLOQUE DE PRECIO === */}
          {/* =========================================== */}
          <div className="mx-auto max-w-sm mt-16 mb-12">
            <div className="rounded-2xl bg-cosmic-surface/70 border border-white/10 p-6 shadow-glow backdrop-blur-sm text-center">
              <h3 className="text-2xl font-bold text-white">
                Suscripción premium mensual
              </h3>
              <div className="my-4">
                <span className="text-4xl font-extrabold text-white">$U 390</span>
                <span className="text-white/80 font-semibold ml-1">/mes</span>
              </div>
              <p className="text-white/70 text-sm">
                Sin ataduras. Cancelá cuando quieras.
              </p>
            </div>
          </div>
          {/* =========================================== */}

          {/* Segundo bloque de beneficios */}
          <BenefitsGridLite start={6} end={9} />

          {/* =========================================== */}
          {/* === CTA REPETIDO (FINAL) === */}
          {/* =========================================== */}
          <div className="mt-10 mb-16 text-center">
            <Link
              href="/checkout" // <-- CAMBIADO: Apunta a /checkout
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-amber-400 to-pink-400 px-7 py-3 font-semibold text-violet-900 shadow-lg hover:from-amber-300 hover:to-pink-300"
            >
              Suscribirme ahora por $U 390
            </Link>
          </div>

        </section>
        
        {/* La sección del formulario ha sido eliminada */}
        
      </main>
    </div>
  );
}

