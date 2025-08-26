import Link from 'next/link'

export default function PoliticaPrivacidad() {
  return (
    <section className="relative flex items-center justify-center px-4 py-1">

      {/* Fondo de estrellas */}
      <div className="absolute inset-0 bg-[url('/stars-bg.svg')] bg-cover bg-center opacity-30" />

      {/* Contenedor central */}
      <div className="mx-auto mt-10 w-full max-w-xl rounded-3xl bg-white/10 p-6 md:p-8 shadow-2xl ring-1 ring-white/15 backdrop-blur">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Link href="/" className="inline-flex items-center gap-3">
            <img
              src="../img/logo/logo.webp"
              alt="Tu Horóscopo Cósmico"
              className="h-28 drop-shadow-lg"
            />
          </Link>
        </div>

        {/* Título */}
        <h2 className="text-3xl font-extrabold text-amber-300 text-center drop-shadow-lg">
          Políticas de Privacidad
        </h2>
        <br></br>

        {/* Texto */}
        <div className="text-white/90 leading-relaxed space-y-4 text-sm sm:text-base">

          <p>
            En <span className="font-bold text-pink-300">Tu Horóscopo Cósmico</span> valoramos tu confianza. 
            Por eso protegemos tu información personal y te explicamos cómo la usamos.
          </p>

          <h3 className="text-xl font-semibold text-amber-200 mt-4">1. Datos que recopilamos</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Nombre y signo zodiacal.</li>
            <li>Número de WhatsApp (para enviarte mensajes diarios).</li>
            <li>Preferencias de contenido.</li>
            <li>Información de pago (gestionada de forma segura por terceros, nunca almacenamos los datos completos de tu tarjeta).</li>
          </ul>

          <h3 className="text-xl font-semibold text-amber-200 mt-4">2. Cómo usamos tu información</h3>
          <p>
            Tus datos se utilizan únicamente para enviarte horóscopos personalizados, 
            recordarte tu suscripción y mejorar tu experiencia. 
            <span className="font-bold text-amber-300"> Nunca los compartimos con fines publicitarios.</span>
          </p>

          <h3 className="text-xl font-semibold text-amber-200 mt-4">3. WhatsApp y comunicaciones</h3>
          <p>
            Usamos tu número de WhatsApp solo para entregarte el contenido al que te suscribiste. 
            Podés cancelar en cualquier momento respondiendo <span className="italic">“BAJA”</span> o escribiéndonos.
          </p>

          <h3 className="text-xl font-semibold text-amber-200 mt-4">4. Pagos seguros</h3>
          <p>
            Los pagos se procesan mediante <span className="font-bold">Mercado Pago</span> u otros proveedores de confianza. 
            No almacenamos información sensible de tarjetas en nuestros servidores.
          </p>

          <h3 className="text-xl font-semibold text-amber-200 mt-4">5. Seguridad</h3>
          <p>
            Implementamos medidas técnicas y organizativas para proteger tus datos frente a accesos no autorizados.
          </p>

          <h3 className="text-xl font-semibold text-amber-200 mt-4">6. Tus derechos</h3>
          <p>
            Podés solicitar acceso, modificación o eliminación de tus datos en cualquier momento. 
            Escribinos a <span className="text-pink-300">hola@tuhoroscopocosmico.com</span>.
          </p>

          <h3 className="text-xl font-semibold text-amber-200 mt-4">7. Cambios en la política</h3>
          <p>
            Podemos actualizar esta política y lo comunicaremos en nuestra web o por WhatsApp en caso de cambios importantes.
          </p>

          <p className="text-center text-pink-200 font-semibold mt-6">
            ✨ Tu energía es tuya. Tu privacidad también. ✨
          </p>
        </div>
      </div>

      {/* Decoración cósmica */}
      <span className="absolute top-10 left-10 text-4xl opacity-30 animate-pulse">🌙</span>
      <span className="absolute bottom-10 right-16 text-3xl opacity-30 animate-bounce">✨</span>
    </section>
  );
}
