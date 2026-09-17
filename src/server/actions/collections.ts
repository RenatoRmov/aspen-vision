"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { can } from "@/lib/permissions";
import { canonicalRut } from "@/lib/rut";
import { computeCreditNoteTotals } from "@/lib/collections";

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

const checkSchema = z.object({
  label: z.string().trim().min(1),
  amount: z.coerce.number().int().positive(),
  numero: z.string().trim().optional(),
  banco: z.string().trim().optional(),
});

const paymentSchema = z.object({
  // ABONO = real money received, counts toward saldo. ACUERDO = just a
  // client's promise to pay by `date`, purely informational (see the
  // CollectionPayment model comment) — same shape either way. NOTA_CREDITO
  // has its own shape entirely (see creditNoteSchema below) and never goes
  // through this schema.
  kind: z.enum(["ABONO", "ACUERDO"]).default("ABONO"),
  date: z.coerce.date(),
  amount: z.coerce.number().int().positive("El monto debe ser mayor a 0"),
  method: z.string().trim().min(1, "Indica el método de pago"),
  note: z.string().trim().optional(),
  // Only meaningful when method is "Cheque" — see the model comment.
  checks: z.array(checkSchema).optional(),
});

export type CollectionPaymentInput = z.infer<typeof paymentSchema>;

export async function addCollectionPayment(
  collectionId: string,
  input: CollectionPaymentInput,
) {
  const session = await requireCollectionsAccess();
  const data = paymentSchema.parse(input);
  const hasChecks = data.method === "Cheque" && (data.checks?.length ?? 0) > 0;
  // The itemized cheques are the source of truth for the total when
  // present, so the payment amount can never drift from their sum.
  const amount = hasChecks
    ? data.checks!.reduce((sum, c) => sum + c.amount, 0)
    : data.amount;

  const collection = await db.collection.findUnique({ where: { id: collectionId } });
  if (!collection) throw new Error("La cobranza no existe");

  await db.collectionPayment.create({
    data: {
      collectionId,
      kind: data.kind,
      date: data.date,
      amount,
      method: data.method,
      checks: hasChecks ? data.checks : undefined,
      note: data.note || null,
      createdById: session.user.id,
    },
  });

  revalidatePath(`/cobranzas/${collectionId}`);
  revalidatePath("/cobranzas");
}

export async function updateCollectionPayment(
  paymentId: string,
  input: CollectionPaymentInput,
) {
  await requireCollectionsAccess();
  const data = paymentSchema.parse(input);
  const hasChecks = data.method === "Cheque" && (data.checks?.length ?? 0) > 0;
  const amount = hasChecks
    ? data.checks!.reduce((sum, c) => sum + c.amount, 0)
    : data.amount;

  const existing = await db.collectionPayment.findUnique({ where: { id: paymentId } });
  if (!existing) throw new Error("El registro no existe");

  await db.collectionPayment.update({
    where: { id: paymentId },
    // kind is intentionally left untouched here — editing corrects amounts/
    // dates/etc, it never turns an abono into an acuerdo or vice versa.
    data: {
      date: data.date,
      amount,
      method: data.method,
      checks: hasChecks ? data.checks : Prisma.JsonNull,
      note: data.note || null,
    },
  });

  revalidatePath(`/cobranzas/${existing.collectionId}`);
  revalidatePath("/cobranzas");
}

export async function deleteCollectionPayment(paymentId: string) {
  await requireCollectionsAccess();
  const payment = await db.collectionPayment.delete({ where: { id: paymentId } });
  // If this was the abono that fulfilled a promise, the promise goes back
  // to unfulfilled instead of silently pointing at a payment that's gone
  // (the FK's ON DELETE SET NULL already cleared the link itself).
  if (payment.fulfillsAgreementId) {
    await db.collectionPayment.update({
      where: { id: payment.fulfillsAgreementId },
      data: { paid: false },
    });
  }
  revalidatePath(`/cobranzas/${payment.collectionId}`);
  revalidatePath("/cobranzas");
}

const creditItemSchema = z.object({
  modelo: z.string().trim().min(1, "Indica el modelo"),
  cantidad: z.coerce.number().int().positive("Cantidad inválida"),
  valorUnitario: z.coerce.number().int().positive("Valor inválido"),
});

const creditNoteSchema = z.object({
  date: z.coerce.date(),
  note: z.string().trim().optional(),
  items: z.array(creditItemSchema).min(1, "Agrega al menos un modelo"),
});

