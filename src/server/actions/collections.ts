"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { canonicalRut } from "@/lib/rut";

async function requireCollectionsAccess() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  if (!can(session.user.role, "collections:manage")) {
    throw new Error("No tienes permisos para gestionar cobranzas");
  }
  return session;
}

const collectionSchema = z.object({
  // Ciudad is genuinely blank on some rows in real SII exports, so it can't
  // be required like the other columns — the UI already renders it as "—"
  // when empty.
  city: z.string().trim().optional().default(""),
  clientRut: z.string().trim().min(1, "El RUT es obligatorio"),
  businessName: z.string().trim().min(1, "La razón social es obligatoria"),
  folio: z.string().trim().min(1, "El folio es obligatorio"),
  documentDate: z.coerce.date(),
  netAmount: z.coerce.number().int().min(0),
  taxAmount: z.coerce.number().int().min(0),
  totalAmount: z.coerce.number().int().min(0),
});

export type CollectionInput = z.infer<typeof collectionSchema>;

function normalize(data: CollectionInput) {
  return { ...data, clientRut: canonicalRut(data.clientRut) };
}

export async function createCollection(input: CollectionInput) {
  await requireCollectionsAccess();
  const data = normalize(collectionSchema.parse(input));

  const collection = await db.collection.create({ data });
  revalidatePath("/cobranzas");
  return collection.id;
}

export async function updateCollection(id: string, input: CollectionInput) {
  await requireCollectionsAccess();
  const data = normalize(collectionSchema.parse(input));

  await db.collection.update({ where: { id }, data });
  revalidatePath("/cobranzas");
  revalidatePath(`/cobranzas/${id}`);
}

export async function deleteCollection(id: string) {
  await requireCollectionsAccess();
  await db.collection.delete({ where: { id } });
  revalidatePath("/cobranzas");
}

export async function createCollectionsBulk(items: CollectionInput[]) {
  await requireCollectionsAccess();
  if (items.length === 0) return 0;

  const data = items.map((item) => normalize(collectionSchema.parse(item)));
  const result = await db.collection.createMany({ data });
  revalidatePath("/cobranzas");
  return result.count;
}

const paymentSchema = z.object({
  date: z.coerce.date(),
  amount: z.coerce.number().int().positive("El monto debe ser mayor a 0"),
  method: z.string().trim().min(1, "Indica el método de pago"),
  note: z.string().trim().optional(),
});

export type CollectionPaymentInput = z.infer<typeof paymentSchema>;

export async function addCollectionPayment(
  collectionId: string,
  input: CollectionPaymentInput,
) {
  const session = await requireCollectionsAccess();
  const data = paymentSchema.parse(input);

  const collection = await db.collection.findUnique({ where: { id: collectionId } });
  if (!collection) throw new Error("La cobranza no existe");

  await db.collectionPayment.create({
    data: {
      collectionId,
      date: data.date,
      amount: data.amount,
      method: data.method,
      note: data.note || null,
      createdById: session.user.id,
    },
  });

  revalidatePath(`/cobranzas/${collectionId}`);
  revalidatePath("/cobranzas");
}

export async function deleteCollectionPayment(paymentId: string) {
  await requireCollectionsAccess();
  const payment = await db.collectionPayment.delete({ where: { id: paymentId } });
  revalidatePath(`/cobranzas/${payment.collectionId}`);
  revalidatePath("/cobranzas");
}
