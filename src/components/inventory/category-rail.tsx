"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export function CategoryRail({
  categories,
  totalActive,
}: {
  categories: { id: string; name: string; slug: string; _count: { products: number } }[];
  totalActive: number;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const activeSlug = searchParams.get("cat") ?? "";

  const linkFor = (slug: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) params.set("cat", slug);
    else params.delete("cat");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return (
    <nav className="w-full shrink-0 space-y-1 lg:w-56">
      <p className="px-2.5 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Categorías
      </p>
      <Link
        href={linkFor(null)}
        className={cn(
          "flex items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
          activeSlug === "" ? "bg-accent text-accent-foreground" : "hover:bg-muted",
        )}
      >
        <span className="flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Todas
        </span>
        <span className="text-xs text-muted-foreground">{totalActive}</span>
      </Link>
      {categories.map((c) => (
        <Link
          key={c.id}
          href={linkFor(c.slug)}
          className={cn(
            "flex items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
            activeSlug === c.slug ? "bg-accent text-accent-foreground" : "hover:bg-muted",
          )}
        >
          <span>{c.name}</span>
          <span className="text-xs text-muted-foreground">{c._count.products}</span>
        </Link>
      ))}
    </nav>
  );
}
