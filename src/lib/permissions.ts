import type { Role } from "@/generated/prisma/enums";

/**
 * Central capability map. Keep this the single source of truth for "who can
 * do what" so screens and API routes never hardcode role checks inline.
 * Grows easily: add a capability here, use `can(role, "capability")` anywhere.
 */
const CAPABILITIES = {
  "inventory:manage": ["ADMIN", "PREPARADOR"], // create/edit products, register entradas, ajustes
  "sales:create": ["ADMIN", "VENDEDOR", "PREPARADOR"],
  "sales:view-all": ["ADMIN", "PREPARADOR"], // vendedor only sees their own sales
  "sales:confirm": ["ADMIN", "PREPARADOR"],
  "sales:cancel": ["ADMIN"],
  "sales:edit": ["ADMIN"], // correcting an already-registered sale (items, prices, discounts)
  "ambassadors:manage": ["ADMIN", "PREPARADOR"],
  "warranties:manage": ["ADMIN", "PREPARADOR"],
  "users:manage": ["ADMIN"],
  "reports:view": ["ADMIN", "PREPARADOR"],
  "collections:manage": ["ADMIN", "PREPARADOR", "CONTADORA"],
  "customers:manage": ["ADMIN", "VENDEDOR", "PREPARADOR"], // view + create/edit clients, log seguimiento
  "customers:view-all": ["ADMIN", "PREPARADOR"], // vendedor only sees/acts on clients assigned to them
} as const satisfies Record<string, readonly Role[]>;

export type Capability = keyof typeof CAPABILITIES;

export function can(role: Role, capability: Capability): boolean {
  return (CAPABILITIES[capability] as readonly Role[]).includes(role);
}

export const roleLabel: Record<Role, string> = {
  ADMIN: "Administrador",
  VENDEDOR: "Vendedor",
  PREPARADOR: "Preparador",
  CONTADORA: "Contadora",
};
