"use client";
import React, { useEffect, useState } from "react";
import BenefitCard from "./BenefitCard";
import { ChevronLeft, ChevronRight, Gift, Star, Sparkles, Heart, Flower2, Calendar } from "lucide-react";


// 🔮 Array editable de items
const items = [
  {
    title: "Guía diaria",
    desc: "Recibí consejos prácticos y energías dominantes para tomar mejores decisiones cada día.",
    footer: "Hecho a tu medida",
    icon: <Star className="w-6 h-6" />,
  },
  {
    title: "Amor y relaciones",
    desc: "Entendé mejor tu energía afectiva y recibí claves para potenciar tus vínculos.",
    footer: "Conexiones reales",
    icon: <Heart className="w-6 h-6" />,
  },
  {
    title: "Bienestar",
    desc: "Tips astrológicos y emocionales para cuidar tu energía y equilibrio interior.",
    footer: "Armonía cósmica",
    icon: <Sparkles className="w-6 h-6" />,
  },
  {
    title: "Afirmación positiva",
    desc: "Una afirmación breve y poderosa, pensada para impulsarte y alinearte con tu mejor versión.",
    footer: "Lun – Sáb",
    icon: <Sparkles className="w-6 h-6" />,
  },
  {
    title: "Horóscopos únicos y personalizados de lunes a sábado",
    desc: "Recibí mensajes creados exclusivamente para vos, con tu nombre, tu signo y la emoción que más necesitás cada día.",
    footer: "Lun – Sáb",
    icon: <Star className="w-6 h-6" />,
  },
  
  {
    title: "Número y color de la suerte",
    desc: "Conocé tu número y color especial para hoy, con una explicación sencilla para potenciar tu energía.",
    footer: "Lun – Sáb",
    icon: <Star className="w-6 h-6" />, // podés usar otro icono más custom aquí
  },
  {
    title: "Meditación",
    desc: "Un ejercicio breve de mindfulness o respiración para reconectar, bajar la ansiedad y recargar tu energía.",
    footer: "Lun – Sáb",
    icon: <Flower2 className="w-6 h-6" />, // lotus = perfecto para meditación
  },
  {
    title: "Mini Reto & Reflexión",
    desc: "Mensaje especial y mini reto para cerrar la semana en calma y empezar la próxima con nueva energía.",
    footer: "Domingo",
    icon: <Calendar className="w-6 h-6" />,
  },
  {
    title: "Regalos especiales",
    desc: "Sorpresas exclusivas: audios, guías y descuentos directos a tu WhatsApp.",
    footer: "Exclusivo",
    icon: <Gift className="w-6 h-6" />,
  },
];

export default function BenefitsCarousel() {
  const [current, setCurrent] = useState(0);

  // ⏱ Autoplay cada 5s
  useEffect(() => {
    const interval = setInterval(() => {
      next();
    }, 5000);
    return () => clearInterval(interval);
  }, [current]);

  const prev = () => {
    setCurrent((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  };

  const next = () => {
    setCurrent((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto py-12">
      {/* Carrusel */}
      <div className="flex items-center justify-center">
        {/* Flecha izquierda */}
        <button
          onClick={prev}
          className="absolute left-0 z-30 p-3 rounded-full bg-white/10 hover:bg-white/20 transition"
        >
          <ChevronLeft className="text-white w-6 h-6" />
        </button>

        {/* Cards */}
    <div className="flex items-center justify-center gap-8 w-full overflow-hidden">
      {items.map((item, index) => {
        const isActive = index === current;
        const isNeighbor =
          index === (current + 1) % items.length ||
          index === (current - 1 + items.length) % items.length;

        return (
          <BenefitCard
            key={index}
            title={item.title}
            desc={item.desc}
            footer={item.footer}
            icon={item.icon}
            isActive={isActive}
            isNeighbor={isNeighbor}
          />
        );
      })}
    </div>
        {/* Flecha derecha */}
        <button
          onClick={next}
          className="absolute right-0 z-30 p-3 rounded-full bg-white/10 hover:bg-white/20 transition"
        >
          <ChevronRight className="text-white w-6 h-6" />
        </button>
      </div>

      {/* Dots */}
      <div className="mt-6 flex justify-center gap-2">
        {items.map((_, index) => (
          <span
            key={index}
            onClick={() => setCurrent(index)}
            className={`h-2 rounded-full transition-all cursor-pointer ${
              index === current
                ? "w-6 bg-amber-400"
                : "w-2 bg-white/30 hover:bg-white/50"
            }`}
          ></span>
        ))}
      </div>
    </div>
  );
}
