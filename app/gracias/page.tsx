// /app/gracias/page.tsx  (Server Component)
import { redirect } from "next/navigation";

export default function Gracias({ searchParams }: { searchParams: { nombre?: string; tel?: string; dup?: string } }) {
  const { nombre, tel, dup } = searchParams;
  if(!nombre || !tel) redirect("/suscribite");

  return (
    <section className="container-narrow py-16">
      <h1 className="h1">¡Gracias, {nombre}! 🎉</h1>
      <p className="mt-4">Registramos tu suscripción Premium con el teléfono <strong>{tel}</strong>.</p>
      {dup === "1" ? (
        <p className="mt-2">Ese número ya estaba registrado. Si necesitás ayuda, escribinos.</p>
      ) : (
        <p className="mt-2">En breve vas a recibir un WhatsApp de bienvenida con los beneficios del plan.</p>
      )}
      <div className="card mt-6">
        <h2 className="h2">Tu plan: Premium</h2>
        <ul className="mt-3 list-disc pl-5">
          <li>Contenido diario personalizado (lun-sáb)</li>
          <li>Mensaje especial de domingo</li>
          <li>Soporte prioritario por WhatsApp</li>
        </ul>
      </div>
    </section>
  );
}