import { describe, expect, it, vi, beforeEach } from "vitest";

const updateNotificationSettingsMock = vi.hoisted(() => vi.fn());
const requireAdminSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/settings", () => ({
  updateNotificationSettings: updateNotificationSettingsMock,
}));

vi.mock("@/lib/auth", () => ({
  requireAdminSession: requireAdminSessionMock,
}));

beforeEach(() => {
  updateNotificationSettingsMock.mockReset();
  requireAdminSessionMock.mockReset();
});

const validBody = {
  notifyEmail: true,
  notifyEmailAddress: "orders@example.com",
  notifySms: false,
  notifySmsPhone: "",
};

function putRequest(body: unknown) {
  return new Request("http://localhost/api/settings/notifications", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

describe("PUT /api/settings/notifications", () => {
  it("возвращает 401 без сессии", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: false, status: 401 });
    const { PUT } = await import("@/app/api/settings/notifications/route");
    const response = await PUT(putRequest(validBody));
    expect(response.status).toBe(401);
    expect(updateNotificationSettingsMock).not.toHaveBeenCalled();
  });

  it("возвращает 403 для ORDER_MANAGER", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: false, status: 403 });
    const { PUT } = await import("@/app/api/settings/notifications/route");
    expect((await PUT(putRequest(validBody))).status).toBe(403);
  });

  it("возвращает 400 при невалидном теле", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    const { PUT } = await import("@/app/api/settings/notifications/route");
    const response = await PUT(putRequest({ ...validBody, notifyEmail: "yes" }));
    expect(response.status).toBe(400);
    expect(updateNotificationSettingsMock).not.toHaveBeenCalled();
  });

  it("возвращает 200 и сохранённые настройки при успехе", async () => {
    requireAdminSessionMock.mockResolvedValueOnce({ ok: true, role: "ADMIN" });
    updateNotificationSettingsMock.mockResolvedValueOnce(validBody);
    const { PUT } = await import("@/app/api/settings/notifications/route");
    const response = await PUT(putRequest(validBody));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(validBody);
  });
});
