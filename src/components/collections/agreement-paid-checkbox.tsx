"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { markAgreementPaid, unmarkAgreementPaid } from "@/server/actions/collections";

export function AgreementPaidCheckbox({
  paymentId,
  paid,
}: {
  paymentId: string;
  paid: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onChange = async (checked: boolean) => {
    setLoading(true);
    try {
      if (checked) {
        await markAgreementPaid(paymentId);
        toast.success("Registrado como abono automáticamente");
      } else {
        await unmarkAgreementPaid(paymentId);
        toast.success("Marcado como no pagado — se eliminó el abono asociado");
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center">
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <input
          type="checkbox"
          checked={paid}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 cursor-pointer accent-primary"
          title={paid ? "Marcado como pagado" : "Marcar como pagado"}
        />
      )}
    </div>
  );
}
