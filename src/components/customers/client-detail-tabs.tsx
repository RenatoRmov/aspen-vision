"use client";

import type { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function ClientDetailTabs({
  historial,
  seguimiento,
  cobranzas,
}: {
  historial: ReactNode;
  seguimiento: ReactNode;
  cobranzas: ReactNode;
}) {
  return (
    <Tabs defaultValue="seguimiento">
      <TabsList>
        <TabsTrigger value="historial">Historial de ventas</TabsTrigger>
        <TabsTrigger value="seguimiento">Seguimiento comercial</TabsTrigger>
        <TabsTrigger value="cobranzas">Cobranzas</TabsTrigger>
      </TabsList>
      <TabsContent value="historial" className="rounded-xl border bg-card">
        {historial}
      </TabsContent>
      <TabsContent value="seguimiento" className="rounded-xl border bg-card">
        {seguimiento}
      </TabsContent>
      <TabsContent value="cobranzas" className="rounded-xl border bg-card">
        {cobranzas}
      </TabsContent>
    </Tabs>
  );
}
