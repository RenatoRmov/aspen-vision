import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getNotificationsForUser } from "@/server/queries/notifications";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [pendingSalesCount, notifications] = await Promise.all([
    db.sale.count({ where: { status: "PENDIENTE_CONFIRMACION" } }),
    getNotificationsForUser(session.user.id, session.user.role),
  ]);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar role={session.user.role} pendingSalesCount={pendingSalesCount} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          name={session.user.name ?? session.user.email ?? "Usuario"}
          role={session.user.role}
          pendingSalesCount={pendingSalesCount}
          notifications={notifications}
        />
        <main className="flex-1 overflow-y-auto bg-background px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
