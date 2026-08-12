"use client";

import Link from "next/link";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faXmark } from "@fortawesome/free-solid-svg-icons";
import { scrollToId } from "@/lib/utils";

// Секции #menu и #reviews появятся на странице в следующих задачах (пункты 5 и 7
// плана) — ссылки уже готовы под них.
const links = [
  { href: "/", label: "Главная" },
  { href: "#menu", label: "Меню" },
  { href: "#reviews", label: "Отзывы" },
  { href: "#contacts", label: "Контакты" },
];

interface NavLinkProps {
  href: string;
  label: string;
  className: string;
  onNavigate?: () => void;
}

// "/" — реальный переход через next/link, "#slug" — прокрутка вручную (next/link
// не всегда доводит скролл до конца при переходе по якорю в пределах той же
// страницы, см. комментарий у scrollToId в lib/utils.ts)
function NavLink({ href, label, className, onNavigate }: NavLinkProps) {
  if (href === "/") {
    return (
      <Link href={href} className={className} onClick={onNavigate}>
        {label}
      </Link>
    );
  }

  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        scrollToId(href.slice(1));
        onNavigate?.();
      }}
    >
      {label}
    </a>
  );
}

export function Nav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav>
      <ul className="hidden items-center gap-8 md:flex">
        {links.map((link) => (
          <li key={link.href}>
            <NavLink
              href={link.href}
              label={link.label}
              className={
                link.href === "/"
                  ? "rounded-sm border border-pure-white px-1.5 py-2 font-venuscom text-body-sm uppercase text-warm-cream"
                  : "font-venuscom text-body-sm uppercase text-warm-cream hover:opacity-80"
              }
            />
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? "Закрыть меню" : "Открыть меню"}
        aria-expanded={isOpen}
        className="text-warm-cream md:hidden"
      >
        <FontAwesomeIcon icon={isOpen ? faXmark : faBars} className="size-5" />
      </button>

      {isOpen && (
        <ul className="absolute inset-x-0 top-20 flex flex-col gap-4 border-t border-sage-mist/20 bg-black-olive p-6 md:hidden">
          {links.map((link) => (
            <li key={link.href}>
              <NavLink
                href={link.href}
                label={link.label}
                className="font-venuscom text-body-sm uppercase text-warm-cream"
                onNavigate={() => setIsOpen(false)}
              />
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
