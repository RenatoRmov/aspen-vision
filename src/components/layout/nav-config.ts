import type { Role } from "@/generated/prisma/enums";
import {
  LayoutDashboard,
  Glasses,
  ShoppingBag,
  Users,
  ShieldCheck,
  UserCog,
  Wallet,
  ChartNoAxesCombined,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: Role[]; // omit = visible to every role
};

// Roles with full operational access — everything except Usuarios and (for
// PREPARADOR) the accounting-only Cobranzas view granted below. CONTADORA is
// deliberately excluded: she only sees Cobranzas and Información Cobranzas.
const OPERATIONAL_ROLES: Role[] = ["ADMIN", "VENDEDOR", "PREPARADOR"];

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Resumen", icon: LayoutDashboard, roles: OPERATIONAL_ROLES },
  { href: "/inventario", label: "Inventario", icon: Glasses, roles: OPERATIONAL_ROLES },
  { href: "/ventas", label: "Ventas", icon: ShoppingBag, roles: OPERATIONAL_ROLES },
  { href: "/embajadores", label: "Embajadores", icon: Users, roles: OPERATIONAL_ROLES },
  { href: "/garantias", label: "Garantías", icon: ShieldCheck, roles: OPERATIONAL_ROLES },
  {
    href: "/cobranzas",
    label: "Cobranzas",
    icon: Wallet,
    roles: ["ADMIN", "PREPARADOR", "CONTADORA"],
  },
  {
    href: "/cobranzas/informacion",
    label: "Información Cobranzas",
    icon: ChartNoAxesCombined,
    roles: ["ADMIN", "PREPARADOR", "CONTADORA"],
  },
  { href: "/usuarios", label: "Usuarios", icon: UserCog, roles: ["ADMIN"] },
];

export function visibleNavItems(role: Role) {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
