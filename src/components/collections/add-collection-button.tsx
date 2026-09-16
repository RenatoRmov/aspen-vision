"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollectionFormDialog } from "@/components/collections/collection-form-dialog";

export function AddCollectionButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Agregar cobranza
      </Button>
      <CollectionFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
