"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientFormDialog } from "@/components/customers/client-form-dialog";

export function AddClientButton({
  canAssignSeller,
  sellers,
}: {
  canAssignSeller: boolean;
  sellers: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Nuevo cliente
      </Button>
      <ClientFormDialog
        open={open}
        onOpenChange={setOpen}
        canAssignSeller={canAssignSeller}
        sellers={sellers}
      />
    </>
  );
}
