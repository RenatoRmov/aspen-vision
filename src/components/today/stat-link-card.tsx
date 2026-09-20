import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";

/** A StatCard with a "Ver lista →" link underneath — StatCard itself has no
 * link slot, so this wraps it rather than modifying the shared component. */
export function StatLinkCard({
  label,
  value,
  icon,
  hint,
  tone,
  href,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  tone?: "default" | "warning" | "critical" | "good";
  href: string;
}) {
  return (
    <div className="space-y-2">
      <StatCard label={label} value={value} icon={icon} hint={hint} tone={tone} />
      <Link href={href} className="block text-xs font-medium text-primary hover:underline">
        Ver lista →
      </Link>
    </div>
  );
}
