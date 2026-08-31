import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Nav } from "@/components/layout/Nav";

// usePathname — задаём per-test через переменную (Nav решает по маршруту, какой
// пункт активен по умолчанию: "/" → «Главная», "/product/*" → «Меню»).
let mockPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

// Управляемый IntersectionObserver: на странице их несколько (next/link заводит
// свои для prefetch), поэтому каждый экземпляр помнит, за какими элементами
// следит — а enterViewport дёргает только те колбэки, что наблюдают эту секцию.
type IOEntry = { target: Element; isIntersecting: boolean };
const observers: Array<{ cb: (entries: IOEntry[]) => void; elements: Set<Element> }> = [];

class MockIntersectionObserver {
  private entry: { cb: (entries: IOEntry[]) => void; elements: Set<Element> } = {
    cb: () => {},
    elements: new Set<Element>(),
  };
  constructor(cb: (entries: IOEntry[]) => void) {
    this.entry.cb = cb;
    observers.push(this.entry);
  }
  observe(el: Element) {
    this.entry.elements.add(el);
  }
  unobserve(el: Element) {
    this.entry.elements.delete(el);
  }
  disconnect() {
    this.entry.elements.clear();
  }
  takeRecords() {
    return [];
  }
}

function enterViewport(id: string, isIntersecting = true) {
  const target = document.getElementById(id);
  if (!target) throw new Error(`нет секции #${id} в DOM теста`);
  act(() => {
    for (const observer of observers) {
      if (observer.elements.has(target)) observer.cb([{ target, isIntersecting }]);
    }
  });
}

beforeEach(() => {
  mockPathname = "/";
  observers.length = 0;
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  // Секции витрины, за которыми следит scroll-spy.
  document.body.innerHTML = `
    <section id="menu"></section>
    <section id="reviews"></section>
    <footer id="contacts"></footer>
  `;
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("Nav — активный пункт", () => {
  it("на главной вверху страницы активна «Главная»", () => {
    render(<Nav />);

    expect(screen.getByRole("link", { name: "Главная" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: "Меню" })).not.toHaveAttribute("aria-current");
  });

  it("на странице товара активно «Меню», а не «Главная»", () => {
    mockPathname = "/product/12";
    render(<Nav />);

    expect(screen.getByRole("link", { name: "Меню" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: "Главная" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("не с главной «Меню» ведёт на /#menu (секции живут на главной)", () => {
    mockPathname = "/product/12";
    render(<Nav />);

    expect(screen.getByRole("link", { name: "Меню" })).toHaveAttribute("href", "/#menu");
  });

  it("scroll-spy: секция отзывов во вьюпорте → активны «Отзывы»", () => {
    render(<Nav />);

    enterViewport("reviews");

    expect(screen.getByRole("link", { name: "Отзывы" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: "Главная" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("когда видно несколько секций — активна самая нижняя (дальше проскролленная)", () => {
    render(<Nav />);

    enterViewport("menu");
    enterViewport("reviews");

    expect(screen.getByRole("link", { name: "Отзывы" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: "Меню" })).not.toHaveAttribute("aria-current");
  });

  it("секция ушла из вьюпорта → активная ссылка возвращается к «Главная»", () => {
    render(<Nav />);

    enterViewport("menu");
    expect(screen.getByRole("link", { name: "Меню" })).toHaveAttribute("aria-current", "page");

    enterViewport("menu", false);
    expect(screen.getByRole("link", { name: "Главная" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });
});
