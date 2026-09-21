import type { Role } from "@/generated/prisma/enums";
import {
  LayoutDashboard,
  ListChecks,
  Glasses,
  ShoppingBag,
  Users,
  Contact,
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
// Management-only areas: VENDEDOR doesn't get Resumen, Embajadores, or
// Garantías — their day-to-day tools are Hoy/Ventas/Clientes.
const MANAGEMENT_ROLES: Role[] = ["ADMIN", "PREPARADOR"];

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Resumen", icon: LayoutDashboard, roles: MANAGEMENT_ROLES },
  { href: "/hoy", label: "Hoy", icon: ListChecks, roles: OPERATIONAL_ROLES },
  { href: "/inventario", label: "Inventario", icon: Glasses, roles: OPERATIONAL_ROLES },
  { href: "/ventas", label: "Ventas", icon: ShoppingBag, roles: OPERATIONAL_ROLES },
  { href: "/clientes", label: "Clientes", icon: Contact, roles: OPERATIONAL_ROLES },
  { href: "/embajadores", label: "Embajadores", icon: Users, roles: MANAGEMENT_ROLES },
  { href: "/garantias", label: "Garantías", icon: ShieldCheck, roles: MANAGEMENT_ROLES },
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
