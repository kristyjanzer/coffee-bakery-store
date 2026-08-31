import { describe, expect, it, vi, beforeEach } from "vitest";

const adminFindMany = vi.hoisted(() => vi.fn());
const adminFindUnique = vi.hoisted(() => vi.fn());
const adminCreate = vi.hoisted(() => vi.fn());
const adminUpdate = vi.hoisted(() => vi.fn());
const adminDelete = vi.hoisted(() => vi.fn());
const adminCount = vi.hoisted(() => vi.fn());
const notifUpsert = vi.hoisted(() => vi.fn());
const bcryptHash = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    adminUser: {
      findMany: adminFindMany,
      findUnique: adminFindUnique,
      create: adminCreate,
      update: adminUpdate,
      delete: adminDelete,
      count: adminCount,
    },
    notificationSettings: { upsert: notifUpsert },
  },
}));

vi.mock("bcryptjs", () => ({ default: { hash: bcryptHash } }));

beforeEach(() => {
  adminFindMany.mockReset();
  adminFindUnique.mockReset();
  adminCreate.mockReset();
  adminUpdate.mockReset();
  adminDelete.mockReset();
  adminCount.mockReset();
  notifUpsert.mockReset();
  bcryptHash.mockReset();
});

describe("getAdminUsers", () => {
  it("запрашивает только id/email/role, без passwordHash", async () => {
    adminFindMany.mockResolvedValueOnce([]);
    const { getAdminUsers } = await import("@/lib/server/settings");
    await getAdminUsers();
    expect(adminFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: { id: true, email: true, role: true } })
    );
  });
});

describe("createAdminUser", () => {
  it("хэширует пароль и кладёт passwordHash в create", async () => {
    bcryptHash.mockResolvedValueOnce("hashed-pw");
    adminCreate.mockResolvedValueOnce({ id: 3, email: "m@example.com", role: "ORDER_MANAGER" });

    const { createAdminUser } = await import("@/lib/server/settings");
    await createAdminUser({ email: "  M@Example.com ", password: "supersecret", role: "ORDER_MANAGER" });

    expect(bcryptHash).toHaveBeenCalledWith("supersecret", 10);
    expect(adminCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { email: "m@example.com", passwordHash: "hashed-pw", role: "ORDER_MANAGER" },
      })
    );
  });
});

describe("deleteAdminUser", () => {
  it("бросает LastAdminError при удалении единственного ADMIN", async () => {
    adminFindUnique.mockResolvedValueOnce({ id: 1, role: "ADMIN" });
    adminCount.mockResolvedValueOnce(1);

    const { deleteAdminUser, LastAdminError } = await import("@/lib/server/settings");
    await expect(deleteAdminUser(1)).rejects.toBeInstanceOf(LastAdminError);
    expect(adminDelete).not.toHaveBeenCalled();
  });

  it("удаляет, если ADMIN не последний", async () => {
    adminFindUnique.mockResolvedValueOnce({ id: 1, role: "ADMIN" });
    adminCount.mockResolvedValueOnce(2);
    adminDelete.mockResolvedValueOnce({});

    const { deleteAdminUser } = await import("@/lib/server/settings");
    await deleteAdminUser(1);
    expect(adminDelete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});

describe("updateAdminUserRole", () => {
  it("бросает LastAdminError при разжаловании единственного ADMIN", async () => {
    adminFindUnique.mockResolvedValueOnce({ id: 1, role: "ADMIN" });
    adminCount.mockResolvedValueOnce(1);

    const { updateAdminUserRole, LastAdminError } = await import("@/lib/server/settings");
    await expect(updateAdminUserRole(1, "ORDER_MANAGER")).rejects.toBeInstanceOf(LastAdminError);
    expect(adminUpdate).not.toHaveBeenCalled();
  });

  it("повышение до ADMIN не требует проверки последнего админа", async () => {
    adminUpdate.mockResolvedValueOnce({ id: 2, email: "m@example.com", role: "ADMIN" });

    const { updateAdminUserRole } = await import("@/lib/server/settings");
    await updateAdminUserRole(2, "ADMIN");
    expect(adminFindUnique).not.toHaveBeenCalled();
    expect(adminUpdate).toHaveBeenCalled();
  });
});

describe("getNotificationSettings", () => {
  it("делает upsert по id: 1", async () => {
    notifUpsert.mockResolvedValueOnce({
      notifyEmail: false,
      notifyEmailAddress: "",
      notifySms: false,
      notifySmsPhone: "",
    });

    const { getNotificationSettings } = await import("@/lib/server/settings");
    await getNotificationSettings();
    expect(notifUpsert).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 1 } }));
  });
});
