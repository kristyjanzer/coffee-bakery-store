import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";

// Next.js сам управляет CSS — отключаем автовставку стилей Font Awesome,
// чтобы избежать конфликта и "мигания" неотстилизованных иконок
config.autoAddCss = false;

// VenusCom (шрифт из DESIGN.md) недоступен как веб-шрифт, а предложенные там замены
// (DM Sans/Outfit/Plus Jakarta Sans) не поддерживают кириллицу — критично для русского
// контента сайта. Manrope визуально близка (геометричный гротеск с широким трекингом)
// и при этом покрывает кириллицу — используется как фактическая замена.
const venuscom = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-venuscom",
});

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
    <html lang="ru" className={venuscom.variable}>
      <body className="bg-black-olive text-warm-cream antialiased">
        {children}
      </body>
    </html>
  );
}
