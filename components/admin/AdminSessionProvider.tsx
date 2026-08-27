"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

// Клиентская обёртка над SessionProvider (docs/architecture.md, раздел 6:
// "обёртка SessionProvider вокруг pekarnya-control/(protected)/layout.tsx").
// Нужна, чтобы клиентские компоненты админки могли звать useSession()/signOut()
// с общим контекстом. Публичный сайт и страница логина ей не оборачиваются —
// там сессия не читается.
export function AdminSessionProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
