import { withAuth } from "next-auth/middleware";

// Защита админки /pekarnya-control/* (docs/plan.md, пункт 32; docs/architecture.md,
// раздел 7). Файл называется proxy.ts, а не middleware.ts: в Next 16 имя middleware
// объявлено deprecated (см. nextjs.org/docs/messages/middleware-to-proxy), конфиг
// matcher идентичен. next-auth v4 withAuth работает и на nodejs-рантайме proxy.
//
// Основной барьер для страниц — здесь; мутирующие /api/*-роуты под этот матчер не
// попадают и проверяют сессию/роль сами (requireAdminSession в lib/auth.ts).
//
// Страницу логина вручную из матчера вырезать не нужно: withAuth сравнивает путь с
// pages.signIn и пропускает его без проверки токена (иначе неавторизованный
// пользователь редиректился бы с /pekarnya-control/login на самого себя по кругу).
// То же для /api/auth/* и /_next/*.
//
// Проверяется только факт валидной сессии (в JWT есть role — см. jwt-callback в
// lib/auth.ts). Тонкие ограничения по роли (ORDER_MANAGER не создаёт товары и т.п.)
// остаются на уровне API-роутов.
export default withAuth({
  pages: { signIn: "/pekarnya-control/login" },
});

export const config = {
  // :path* — и сам /pekarnya-control (Dashboard), и все вложенные разделы.
  matcher: ["/pekarnya-control/:path*"],
};
