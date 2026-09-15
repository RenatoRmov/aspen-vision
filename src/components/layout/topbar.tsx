import type { Role } from "@/generated/prisma/enums";
import { MobileNav } from "./mobile-nav";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";
import { GlobalScan } from "./global-scan";

export function Topbar({
  name,
  role,
  pendingSalesCount,
  notifications,
}: {
  name: string;
  role: Role;
  pendingSalesCount: number;
  notifications: {
    id: string;
    title: string;
    message: string;
    link: string | null;
    createdAt: Date;
    type: string;
  }[];
}) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-card px-4 sm:px-6">
      <MobileNav role={role} pendingSalesCount={pendingSalesCount} />
      <div className="flex-1">
        <GlobalScan />
      </div>
      <NotificationBell items={notifications} />
      <UserMenu name={name} role={role} />
    </header>
  );
}
