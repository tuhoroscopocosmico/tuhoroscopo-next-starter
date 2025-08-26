import { benefitsData } from "./benefits.data";
import BenefitCardLite from "./BenefitCardLite";

type Props = {
  start?: number;
  end?: number;
  className?: string;
};

export default function BenefitsGridLite({ start = 0, end = 6, className = "" }: Props) {
  const items = benefitsData.slice(start, end);

  return (
    <section className={`mx-auto max-w-6xl px-4 py-10 ${className}`}>
      <div
        className={`grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-8 place-items-center`}
      >
        {items.map((b, i) => (
          <BenefitCardLite
            key={i}
            {...b}
            // Si es un bloque de 3 items, forzar centrado
            className={items.length === 3 ? "md:col-span-1" : ""}
          />
        ))}
      </div>
    </section>
  );
}
