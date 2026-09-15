"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";

const userSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  email: z.email("Correo inválido").transform((v) => v.toLowerCase().trim()),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  role: z.enum(["ADMIN", "VENDEDOR", "PREPARADOR"]),
});

async function requireUserManager() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");
  if (!can(session.user.role, "users:manage")) {
    throw new Error("No tienes permisos para gestionar usuarios");
  }
  return session.user;
}

export async function createUser(input: z.infer<typeof userSchema>) {
  await requireUserManager();
  const data = userSchema.parse(input);

  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("Ya existe un usuario con ese correo.");

  const passwordHash = await bcrypt.hash(data.password, 10);
  await db.user.create({
    data: { name: data.name, email: data.email, passwordHash, role: data.role },
  });

  revalidatePath("/usuarios");
}

export async function setUserActive(userId: string, active: boolean) {
  await requireUserManager();
  await db.user.update({ where: { id: userId }, data: { active } });
  revalidatePath("/usuarios");
}

export async function updateUserRole(
  userId: string,
  role: "ADMIN" | "VENDEDOR" | "PREPARADOR",
) {
  await requireUserManager();
  await db.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/usuarios");
}
