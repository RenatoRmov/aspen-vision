"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarRange } from "lucide-react";
import { RANGE_LABEL, type RangeKey } from "@/lib/date-range";
import { cn } from "@/lib/utils";

const OPTIONS: RangeKey[] = ["today", "week", "month", "year"];

export function PeriodFilter({ current }: { current: RangeKey }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");

  const setRange = (range: string, extra?: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    if (extra) {
      Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    } else {
      params.delete("from");
      params.delete("to");
    }
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1">
      {OPTIONS.map((opt) => (
        <Button
          key={opt}
          size="sm"
          variant={current === opt ? "default" : "ghost"}
          onClick={() => setRange(opt)}
          className="h-8"
        >
          {RANGE_LABEL[opt]}
        </Button>
      ))}
      <Popover>
        <PopoverTrigger
          render={
            <Button
              size="sm"
              variant={current === "custom" ? "default" : "ghost"}
              className="h-8 gap-1.5"
            />
          }
        >
          <CalendarRange className="h-3.5 w-3.5" />
          Personalizado
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Desde</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Hasta</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <Button
            size="sm"
            className={cn("w-full")}
            disabled={!from || !to}
            onClick={() => setRange("custom", { from, to })}
          >
            Aplicar rango
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
