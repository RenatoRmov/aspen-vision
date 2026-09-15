"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";
import { visibleNavItems } from "./nav-config";
import { AspenLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function Sidebar({
  role,
  pendingSalesCount,
}: {
  role: Role;
  pendingSalesCount: number;
}) {
  const pathname = usePathname();
  const items = visibleNavItems(role);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-16 items-center px-6">
        <AspenLogo markClassName="text-sidebar-primary" />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          const showBadge = item.href === "/ventas" && pendingSalesCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground",
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
              )}
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="flex-1">{item.label}</span>
              {showBadge && (
                <Badge className="h-5 min-w-5 justify-center rounded-full bg-status-warning px-1 text-[11px] text-black">
                  {pendingSalesCount}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-6 py-4 text-xs text-sidebar-foreground/50">
        Aspen Vision · Gestión interna
      </div>
    </aside>
  );
}
