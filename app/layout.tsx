import type { Metadata } from "next";
import { Dela_Gothic_One, Gabriela, Manrope } from "next/font/google";
import "./globals.css";

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

// Шрифт заголовка Hero-блока — по запросу пользователя (сначала пробовали
// Lobster, но курсив визуально выбивался из стиля сайта). Dela Gothic One —
// плотный гротескный дисплейный шрифт, тоже только весом 400, поддерживает
// кириллицу.
const delaGothicOne = Dela_Gothic_One({
  subsets: ["latin", "cyrillic"],
  weight: "400",
  variable: "--font-dela-gothic-one",
});

// Next.js сам рендерит эти метаданные в <head>
export const metadata: Metadata = {
  title: "Coffee Bakery",
  description: "Кофе, выпечка и десерты на заказ",
  icons: { icon: "/images/favicon.ico" },
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
      className={`${venuscom.variable} ${gabriela.variable} ${delaGothicOne.variable} scroll-smooth`}
      data-scroll-behavior="smooth"
    >
      <body className="bg-black-olive text-warm-cream antialiased">
        {children}
      </body>
    </html>
  );
}
