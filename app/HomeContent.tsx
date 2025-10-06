"use client";

import Link from "next/link";
import Logo from "@/components/logo";
import LeadForm from "@/components/LeadForm";
import StickyCTA from "@/components/StickyCTA";
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

          {/* Primer bloque */}
          <BenefitsGridLite start={0} end={6} />

          <div className="mt-10 text-center">
            <a
              href="#form"
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-amber-400 to-pink-400 px-7 py-3 font-semibold text-violet-900 shadow-lg hover:from-amber-300 hover:to-pink-300"
            >
              Comenzar mi experiencia
            </a>
          </div>

          {/* Segundo bloque (3 items centrados) */}
          <BenefitsGridLite start={6} end={9} />
        </section>

        {/* FORM */}
        <section id="form" className="mx-auto max-w-6xl px-4 pb-16">
          <LeadForm />
          <StickyCTA />
        </section>
      </main>
    </div>
  );
}
