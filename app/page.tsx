// Временная заглушка главной страницы — реальный каталог появится, когда будет готова
// схема Prisma и БД (см. docs/architecture.md, раздел 3). Нужна, чтобы Next.js вообще
// мог собраться и запуститься: без app/page.tsx роутер падает при старте.
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-white">
      <h1 className="text-4xl font-semibold tracking-wide">Кофейня-пекарня</h1>
      <p className="mt-4 max-w-md text-white/70">
        Каталог, корзина и админка ещё в разработке. Здесь появится меню
        кофе, выпечки и десертов.
      </p>
    </main>
  );
}
