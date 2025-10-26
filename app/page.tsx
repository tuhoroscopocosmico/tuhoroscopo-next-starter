//APP>page.tsx
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Head from "next/head";
import HomeContent from "./HomeContent";

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Tu Horóscopo Cósmico — Mensajes premium diarios en WhatsApp</title>
        <meta
          name="description"
          content="Recibí cada mañana tu horóscopo, número y color de la suerte, afirmación positiva y una breve meditación — directo a tu WhatsApp. Sin apps. Sin spam."
        />
        <meta property="og:title" content="Tu Horóscopo Cósmico" />
        <meta property="og:description" content="Mensajes premium diarios en tu WhatsApp." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/img/logo/logo_ppal.png" />
      </Head>

      <Suspense fallback={<div className="text-center text-white py-16">Cargando...</div>}>
        <HomeContent />
      </Suspense>
    </>
  );
}
