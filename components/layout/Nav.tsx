"use client";

import Link from "next/link";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faXmark } from "@fortawesome/free-solid-svg-icons";

// Секции #menu и #reviews появятся на странице в следующих задачах (пункты 5 и 7
// плана) — ссылки уже готовы под них.
const links = [
  { href: "/", label: "Главная" },
  { href: "#menu", label: "Меню" },
  { href: "#reviews", label: "Отзывы" },
  { href: "#contacts", label: "Контакты" },
];

export function Nav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav>
      <ul className="hidden items-center gap-8 md:flex">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={
                link.href === "/"
                  ? "rounded-sm border border-pure-white px-1.5 py-2 font-venuscom text-body-sm uppercase text-warm-cream"
                  : "font-venuscom text-body-sm uppercase text-warm-cream hover:opacity-80"
              }
            >
              {link.label}
            </Link>
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
        <FontAwesomeIcon icon={isOpen ? faXmark : faBars} className="h-5 w-5" />
      </button>

      {isOpen && (
        <ul className="absolute inset-x-0 top-20 flex flex-col gap-4 border-t border-sage-mist/20 bg-black-olive px-6 py-6 md:hidden">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="font-venuscom text-body-sm uppercase text-warm-cream"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
