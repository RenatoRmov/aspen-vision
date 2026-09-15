import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getCategories, getProductWithHistory } from "@/server/queries/products";
import { PageHeader } from "@/components/shared/page-header";
import { ProductForm } from "@/components/inventory/product-form";
import { parseImages } from "@/lib/product-images";

export default async function EditProductPage({
  params,
}: PageProps<"/inventario/[id]/editar">) {
  const { id } = await params;
  const session = await auth();
  if (!session || !can(session.user.role, "inventory:manage")) redirect(`/inventario/${id}`);

  const [data, categories] = await Promise.all([
    getProductWithHistory(id),
    getCategories(),
  ]);
  if (!data) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Editar ${data.product.name}`}
        description="Actualiza la información del producto"
      />
      <ProductForm
        categories={categories}
        product={{ ...data.product, images: parseImages(data.product.images) }}
      />
    </div>
  );
}
