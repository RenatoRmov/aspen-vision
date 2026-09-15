"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import type { Role } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { visibleNavItems } from "./nav-config";
import { AspenLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

export function MobileNav({
  role,
  pendingSalesCount,
}: {
  role: Role;
  pendingSalesCount: number;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = visibleNavItems(role);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" className="lg:hidden" />}
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-72 border-none bg-sidebar p-0 text-sidebar-foreground"
      >
        <div className="flex h-16 items-center px-6">
          <AspenLogo markClassName="text-sidebar-primary" />
        </div>
        <nav className="space-y-1 px-3 py-4">
          {items.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            const showBadge = item.href === "/ventas" && pendingSalesCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
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
      </SheetContent>
    </Sheet>
  );
}
