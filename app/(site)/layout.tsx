import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

// Header/Footer оборачивают только публичный сайт (эта route group), не /admin —
// у админки будет свой layout с Sidebar (docs/plan.md, пункт 14)
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