export type CreditNoteInput = z.infer<typeof creditNoteSchema>;

/** A nota de crédito can never credit back more than the document is
 * actually worth — guards against the effective total going negative. */
async function assertCreditNoteFits(collectionId: string, amount: number, excludePaymentId?: string) {
  const collection = await db.collection.findUnique({
    where: { id: collectionId },
    include: { payments: { where: { kind: "NOTA_CREDITO" }, select: { id: true, amount: true } } },
  });
  if (!collection) throw new Error("La cobranza no existe");

  const existingTotal = collection.payments
    .filter((p) => p.id !== excludePaymentId)
    .reduce((s, p) => s + p.amount, 0);

  if (existingTotal + amount > collection.totalAmount) {
    throw new Error("El total de notas de crédito no puede superar el Monto Total del documento");
  }
}

export async function addCreditNote(collectionId: string, input: CreditNoteInput) {
  const session = await requireCollectionsAccess();
  const data = creditNoteSchema.parse(input);
  // `amount` (what's actually deducted from Monto Total/saldo) is the
  // bruto+IVA total — the items themselves are net-of-tax, same as a sale.
  const { total: amount } = computeCreditNoteTotals(data.items);
  await assertCreditNoteFits(collectionId, amount);

  await db.collectionPayment.create({
    data: {
      collectionId,
      kind: "NOTA_CREDITO",
      date: data.date,
      amount,
      method: "Nota de crédito",
      creditItems: data.items,
      note: data.note || null,
      createdById: session.user.id,
    },
  });

  revalidatePath(`/cobranzas/${collectionId}`);
  revalidatePath("/cobranzas");
}

export async function updateCreditNote(paymentId: string, input: CreditNoteInput) {
  await requireCollectionsAccess();
  const data = creditNoteSchema.parse(input);
  const { total: amount } = computeCreditNoteTotals(data.items);

  const existing = await db.collectionPayment.findUnique({ where: { id: paymentId } });
  if (!existing) throw new Error("El registro no existe");
  await assertCreditNoteFits(existing.collectionId, amount, paymentId);

  await db.collectionPayment.update({
    where: { id: paymentId },
    data: {
      date: data.date,
      amount,
      creditItems: data.items,
      note: data.note || null,
    },
  });

  revalidatePath(`/cobranzas/${existing.collectionId}`);
  revalidatePath("/cobranzas");
}

/** Checking "Pagado" on an acuerdo comercial creates the matching abono for
 * you instead of asking the same date/amount/method/checks to be re-entered. */
export async function markAgreementPaid(paymentId: string) {
  const session = await requireCollectionsAccess();
  const agreement = await db.collectionPayment.findUnique({ where: { id: paymentId } });
  if (!agreement) throw new Error("El acuerdo no existe");
  if (agreement.kind !== "ACUERDO") throw new Error("Esto no es un acuerdo comercial");
  if (agreement.paid) return;

  await db.$transaction(async (tx) => {
    await tx.collectionPayment.create({
      data: {
        collectionId: agreement.collectionId,
        kind: "ABONO",
        date: agreement.date,
        amount: agreement.amount,
        method: agreement.method,
        checks: agreement.checks ?? undefined,
        note: agreement.note,
        createdById: session.user.id,
        fulfillsAgreementId: agreement.id,
      },
    });
    await tx.collectionPayment.update({
      where: { id: agreement.id },
      data: { paid: true },
    });
  });

  revalidatePath(`/cobranzas/${agreement.collectionId}`);
  revalidatePath("/cobranzas");
}

/** Unchecking "Pagado" undoes markAgreementPaid: removes the abono it
 * created and resets the promise back to unfulfilled. */
export async function unmarkAgreementPaid(paymentId: string) {
  await requireCollectionsAccess();
  const agreement = await db.collectionPayment.findUnique({
    where: { id: paymentId },
    include: { fulfilledBy: true },
  });
  if (!agreement) throw new Error("El acuerdo no existe");
  if (!agreement.paid) return;

  await db.$transaction(async (tx) => {
    if (agreement.fulfilledBy) {
      await tx.collectionPayment.delete({ where: { id: agreement.fulfilledBy.id } });
    }
    await tx.collectionPayment.update({
      where: { id: agreement.id },
      data: { paid: false },
    });
  });

  revalidatePath(`/cobranzas/${agreement.collectionId}`);
  revalidatePath("/cobranzas");
}
