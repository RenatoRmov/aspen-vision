"use client";

import { useTransition } from "react";
import { Bell, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/actions/notifications";
import Link from "next/link";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  link: string | null;
  createdAt: Date;
  type: string;
};

const TYPE_DOT: Record<string, string> = {
  VENTA_PENDIENTE: "bg-status-warning",
  STOCK_BAJO: "bg-status-serious",
  STOCK_AGOTADO: "bg-status-critical",
  GENERAL: "bg-chart-1",
};

export function NotificationBell({ items }: { items: NotificationItem[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="icon" className="relative" />}>
        <Bell className="h-[18px] w-[18px]" />
        {items.length > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-status-critical" />
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-medium">Notificaciones</p>
          {items.length > 0 && (
            <button
              disabled={isPending}
              onClick={() => startTransition(() => markAllNotificationsRead())}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Check className="h-3 w-3" /> Marcar todo leído
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No tienes notificaciones pendientes.
            </p>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.link ?? "#"}
                    onClick={() =>
                      startTransition(() => markNotificationRead(n.id))
                    }
                    className="flex gap-3 px-4 py-3 text-sm hover:bg-muted/60"
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        TYPE_DOT[n.type] ?? "bg-chart-1",
                      )}
                    />
                    <span className="space-y-0.5">
                      <span className="block font-medium">{n.title}</span>
                      <span className="block text-muted-foreground">
                        {n.message}
                      </span>
                      <span className="block text-xs text-muted-foreground/70">
                        {formatDistanceToNow(n.createdAt, {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
