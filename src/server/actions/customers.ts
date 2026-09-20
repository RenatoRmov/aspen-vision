"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { canonicalRut } from "@/lib/rut";

async function requireCustomersAccess() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  if (!can(session.user.role, "customers:manage")) {
    throw new Error("No tienes permisos para gestionar clientes");
  }
  return session;
}

/** A Vendedor (lacking customers:view-all) can only act on their own assigned
 * clients — re-verified server-side on every write, not just at read time,
 * so knowing another vendedor's client id isn't enough to edit/log against it. */
async function requireClientAccess(
  session: Awaited<ReturnType<typeof requireCustomersAccess>>,
  customerId: string,
) {
  const canViewAll = can(session.user.role, "customers:view-all");
  const customer = await db.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new Error("El cliente no existe");
  if (!canViewAll && customer.assignedSellerId !== session.user.id) {
    throw new Error("No tienes permisos sobre este cliente");
  }
  return customer;
}

const clientSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  rut: z.string().trim().min(3, "El RUT es obligatorio"),
  businessName: z.string().trim().optional(),
  city: z.string().trim().optional(),
  contactName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Correo inválido").optional().or(z.literal("")),
  birthdayMonth: z.coerce.number().int().min(1).max(12).optional(),
  birthdayDay: z.coerce.number().int().min(1).max(31).optional(),
  customerSince: z.coerce.date().optional(),
  paymentTermsDays: z.coerce.number().int().min(0).optional(),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  // Only ever read/written by roles with customers:view-all — see below.
  assignedSellerId: z.string().trim().optional(),
});

export type ClientInput = z.infer<typeof clientSchema>;

function normalize(data: ClientInput) {
  return {
    name: data.name,
    rut: canonicalRut(data.rut),
    businessName: data.businessName || null,
    city: data.city || null,
    contactName: data.contactName || null,
    phone: data.phone || null,
    email: data.email || null,
    birthdayMonth: data.birthdayMonth ?? null,
    birthdayDay: data.birthdayDay ?? null,
    customerSince: data.customerSince ?? null,
    paymentTermsDays: data.paymentTermsDays ?? null,
    discountPercent: data.discountPercent,
  };
}

export async function createClient(input: ClientInput) {
  const session = await requireCustomersAccess();
  const data = clientSchema.parse(input);
  const canViewAll = can(session.user.role, "customers:view-all");

  const existing = await db.customer.findUnique({ where: { rut: canonicalRut(data.rut) } });
  if (existing) throw new Error("Ya existe un cliente con ese RUT.");

  // A Vendedor can only ever create clients assigned to themself.
  const assignedSellerId = canViewAll ? data.assignedSellerId || null : session.user.id;

  const customer = await db.customer.create({
    data: { ...normalize(data), assignedSellerId },
  });
  revalidatePath("/clientes");
  revalidatePath("/hoy");
  return customer.id;
}

export async function updateClient(id: string, input: ClientInput) {
  const session = await requireCustomersAccess();
  const customer = await requireClientAccess(session, id);
  const data = clientSchema.parse(input);
  const canViewAll = can(session.user.role, "customers:view-all");

  const rut = canonicalRut(data.rut);
  if (rut !== customer.rut) {
    const clash = await db.customer.findUnique({ where: { rut } });
    if (clash) throw new Error("Ya existe otro cliente con ese RUT.");
  }

  await db.customer.update({
    where: { id },
    data: {
      ...normalize(data),
      // Only Admin/Preparador can reassign a client to a different vendedor
      // — a Vendedor's own edit form never sends/applies this field.
      ...(canViewAll ? { assignedSellerId: data.assignedSellerId || null } : {}),
    },
  });
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  revalidatePath("/hoy");
}

export async function deleteClient(id: string) {
  const session = await requireCustomersAccess();
  await requireClientAccess(session, id);
  await db.customer.delete({ where: { id } });
  revalidatePath("/clientes");
  revalidatePath("/hoy");
}

const activitySchema = z.object({
  customerId: z.string().min(1),
  date: z.coerce.date(),
  type: z.enum(["VISITA", "LLAMADA", "WHATSAPP"]),
  summary: z.string().trim().min(1, "Indica un resumen"),
  nextAction: z.string().trim().optional(),
  nextActionDate: z.coerce.date().optional(),
});

export type ActivityInput = z.infer<typeof activitySchema>;

export async function createActivity(input: ActivityInput) {
  const session = await requireCustomersAccess();
  const data = activitySchema.parse(input);
  await requireClientAccess(session, data.customerId);

  await db.customerActivity.create({
    data: {
      customerId: data.customerId,
      date: data.date,
      type: data.type,
      summary: data.summary,
      nextAction: data.nextAction || null,
      nextActionDate: data.nextActionDate ?? null,
      createdById: session.user.id,
    },
  });
  revalidatePath(`/clientes/${data.customerId}`);
  revalidatePath("/clientes");
  revalidatePath("/hoy");
}

export async function updateActivityStatus(
  activityId: string,
  status: "PENDIENTE" | "COMPLETADA",
) {
  const session = await requireCustomersAccess();
  const activity = await db.customerActivity.findUnique({ where: { id: activityId } });
  if (!activity) throw new Error("La actividad no existe");
  await requireClientAccess(session, activity.customerId);

  await db.customerActivity.update({ where: { id: activityId }, data: { status } });
  revalidatePath(`/clientes/${activity.customerId}`);
  revalidatePath("/clientes");
  revalidatePath("/hoy");
}
