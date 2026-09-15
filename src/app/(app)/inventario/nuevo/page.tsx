import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getCategories } from "@/server/queries/products";
import { PageHeader } from "@/components/shared/page-header";
import { ProductForm } from "@/components/inventory/product-form";

export default async function NewProductPage() {
  const session = await auth();
  if (!session || !can(session.user.role, "inventory:manage")) redirect("/inventario");

  const categories = await getCategories();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo producto"
        description="Registra un lente en el catálogo de inventario"
      />
      <ProductForm categories={categories} />
    </div>
  );
}
