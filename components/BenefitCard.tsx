interface BenefitCardProps {
  title: string;
  desc: string;
  footer: string;
  icon: React.ReactNode;
  isActive: boolean;
  isNeighbor: boolean;
}

export default function BenefitCard({
  title,
  desc,
  footer,
  icon,
  isActive,
  isNeighbor,
}: BenefitCardProps) {
  // No renderizar si no es central ni vecino
  if (!isActive && !isNeighbor) return null;

  return (
    <div
      className={`
        flex flex-col items-center justify-between text-center rounded-2xl
        transition-all duration-700 ease-in-out transform
        ${isActive ? "scale-110 opacity-100 z-20" : "scale-90 opacity-40 blur-[1px] z-10"}
        w-56 h-60 md:w-60 md:h-64
        bg-gradient-to-b from-violet-900/60 to-fuchsia-900/40 
        shadow-lg ring-1 ring-white/10 backdrop-blur
        hover:scale-112 hover:shadow-xl
      `}
    >
      {/* Icono */}
      <div className="flex items-center justify-center mt-5 mb-3">
        <div className="p-3 rounded-full bg-white/10 ring-2 ring-amber-400/50 shadow-lg">
          {/* Ícono un poco más grande */}
          <div className="w-7 h-7 text-amber-300">{icon}</div>
        </div>
      </div>

      {/* Texto */}
      <div className="flex flex-col flex-grow px-4">
        <h3 className="text-base font-bold text-amber-300 mb-1">{title}</h3>
        <p className="text-sm text-white/80 line-clamp-3">{desc}</p>
      </div>

      {/* Footer */}
      {/*<p className="text-xs font-semibold text-pink-300 mt-3 mb-5">{footer}</p>*/}
    </div>
  );
}
