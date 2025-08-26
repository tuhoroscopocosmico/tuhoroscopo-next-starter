import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Tu Horóscopo Cósmico",
  description: "Astrología práctica y personalizada en tu WhatsApp ✨",
  icons: {
    icon: [
      // Fallback clásico .ico
      { url: "/icons/favicon.ico", type: "image/x-icon" },

      // PNG modernos
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-512.png", sizes: "512x512", type: "image/png" },
    ],

    // Apple iOS
    apple: { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },

    // SVG escalable (si lo generás)
    other: [
      { rel: "icon", url: "/icons/favicon.svg", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-cosmic min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
