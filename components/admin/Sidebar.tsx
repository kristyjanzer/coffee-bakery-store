"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faXmark } from "@fortawesome/free-solid-svg-icons";

// docs/about-project.md, раздел "Страница административной панели" — порядок и
// названия пунктов меню 1-в-1 из ТЗ. Разделы, кроме Dashboard, появятся в пунктах
// 16-21 плана — ссылки уже готовы под них (как ссылки на #menu/#reviews в
// публичном Nav.tsx до появления самих секций).
const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Заказы" },
  { href: "/admin/products", label: "Товары" },
  { href: "/admin/customers", label: "Клиенты" },
  { href: "/admin/reviews", label: "Отзывы" },
  { href: "/admin/pages", label: "Управление страницами" },
  { href: "/admin/settings", label: "Настройки" },
];

function isActiveHref(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface NavListProps {
  pathname: string;
  onNavigate?: () => void;
}

// Активный пункт — Ghost/Outlined Navigation Item из DESIGN.md (та же обводка,
// что у "Главная" в публичном Nav.tsx), только на всю ширину сайдбара.
function NavList({ pathname, onNavigate }: NavListProps) {
  return (
    <ul className="flex flex-col gap-2">
      {navItems.map((item) => {
        const active = isActiveHref(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={
                active
                  ? "block rounded-sm border border-pure-white px-3 py-2 font-venuscom text-body-sm uppercase text-warm-cream"
                  : "block px-3 py-2 font-venuscom text-body-sm uppercase text-warm-cream/70 hover:text-warm-cream"
              }
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// Layout админ-панели (docs/plan.md, пункт 14): на десктопе сайдбар занимает 20%
// экрана (about-project.md — "Слева будет главное меню, которое будет занимать
// 20% от экрана"), на мобильных — верхняя панель с бургер-меню (тот же паттерн,
// что публичный Nav.tsx). Брейкпоинт lg (не md, как у публичного Nav) — админские
// таблицы/формы нуждаются в большей ширине контента, чем витрина.
//
// Ссылка "Выйти" — заглушка (ведёт на /admin/login): реального signOut() пока нет,
// NextAuth появится в пункте 31 плана. Проверка сессии — задача middleware.ts
// (пункт 32), здесь только структура/навигация.
export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between border-b border-sage-mist/20 bg-black-olive px-6 py-4 lg:hidden">
        <Link
          href="/admin"
          className="font-venuscom text-body-sm font-semibold uppercase tracking-[0.04em] text-warm-cream"
        >
          Кофейня-пекарня
        </Link>
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-label={isOpen ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={isOpen}
          className="text-warm-cream"
        >
          <FontAwesomeIcon icon={isOpen ? faXmark : faBars} className="size-5" />
        </button>
      </div>

      {isOpen && (
        <div className="flex flex-col gap-6 border-b border-sage-mist/20 bg-black-olive px-6 py-4 lg:hidden">
          <NavList pathname={pathname} onNavigate={() => setIsOpen(false)} />
          <Link
            href="/admin/login"
            onClick={() => setIsOpen(false)}
            className="font-venuscom text-body-sm uppercase text-warm-cream/70 hover:text-warm-cream"
          >
            Выйти
          </Link>
        </div>
      )}

      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-1/5 lg:shrink-0 lg:flex-col lg:justify-between lg:bg-black-olive lg:px-6 lg:py-8">
        <div>
          <Link
            href="/admin"
            className="font-venuscom text-body-sm font-semibold uppercase tracking-[0.04em] text-warm-cream"
          >
            Кофейня-пекарня
          </Link>
          <nav className="mt-8">
            <NavList pathname={pathname} />
          </nav>
        </div>
        <Link
          href="/admin/login"
          className="font-venuscom text-body-sm uppercase text-warm-cream/70 hover:text-warm-cream"
        >
          Выйти
        </Link>
      </aside>
    </>
  );
}
