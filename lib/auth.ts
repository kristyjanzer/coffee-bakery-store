import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { AdminRole } from "@/types/next-auth";

export interface AuthenticatedAdmin {
  id: string;
  email: string;
  role: AdminRole;
}

// Хэш заведомо несуществующего пароля — bcrypt.compare всё равно вызывается, даже
// если email не найден в БД, чтобы оба случая ("нет такого админа" / "неверный
// пароль") занимали одинаковое время и не позволяли перебором узнавать, какие
// email вообще зарегистрированы (timing attack).
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("no-such-admin", 10);

// Логика проверки логина/пароля (docs/plan.md, пункт 31) — вынесена из authorize()
// в отдельную функцию, чтобы её можно было протестировать без поднятия всего
// NextAuth-провайдера, как createOrder() в lib/orderCreation.ts.
export async function verifyAdminCredentials(
  email: string,
  password: string
): Promise<AuthenticatedAdmin | null> {
  const admin = await prisma.adminUser.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  const isValid = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_PASSWORD_HASH);

  if (!admin || !isValid) {
    return null;
  }

  return { id: String(admin.id), email: admin.email, role: admin.role as AdminRole };
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/pekarnya-control/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        return verifyAdminCredentials(credentials.email, credentials.password);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as AuthenticatedAdmin).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as AdminRole;
      }
      return session;
    },
  },
};

export type RequireAdminResult =
  | { ok: true; role: AdminRole }
  | { ok: false; status: 401 | 403 };

// Общая проверка сессии администратора для мутирующих /api/* (docs/architecture.md,
// раздел 7 — "проверка сессии до запроса к БД, не после"). allowedRoles по умолчанию
// только ADMIN — ORDER_MANAGER (about-project.md: "менеджер заказов") получит доступ
// там, где это явно нужно (например, будущий /api/orders/[id], пункт 29).
export async function requireAdminSession(
  allowedRoles: AdminRole[] = ["ADMIN"]
): Promise<RequireAdminResult> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (!role) {
    return { ok: false, status: 401 };
  }
  if (!allowedRoles.includes(role)) {
    return { ok: false, status: 403 };
  }
  return { ok: true, role };
}
