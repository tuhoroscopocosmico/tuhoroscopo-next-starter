import Link from 'next/link'

export default function QuienesSomos() {
  return (
    <section className="relative flex items-center justify-center px-1 py-0 min-h-screen">
      
      {/* Fondo de estrellas */}
      <div className="absolute inset-0 bg-[url('/stars-bg.svg')] bg-cover bg-center opacity-30" />

      {/* Contenedor central (sin margen extra) */}
      <div className="mx-auto w-full max-w-4xl rounded-3xl bg-white/10 p-10 md:p-12 shadow-2xl ring-1 ring-white/15 backdrop-blur-lg">
        
        {/* Logo */}
        <div className="flex justify-center mb-1">
          <Link href="/" className="inline-flex items-center gap-3">
            <img 
              src="../img/logo/logo.webp" 
              alt="Tu Horóscopo Cósmico" 
              className="h-44 drop-shadow-lg"
            />
          </Link>
        </div>

        {/* Título */}
        <h2 className="text-5xl font-extrabold text-amber-300 drop-shadow-lg text-center">
          Nuestra misión
        </h2>
        <p className="text-2xl text-pink-200 italic text-center mt-2">
          Ayudarte a empezar el día mejor
        </p>

        {/* Texto */}
        <div className="text-white/90 leading-relaxed space-y-6 mt-6 text-lg">
          <p>
            Buscamos motivarte, inspirarte, invitarte a reflexionar y acompañarte
            en cada momento, estés donde estés.
          </p>
          <h3 className="text-3xl font-semibold text-amber-200 mt-10">
            ¿Quiénes somos?
          </h3>
          <p>
            <span className="font-bold text-pink-300">Tu Horóscopo Cósmico</span>{" "}
            nació para ayudarte a comenzar cada día con claridad, inspiración y propósito genuino.
            Somos un equipo apasionado que fusiona astrología moderna con inteligencia artificial
            para enviarte mensajes personalizados directos a tu WhatsApp,{" "}
            <span className="font-bold text-amber-300">de manera simple y sin complicaciones</span>.
          </p>
          <p>
            Creemos en una astrología práctica, cercana y pensada para la vida real.
            Cada mensaje está diseñado para acompañarte, recordarte tu valor y alinear tu energía
            con el universo.
          </p>
          <p className="text-pink-200 font-semibold text-xl">
            Eso es valor real, y por eso la gente nos elige cada día.
          </p>
        </div>
      </div>

      {/* Decoración cósmica */}
      <span className="absolute top-10 left-10 text-5xl opacity-30 animate-pulse">🌙</span>
      <span className="absolute bottom-10 right-16 text-4xl opacity-30 animate-bounce">✨</span>
    </section>
  );
}
