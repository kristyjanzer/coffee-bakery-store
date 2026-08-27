import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "@/components/admin/Sidebar";

const signOutMock = vi.hoisted(() => vi.fn());

vi.mock("next-auth/react", () => ({ signOut: signOutMock }));
vi.mock("next/navigation", () => ({ usePathname: () => "/pekarnya-control" }));

beforeEach(() => {
  signOutMock.mockReset();
});

describe("Sidebar", () => {
  it("«Выйти» зовёт signOut с возвратом на страницу логина", async () => {
    const user = userEvent.setup();
    render(<Sidebar />);

    await user.click(screen.getByRole("button", { name: "Выйти" }));

    expect(signOutMock).toHaveBeenCalledWith({ callbackUrl: "/pekarnya-control/login" });
  });
});
