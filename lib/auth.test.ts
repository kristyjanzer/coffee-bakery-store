import { describe, expect, it, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { verifyAdminCredentials } from "@/lib/auth";

const findUniqueMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: { adminUser: { findUnique: findUniqueMock } },
}));

// Низкий cost (4) — тестам не нужна прод-стойкость bcrypt, а cost 10 на каждый
// hash() в нескольких тестах ощутимо замедлил бы прогон.
const TEST_BCRYPT_COST = 4;

beforeEach(() => {
  findUniqueMock.mockReset();
});

describe("verifyAdminCredentials", () => {
  it("возвращает admin при верном email и пароле", async () => {
    const passwordHash = await bcrypt.hash("correct-password", TEST_BCRYPT_COST);
    findUniqueMock.mockResolvedValueOnce({
      id: 1,
      email: "admin@example.com",
      passwordHash,
      role: "ADMIN",
    });

    const result = await verifyAdminCredentials("admin@example.com", "correct-password");

    expect(result).toEqual({ id: "1", email: "admin@example.com", role: "ADMIN" });
  });

  it("возвращает null при неверном пароле", async () => {
    const passwordHash = await bcrypt.hash("correct-password", TEST_BCRYPT_COST);
    findUniqueMock.mockResolvedValueOnce({
      id: 1,
      email: "admin@example.com",
      passwordHash,
      role: "ADMIN",
    });

    expect(await verifyAdminCredentials("admin@example.com", "wrong-password")).toBeNull();
  });

  it("возвращает null для несуществующего email, но всё равно вызывает bcrypt.compare", async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    const compareSpy = vi.spyOn(bcrypt, "compare");

    const result = await verifyAdminCredentials("nobody@example.com", "whatever");

    expect(result).toBeNull();
    expect(compareSpy).toHaveBeenCalled();
  });

  it("нормализует email (пробелы, регистр) перед поиском", async () => {
    findUniqueMock.mockResolvedValueOnce(null);

    await verifyAdminCredentials("  Admin@Example.com  ", "whatever");

    expect(findUniqueMock).toHaveBeenCalledWith({ where: { email: "admin@example.com" } });
  });
});
