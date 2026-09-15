"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function markNotificationRead(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  await db.notification.update({ where: { id }, data: { read: true } });
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  await db.notification.updateMany({
    where: {
      read: false,
      OR: [{ userId: session.user.id }, { userId: null, targetRole: session.user.role }],
    },
    data: { read: true },
  });
  revalidatePath("/", "layout");
}
