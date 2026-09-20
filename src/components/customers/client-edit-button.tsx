"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientFormDialog, type ClientEditData } from "@/components/customers/client-form-dialog";

export function ClientEditButton({
  client,
  canAssignSeller,
  sellers,
}: {
  client: ClientEditData;
  canAssignSeller: boolean;
  sellers: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" />
        Editar
      </Button>
      <ClientFormDialog
        open={open}
        onOpenChange={setOpen}
        initial={client}
        canAssignSeller={canAssignSeller}
        sellers={sellers}
      />
    </>
  );
}
