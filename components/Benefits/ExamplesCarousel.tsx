"use client";
import React, { useEffect, useRef, useState } from "react";
import BenefitCardLite from "./BenefitCardLite";
import { benefitsData } from "./benefits.data";
import { ChevronLeft, ChevronRight } from "lucide-react";

const AUTOPLAY_MS = 5000;

export default function ExamplesCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const length = benefitsData.length;
  const intervalRef = useRef<number | null>(null);

  const go = (dir: 1 | -1) => setCurrent((prev) => (prev + dir + length) % length);

  useEffect(() => {
    if (paused) return;
    intervalRef.current = window.setInterval(() => go(1), AUTOPLAY_MS);
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current); };
  }, [paused, length]);

  return (
    <section
      className="relative w-full max-w-6xl mx-auto py-12"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-labelledby="ejemplos"
    >
      <h2 id="ejemplos" className="sr-only">Ejemplos de lo que vas a recibir</h2>

      <div className="flex items-center justify-center">
        <button onClick={() => go(-1)} className="absolute left-0 z-30 p-3 rounded-full bg-white/10 hover:bg-white/20">
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="flex items-center justify-center gap-8 w-full overflow-hidden">
          {benefitsData.map((b, index) => {
            const emphasis = index === current;
            const isNeighbor =
              index === (current + 1) % length ||
              index === (current - 1 + length) % length;
            if (!emphasis && !isNeighbor) return null;
            return <BenefitCardLite key={index} {...b} emphasis={emphasis} />;
          })}
        </div>

        <button onClick={() => go(1)} className="absolute right-0 z-30 p-3 rounded-full bg-white/10 hover:bg-white/20">
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <div className="mt-6 flex justify-center gap-2">
        {benefitsData.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Ir al elemento ${i + 1}`}
            className={`h-2 rounded-full ${i === current ? "w-6 bg-amber-400" : "w-2 bg-white/30 hover:bg-white/50"}`}
          />
        ))}
      </div>
    </section>
  );
}
