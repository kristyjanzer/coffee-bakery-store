import type { Metadata } from "next";
import "./globals.css";

// Next.js сам рендерит эти метаданные в <head>
export const metadata: Metadata = {
  title: "Кофейня-пекарня",
  description: "Кофе, выпечка и десерты на заказ",
};

// Корневой layout — оборачивает все страницы App Router в <html>/<body>
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
