"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faXmark } from "@fortawesome/free-solid-svg-icons";
import { scrollToId } from "@/lib/utils";

// Пункты навигации в порядке сверху вниз по странице. sectionId — id секции
// витрины, за которой следит scroll-spy. null — обычный маршрут.
interface NavItem {
  href: string;
  sectionId: string | null;
  label: string;
  // Секция есть на любой странице витрины (футер #contacts живёт в layout), а не
  // только на главной — значит, якорь всегда скроллит по месту, не уводит на "/".
  alwaysPresent?: boolean;
}

const links: NavItem[] = [
  { href: "/", sectionId: null, label: "Главная" },
  { href: "#menu", sectionId: "menu", label: "Меню" },
  { href: "#reviews", sectionId: "reviews", label: "Отзывы" },
  { href: "#contacts", sectionId: "contacts", label: "Контакты", alwaysPresent: true },
];

const SECTION_IDS: string[] = links
  .map((link) => link.sectionId)
  .filter((id): id is string => id !== null);

// Возвращает id секций, пересекающих "полосу активности" — среднюю половину
// экрана. rootMargin поджимает область наблюдения на 25% сверху и снизу: полоса
// широкая (стабильнее узкой при быстром скролле) и достаёт до короткого футера.
//
// pathname в зависимостях эффекта — обязателен: Nav живёт в общем layout витрины
// и при переходе между страницами не перемонтируется. Без пере-подписки обсёрвер
// продолжал бы следить за DOM-узлами предыдущей страницы (или не видел бы секции,
// появившиеся только сейчас).
function useVisibleSections(pathname: string): string[] {
  const [visible, setVisible] = useState<string[]>([]);
  const [trackedPath, setTrackedPath] = useState(pathname);

  // Сменился маршрут — секции предыдущей страницы больше не в DOM, старый набор
  // невалиден. Сброс на фазе рендера (паттерн React "adjust state on prop
  // change"), а не в эффекте — иначе успел бы мелькнуть неверный активный пункт.
  if (pathname !== trackedPath) {
    setTrackedPath(pathname);
    setVisible([]);
  }

  useEffect(() => {
    const elements = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setVisible((prev) => {
          const next = new Set(prev);
          for (const entry of entries) {
            if (entry.isIntersecting) next.add(entry.target.id);
            else next.delete(entry.target.id);
          }
          return [...next];
        });
      },
      { rootMargin: "-25% 0px -25% 0px" }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [pathname]);

  return visible;
}

// Обводка (DESIGN.md, "Ghost / Outlined Navigation Item") — индикатор активного
// пункта. У неактивных та же геометрия с прозрачной рамкой, чтобы переезд обводки
// не сдвигал соседние пункты.
const BASE_LINK_CLASS =
  "rounded-sm border px-1.5 py-2 font-venuscom text-body-sm uppercase text-warm-cream";

function linkClass(active: boolean): string {
  return active
    ? `${BASE_LINK_CLASS} border-pure-white`
    : `${BASE_LINK_CLASS} border-transparent hover:opacity-80`;
}

interface NavLinkProps {
  href: string;
  label: string;
  active: boolean;
  // true — целевая секция есть на текущей странице (якорь скроллит по месту),
  // false — секции тут нет, нужен переход на главную к этому якорю.
  sectionOnPage: boolean;
  className: string;
  onNavigate?: () => void;
}

function NavLink({ href, label, active, sectionOnPage, className, onNavigate }: NavLinkProps) {
  const ariaCurrent = active ? "page" : undefined;

  // Обычный маршрут.
  if (href === "/") {
    return (
      <Link href={href} className={className} aria-current={ariaCurrent} onClick={onNavigate}>
        {label}
      </Link>
    );
  }

  // Секции нет на этой странице (#menu/#reviews вне главной) — ведём на "/#slug"
  // обычным переходом (next/link сам доведёт до якоря на главной).
  if (!sectionOnPage) {
    return (
      <Link
        href={`/${href}`}
        className={className}
        aria-current={ariaCurrent}
        onClick={onNavigate}
      >
        {label}
      </Link>
    );
  }

  // Секция на этой странице — ручной скролл: next/link не всегда доводит до конца
  // при переходе по якорю в пределах той же страницы (см. scrollToId в lib/utils.ts).
  return (
    <a
      href={href}
      className={className}
      aria-current={ariaCurrent}
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
  const pathname = usePathname();
  const visibleSections = useVisibleSections(pathname);

  const onHomePage = pathname === "/";

  // Пункт по умолчанию, когда ни одна секция не в фокусе: на главной — «Главная»,
  // на странице товара — «Меню» (товар — часть каталога).
  const fallbackHref = onHomePage
    ? "/"
    : pathname.startsWith("/product/")
      ? "#menu"
      : "/";

  // Активна самая нижняя из видимых секций — та, до которой дальше всего
  // проскроллено; если ни одной не видно — fallback.
  const visibleLinks = links.filter(
    (link) => link.sectionId !== null && visibleSections.includes(link.sectionId)
  );
  const activeHref = visibleLinks[visibleLinks.length - 1]?.href ?? fallbackHref;

  const renderLink = (link: NavItem, extraClass = "", onNavigate?: () => void) => {
    const active = link.href === activeHref;
    return (
      <NavLink
        href={link.href}
        label={link.label}
        active={active}
        sectionOnPage={onHomePage || link.alwaysPresent === true}
        className={`${linkClass(active)}${extraClass ? ` ${extraClass}` : ""}`}
        onNavigate={onNavigate}
      />
    );
  };

  return (
    <nav>
      <ul className="hidden items-center gap-8 md:flex">
        {links.map((link) => (
          <li key={link.href}>{renderLink(link)}</li>
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
            <li key={link.href}>{renderLink(link, "", () => setIsOpen(false))}</li>
          ))}
        </ul>
      )}
    </nav>
  );
}
