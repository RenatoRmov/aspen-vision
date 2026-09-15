import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { UsersTable } from "@/components/users/users-table";
import { CreateUserDialog } from "@/components/users/create-user-dialog";

export default async function UsersPage() {
  const session = await auth();
  if (!session || !can(session.user.role, "users:manage")) redirect("/");

  const users = await db.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        description="Administra el equipo y sus permisos de acceso"
        actions={<CreateUserDialog />}
      />
      <UsersTable users={users} currentUserId={session.user.id} />
    </div>
  );
}
