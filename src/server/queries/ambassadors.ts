import "server-only";
import { db } from "@/lib/db";

export async function getAmbassadors() {
  const ambassadors = await db.ambassador.findMany({
    orderBy: { name: "asc" },
    include: {
      deliveries: {
        include: { items: true },
        orderBy: { date: "desc" },
      },
    },
  });

  return ambassadors.map((a) => ({
    ...a,
    totalUnits: a.deliveries.reduce(
      (sum, d) => sum + d.items.reduce((s, i) => s + i.quantity, 0),
      0,
    ),
    lastDeliveryDate: a.deliveries[0]?.date ?? null,
  }));
}

export async function getAmbassadorWithHistory(id: string) {
  const ambassador = await db.ambassador.findUnique({
    where: { id },
    include: {
      deliveries: {
        orderBy: { date: "desc" },
        include: {
          items: { include: { product: true } },
          deliveredBy: true,
        },
      },
    },
  });
  if (!ambassador) return null;

  const totalUnits = ambassador.deliveries.reduce(
    (sum, d) => sum + d.items.reduce((s, i) => s + i.quantity, 0),
    0,
  );

  return { ambassador, totalUnits };
}
