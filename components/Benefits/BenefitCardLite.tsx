"use client";
import React from "react";
import type { LucideIcon } from "lucide-react";

type Props = {
  title: string;
  desc: string;
  footer: string;
  icon: LucideIcon;
  emphasis?: boolean; // para destacar en el carrusel
  className?: string;
};

export default function BenefitCardLite({
  title, desc, footer, icon: Icon, emphasis = false, className = "",
}: Props) {
  return (
    <div
      className={`
        flex flex-col items-center justify-between text-center rounded-2xl
        transition-all duration-500 ease-in-out
        ${emphasis ? "scale-105 opacity-100 z-20" : "scale-95 opacity-85"}
        w-56 h-60 md:w-60 md:h-64
        bg-gradient-to-b from-violet-900/60 to-fuchsia-900/40 
        shadow-lg ring-1 ring-white/10 backdrop-blur
        hover:scale-105 hover:shadow-xl
        ${className}
      `}
      role="article"
      aria-label={title}
    >
      <div className="flex items-center justify-center mt-5 mb-3">
        <div className="p-3 rounded-full bg-white/10 ring-2 ring-amber-400/50 shadow-lg">
          <Icon className="w-7 h-7 text-amber-300" aria-hidden />
        </div>
      </div>

      <div className="flex flex-col flex-grow px-4">
        <h3 className="text-base font-bold text-amber-300 mb-1">{title}</h3>
        <p className="text-sm text-white/80 line-clamp-3">{desc}</p>
      </div>

      <p className="text-xs font-semibold text-pink-300 mt-3 mb-5">{footer}</p>
    </div>
  );
}
