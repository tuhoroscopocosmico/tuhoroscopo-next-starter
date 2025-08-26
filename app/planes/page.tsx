import Link from 'next/link'
export default function PlanesPage({ searchParams }:{ searchParams: {nombre?:string; signo?:string; whatsapp?:string}}){
  const { nombre, whatsapp } = searchParams
  return(<div className="container-narrow pb-16">
    <div className="max-w-2xl mx-auto bg-cosmic-surface border border-white/10 rounded-2xl p-8">
      <p className="text-center text-white/90 mb-4">
        {nombre ? <>¡Hola, <b>{nombre}</b>! Estás a un paso de recibir tu contenido premium.</> : <>Estás a un paso de recibir tu contenido premium.</>}
        {whatsapp && <> en <span className="inline-block bg-black/30 px-2 py-1 rounded-lg font-mono">{decodeURIComponent(whatsapp)}</span></>}
      </p>
      <div className="rounded-2xl bg-black/20 p-6 border border-white/10">
        <div className="mb-3"><span className="inline-block bg-yellow-500/20 text-yellow-200 px-3 py-1 rounded-full text-sm font-semibold">Flexibilidad total</span></div>
        <h1 className="text-2xl font-extrabold text-white">Suscripción premium mensual</h1>
        <p className="text-3xl font-extrabold text-cosmic-gold mt-2">$U 390 <span className="text-base text-white/70">/mes</span></p>
        <ul className="mt-3 text-white/90 list-disc pl-5 space-y-1">
          <li>Pagás mes a mes, sin ataduras. Renovación automática.</li>
          <li>Cancelá cuando quieras. Sin sorpresas.</li>
          <li>Recibí tu primer mensaje premium en minutos.</li>
        </ul>
        <Link href="#pago-mercadopago" className="btn-cta w-full mt-5 text-center block" prefetch={false}>Activá tu cuenta ahora</Link>
        <p className="text-white/60 text-sm mt-3">Serás redirigido a Mercado Pago para finalizar el pago de forma segura.</p>
      </div>
      <div className="text-center mt-6"><Link className="underline text-white/70 hover:text-white" href="/registro">Volver para corregir datos</Link></div>
    </div>
  </div>)
}
