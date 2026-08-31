import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/auth";

// NextAuth v4 App Router catch-all (docs/plan.md, пункт 31) — обрабатывает
// /api/auth/signin, /callback/credentials, /session, /csrf и т.д.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
