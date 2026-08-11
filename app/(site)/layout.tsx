import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartHydration } from "@/components/cart/CartHydration";
import { CartWidget } from "@/components/cart/CartWidget";

// Header/Footer оборачивают только публичный сайт (эта route group), не /admin —
// у админки будет свой layout с Sidebar (docs/plan.md, пункт 14). Админка cartStore
// не использует, поэтому CartHydration и CartWidget подключены здесь, а не в корневом layout.
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <CartHydration />
      <Header />
      {children}
      <Footer />
      <CartWidget />
    </>
  );
}
