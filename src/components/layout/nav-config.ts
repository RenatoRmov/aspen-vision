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

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Resumen", icon: LayoutDashboard },
  { href: "/inventario", label: "Inventario", icon: Glasses },
  { href: "/ventas", label: "Ventas", icon: ShoppingBag },
  { href: "/embajadores", label: "Embajadores", icon: Users },
  { href: "/garantias", label: "Garantías", icon: ShieldCheck },
  { href: "/cobranzas", label: "Cobranzas", icon: Wallet, roles: ["ADMIN", "PREPARADOR"] },
  {
    href: "/cobranzas/informacion",
    label: "Información Cobranzas",
    icon: ChartNoAxesCombined,
    roles: ["ADMIN", "PREPARADOR"],
  },
  { href: "/usuarios", label: "Usuarios", icon: UserCog, roles: ["ADMIN"] },
];

export function visibleNavItems(role: Role) {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
