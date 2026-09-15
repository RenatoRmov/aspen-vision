import "server-only";
import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";

export async function getNotificationsForUser(userId: string, role: Role) {
  return db.notification.findMany({
    where: {
      read: false,
      OR: [{ userId }, { userId: null, targetRole: role }],
    },
    orderBy: { createdAt: "desc" },
    take: 15,
  });
}
