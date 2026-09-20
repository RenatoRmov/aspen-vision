import Link from "next/link";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

export type BirthdayRow = {
  customer: { id: string; name: string; city: string | null; phone: string | null };
};

export function BirthdaysList({ rows }: { rows: BirthdayRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Nadie cumple años hoy.</p>;
  }

  return (
    <ul className="space-y-3">
      {rows.map(({ customer: c }) => (
        <li key={c.id} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-[#d55181]" />
            <div>
              <Link href={`/clientes/${c.id}`} className="font-medium hover:underline">
                {c.name}
              </Link>
              <p className="text-xs text-muted-foreground">{c.city || "—"}</p>
            </div>
          </div>
          {c.phone && (
            <Button
              size="sm"
              variant="outline"
              render={
                <a
                  href={`https://wa.me/${c.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                    "¡Feliz cumpleaños de parte de todo el equipo!",
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                />
              }
              nativeButton={false}
            >
              Enviar saludo
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
