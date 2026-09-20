"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

export type ClientCounts = {
  all: number;
  ACTIVO: number;
  SEGUIMIENTO: number;
  EN_RIESGO: number;
  conDeuda: number;
  visitarSemana: number;
};

export function ClientFilters({ counts }: { counts: ClientCounts }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? "all";

  const setTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("tab");
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
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">Todos ({counts.all})</TabsTrigger>
          <TabsTrigger value="ACTIVO">Activos ({counts.ACTIVO})</TabsTrigger>
          <TabsTrigger value="SEGUIMIENTO">Seguimiento ({counts.SEGUIMIENTO})</TabsTrigger>
          <TabsTrigger value="EN_RIESGO">En riesgo ({counts.EN_RIESGO})</TabsTrigger>
          <TabsTrigger value="con-deuda">Con deuda ({counts.conDeuda})</TabsTrigger>
          <TabsTrigger value="visitar-semana">Visitar esta semana ({counts.visitarSemana})</TabsTrigger>
        </TabsList>
      </Tabs>
      <Input
        placeholder="Buscar cliente, RUT, ciudad…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="sm:max-w-xs"
      />
    </div>
  );
}
