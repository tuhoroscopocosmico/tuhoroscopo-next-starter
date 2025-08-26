import Link from 'next/link'

export default function Contacto() {
  return (
    <section className="relative flex items-center justify-center px-4 py-12">

      {/* Fondo de estrellas */}
      <div className="absolute inset-0 bg-[url('/stars-bg.svg')] bg-cover bg-center opacty-30" />

      {/* Contenedor central */}
      <div className="mx-auto mt-10 w-full max-w-xl rounded-3xl bg-white/10 p-6 md:p-8 shadow-2xl ring-1 ring-white/15 backdrop-blur">

        {/* Logo */}
        <div className="flex justify-center mb-4">
          <Link href="/" className="inline-flex items-center gap-3">
            <img
              src="../img/logo/logo.webp"
              alt="Tu Horóscopo Cósmico"
              className="h-20 drop-shadow-lg"
            />
          </Link>
        </div>

        {/* Título */}
        <h2 className="text-2xl sm:text-3xl font-extrabold text-center text-amber-300 drop-shadow-lg">
          Contactanos
        </h2>
        <p className="text-center text-pink-200">
          Tenés dudas, sugerencias o querés hablarnos 💫?  
          Completá el formulario y te respondemos lo antes posible.
        </p>

        {/* Formulario */}
        <form className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-white/80">Nombre</label>
            <input
              type="text"
              placeholder="Tu nombre"
              className="mt-1 w-full rounded-xl bg-black/40 border border-white/20 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80">Correo electrónico</label>
            <input
              type="email"
              placeholder="tunombre@email.com"
              className="mt-1 w-full rounded-xl bg-black/40 border border-white/20 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80">Mensaje</label>
            <textarea
              placeholder="Escribí tu mensaje aquí..."
              rows={4}
              className="mt-1 w-full rounded-xl bg-black/40 border border-white/20 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-400"
            ></textarea>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="privacidad" className="w-4 h-4 text-pink-500" />
            <label htmlFor="privacidad" className="text-sm text-white/70">
              Acepto la <Link href="/politica-de-privacidad" className="text-pink-300 underline">Política de Privacidad</Link>.
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-amber-400 to-pink-500 hover:opacity-90 transition"
          >
            Enviar mensaje
          </button>
        </form>
      </div>

      {/* Decoración cósmica */}
      <span className="absolute top-10 left-10 text-4xl opacity-30 animate-pulse">🌙</span>
      <span className="absolute bottom-10 right-16 text-3xl opacity-30 animate-bounce">✨</span>
    </section>
  );
}
