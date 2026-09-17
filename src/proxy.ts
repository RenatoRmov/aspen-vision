import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PUBLIC_PATHS = ["/login"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!req.auth && !isPublic) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (req.auth && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  // Contadora is accounting-only: she can't see any other tab (Resumen,
  // Inventario, Ventas, Embajadores, Garantías, Usuarios), only Cobranzas —
  // including the API routes Cobranzas itself calls (PDF export, Excel
  // import), which don't live under /cobranzas so they need to be listed
  // explicitly, or every action there breaks for her while looking fine for
  // every other role.
  const CONTADORA_ALLOWED_PREFIXES = ["/cobranzas", "/api/pdf/cobranzas", "/api/collections/import"];
  if (
    req.auth?.user.role === "CONTADORA" &&
    !CONTADORA_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.redirect(new URL("/cobranzas", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|uploads).*)"],
};
