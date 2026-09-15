"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

export function SalesTabs({ pendingCount }: { pendingCount: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "todas";

  const setTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "todas") params.delete("tab");
    else params.set("tab", value);
    router.push(`${pathname}?${params.toString()}`);
  };

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (q) params.set("q", q);
      else params.delete("q");
      if (q !== (searchParams.get("q") ?? "")) router.push(`${pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="pendientes">
            Pendientes{pendingCount > 0 && ` (${pendingCount})`}
          </TabsTrigger>
          <TabsTrigger value="confirmadas">Confirmadas</TabsTrigger>
        </TabsList>
      </Tabs>
      <Input
        placeholder="Buscar por código, cliente o vendedor…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="sm:max-w-xs"
      />
    </div>
  );
}
