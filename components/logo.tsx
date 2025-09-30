import Image from "next/image";
import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/" className="flex items-center justify-center gap-3 hover:opacity-90 transition">
      <Image
        src="/img/logo/logo_solo.webp"
        alt="Tu Horóscopo Cósmico"
        width={120}
        height={120}
        priority
      />

      <div className="text-center leading-tight">
      <h1 className="text-2xl md:text-3xl font-extrabold drop-shadow-sm text-white">
        TU HORÓSCOPO
      </h1>
      <span className="block text-xl md:text-2xl font-bold text-fuchsia-300 drop-shadow-sm">
        CÓSMICO
      </span>
    </div>






    </Link>
  );
}
