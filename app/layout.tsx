import type { Metadata } from "next";
import { Gabriela, Lobster, Manrope } from "next/font/google";
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

// Шрифт логотипа/названия "Coffee Bakery" — по запросу пользователя, отдельно от
// основного VenusCom/Manrope. Gabriela на Google Fonts существует только весом 400
// (Regular) и без кириллицы — не проблема, так как название теперь на латинице.
const gabriela = Gabriela({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-gabriela",
});

// Шрифт заголовка Hero-блока — по запросу пользователя. Lobster на Google Fonts
// существует только весом 400 (Regular), но, в отличие от Gabriela, поддерживает
// кириллицу — нужна для русского текста заголовка.
const lobster = Lobster({
  subsets: ["latin", "cyrillic"],
  weight: "400",
  variable: "--font-lobster",
});

// Next.js сам рендерит эти метаданные в <head>
export const metadata: Metadata = {
  title: "Coffee Bakery",
  description: "Кофе, выпечка и десерты на заказ",
};

// Корневой layout — оборачивает все страницы App Router в <html>/<body>
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ru"
      className={`${venuscom.variable} ${gabriela.variable} ${lobster.variable} scroll-smooth`}
      data-scroll-behavior="smooth"
    >
      <body className="bg-black-olive text-warm-cream antialiased">
        {children}
      </body>
    </html>
  );
}
