'use client'
import React from 'react';

type BenefitCardProps = {
  title: string;
  desc: string;
  footer?: string;
  icon: React.ReactNode;
  className?: string;              // 👈 NUEVO
};

export default function BenefitCard({
  title, desc, footer, icon, className
}: BenefitCardProps) {
  const base =
    "rounded-3xl bg-white/5 p-5 text-white/90 shadow-[0_0_0_1px_rgba(255,255,255,.06)]";
  return (
    <div className={[base, className].filter(Boolean).join(' ')}>
      <div className="mb-2">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-white/80">{desc}</p>
      {footer && <div className="mt-3 text-xs text-white/60">{footer}</div>}
    </div>
  );
}
