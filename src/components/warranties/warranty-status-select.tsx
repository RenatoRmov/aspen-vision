"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateWarrantyStatus } from "@/server/actions/warranties";
import { cn } from "@/lib/utils";

const STATUS_LABEL = {
  PENDIENTE: "Pendiente",
  RESUELTA: "Resuelta",
  RECHAZADA: "Rechazada",
};

const STATUS_STYLE: Record<string, string> = {
  PENDIENTE: "text-[#8a5a00]",
  RESUELTA: "text-status-good",
  RECHAZADA: "text-status-critical",
};

export function WarrantyStatusSelect({
  warrantyId,
  status,
  canManage,
}: {
  warrantyId: string;
  status: "PENDIENTE" | "RESUELTA" | "RECHAZADA";
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!canManage) {
    return <span className={cn("text-sm font-medium", STATUS_STYLE[status])}>{STATUS_LABEL[status]}</span>;
  }

  return (
    <Select
      items={STATUS_LABEL}
      value={status}
      disabled={isPending}
      onValueChange={(v) =>
        startTransition(async () => {
          await updateWarrantyStatus(warrantyId, v as typeof status);
          toast.success("Estado actualizado");
          router.refresh();
        })
      }
    >
      <SelectTrigger size="sm" className={cn("w-36", STATUS_STYLE[status])}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(STATUS_LABEL).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
