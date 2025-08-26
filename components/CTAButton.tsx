import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";
import clsx from "clsx";
import type { Route } from "next";

// ✅ Soporta tanto rutas internas tipadas (`Route`) como URLs externas
type CTAButtonProps = {
  href: Route | string;
  children: ReactNode;
  className?: string;
};

export function CTAButton({ href, children, className }: CTAButtonProps) {
  const isExternal = typeof href === "string" && href.startsWith("http");

  if (isExternal) {
    // 🔗 Links externos → redes sociales, etc.
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={clsx("btn-cta w-full sm:w-auto text-center", className)}
      >
        {children}
      </a>
    );
  }

  // 🌀 Links internos → validados por Next.js (ej: "/planes", "/registro")
  return (
    <Link
      href={href as Route}
      className={clsx("btn-cta w-full sm:w-auto text-center", className)}
    >
      {children}
    </Link>
  );
}
