import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getSaleById, getSellers } from "@/server/queries/sales";
import { primaryImage } from "@/lib/product-images";
import { formatRut } from "@/lib/rut";
import { PageHeader } from "@/components/shared/page-header";
import { SaleForm } from "@/components/sales/sale-form";

export default async function EditSalePage({
  params,
}: PageProps<"/ventas/[id]/editar">) {
  const { id } = await params;
  const session = await auth();
  if (!session || !can(session.user.role, "sales:edit")) redirect(`/ventas/${id}`);

  const sale = await getSaleById(id);
  if (!sale) notFound();
  if (sale.cancelledAt) redirect(`/ventas/${id}`);

  const sellers = await getSellers();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Editar ${sale.code}`}
        description="Corrige productos, precios, descuentos o datos del comprador"
      />
      <SaleForm
        sellers={sellers}
        isAdmin={session.user.role === "ADMIN"}
        currentUserId={session.user.id}
        initialSale={{
          id: sale.id,
          items: sale.items.map((item) => ({
            productId: item.productId,
            name: item.product.name,
            brand: item.product.brand,
            model: item.product.model,
            imageUrl: primaryImage(item.product.images),
            stock: item.product.stock,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent,
            notes: item.notes ?? "",
          })),
          customer: sale.customer
            ? {
                name: sale.customer.name,
                rut: formatRut(sale.customer.rut),
                businessName: sale.customer.businessName ?? "",
              }
            : { name: "", rut: "", businessName: "" },
          paymentMethod: sale.paymentMethod ?? "Efectivo",
          notes: sale.notes ?? "",
        }}
      />
    </div>
  );
}
