import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { AnchorScrollFix } from "@/components/layout/AnchorScrollFix";

let mockPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

const scrollIntoView = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  mockPathname = "/";
  scrollIntoView.mockClear();
  window.location.hash = "";
  document.body.innerHTML = `<section id="reviews"></section>`;
  Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  window.location.hash = "";
});

describe("AnchorScrollFix", () => {
  it("на странице с #hash доводит скролл до секции (с повторами для поздней вёрстки)", () => {
    window.location.hash = "#reviews";
    const target = document.getElementById("reviews");
    render(<AnchorScrollFix />);

    vi.advanceTimersByTime(1000);

    expect(scrollIntoView).toHaveBeenCalled();
    // несколько попыток — сразу и с задержками (120/350/700 мс)
    expect(scrollIntoView.mock.calls.length).toBeGreaterThan(1);
    expect(scrollIntoView.mock.instances).toContain(target);
  });

  it("без #hash ничего не скроллит", () => {
    render(<AnchorScrollFix />);
    vi.advanceTimersByTime(1000);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("перестаёт вмешиваться, как только пользователь сам скроллит", () => {
    window.location.hash = "#reviews";
    render(<AnchorScrollFix />);

    vi.advanceTimersByTime(120);
    const callsBeforeWheel = scrollIntoView.mock.calls.length;
    expect(callsBeforeWheel).toBeGreaterThan(0);

    window.dispatchEvent(new Event("wheel"));
    vi.advanceTimersByTime(1000);

    // после того как пользователь тронул скролл — повторов больше нет
    expect(scrollIntoView.mock.calls.length).toBe(callsBeforeWheel);
  });
});
