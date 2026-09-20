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
import { updateActivityStatus } from "@/server/actions/customers";
import { ACTIVITY_STATUS_LABEL, type CustomerActivityStatus } from "@/lib/customers";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<CustomerActivityStatus, string> = {
  PENDIENTE: "text-[#8a5a00]",
  COMPLETADA: "text-status-good",
};

export function ActivityStatusSelect({
  activityId,
  status,
}: {
  activityId: string;
  status: CustomerActivityStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      items={ACTIVITY_STATUS_LABEL}
      value={status}
      disabled={isPending}
      onValueChange={(v) =>
        startTransition(async () => {
          try {
            await updateActivityStatus(activityId, v as CustomerActivityStatus);
            toast.success("Estado actualizado");
            router.refresh();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "No se pudo actualizar");
          }
        })
      }
    >
      <SelectTrigger size="sm" className={cn("w-32", STATUS_STYLE[status])}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(ACTIVITY_STATUS_LABEL).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
