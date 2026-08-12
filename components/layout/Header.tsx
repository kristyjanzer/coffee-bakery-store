import Link from "next/link";
import { CartIcon } from "@/components/cart/CartIcon";
import { Nav } from "@/components/layout/Nav";

// DESIGN.md, "Top Navigation Bar": full-bleed тёмный фон, ~80px высота (h-20)
export function Header() {
  return (
    <header className="relative sticky top-0 z-40 h-20 border-b border-sage-mist/20 bg-black-olive">
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-6">
        <Link
          href="/"
          className="font-venuscom text-body-lg font-semibold uppercase tracking-[0.04em] text-warm-cream"
        >
          Кофейня-пекарня
        </Link>
        <div className="flex items-center gap-6">
          <Nav />
          <CartIcon />
        </div>
      </div>
    </header>
  );
}
