"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollectionFormDialog } from "@/components/collections/collection-form-dialog";
import { DeleteCollectionButton } from "@/components/collections/delete-collection-button";

export function CollectionRowActions({
  collection,
  redirectAfterDeleteTo,
}: {
  collection: {
    id: string;
    city: string;
    clientRut: string;
    businessName: string;
    folio: string;
    documentDate: Date;
    netAmount: number;
    taxAmount: number;
  };
  /** Navigate here after deleting (used on the detail page, where staying put makes no sense). */
  redirectAfterDeleteTo?: string;
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="flex items-center justify-end gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setEditOpen(true)}
        title="Editar cobranza"
      >
        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
      <DeleteCollectionButton
        collectionId={collection.id}
        folio={collection.folio}
        redirectTo={redirectAfterDeleteTo}
      />

      <CollectionFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={{
          id: collection.id,
          city: collection.city,
          clientRut: collection.clientRut,
          businessName: collection.businessName,
          folio: collection.folio,
          documentDate: collection.documentDate.toISOString().slice(0, 10),
          netAmount: collection.netAmount,
          taxAmount: collection.taxAmount,
        }}
      />
    </div>
  );
}
