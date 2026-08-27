import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "@/components/admin/Sidebar";

const signOutMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const replaceMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("next-auth/react", () => ({ signOut: signOutMock }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/pekarnya-control",
  useRouter: () => ({ replace: replaceMock, refresh: refreshMock }),
}));

beforeEach(() => {
  signOutMock.mockClear();
  replaceMock.mockReset();
  refreshMock.mockReset();
});

describe("Sidebar", () => {
  it("«Выйти» чистит сессию и уводит на страницу логина, не оставляя админку в истории", async () => {
    const user = userEvent.setup();
    render(<Sidebar />);

    await user.click(screen.getByRole("button", { name: "Выйти" }));

    expect(signOutMock).toHaveBeenCalledWith({ redirect: false });
    expect(replaceMock).toHaveBeenCalledWith("/pekarnya-control/login");
    expect(refreshMock).toHaveBeenCalled();
  });
});
