import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Vercel deployments don't have a fixed known origin ahead of time, so
  // NextAuth needs to trust the incoming Host header to build callback URLs.
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
        if (!user || !user.active) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: Role }).role;
        return token;
      }
      // Revalidate on every request: if the account behind this token was
      // removed or deactivated since it was issued (e.g. a database
      // migration, or an admin deactivating the user), invalidate it
      // instead of silently keeping a session that points at a user id
      // which no longer exists — every write that stamps a row with
      // session.user.id (audit trails like CollectionPayment.createdById)
      // would otherwise fail with a confusing foreign-key error.
      if (!token.id) return token;
      // Fail OPEN, not closed: a transient DB hiccup here must never log a
      // real user out mid-session — only an actually-missing/inactive user
      // should invalidate the token.
      try {
        const stillValid = await db.user.findUnique({
          where: { id: token.id as string },
          select: { active: true },
        });
        if (!stillValid || !stillValid.active) return null;
      } catch (err) {
        console.error("Session revalidation check failed, keeping session:", err);
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
});
