import { describe, expect, it, beforeAll } from "vitest";
import { NextRequest } from "next/server";

// Без моков: withAuth читает JWT настоящим getToken. Проверяем то, что не требует
// подделки валидной сессии — матчер, редирект неавторизованного и то, что сама
// страница логина не уходит в петлю редиректов.
beforeAll(() => {
  process.env.NEXTAUTH_SECRET = "test-secret-value-at-least-32-chars-long";
});

async function runProxy(pathname: string) {
  const { default: proxy } = await import("@/proxy");
  const req = new NextRequest(new URL(`http://localhost${pathname}`));
  return (proxy as (req: NextRequest) => Promise<Response | undefined>)(req);
}

describe("proxy — защита админки", () => {
  it("матчер закрывает и сам /pekarnya-control, и вложенные разделы", async () => {
    const { config } = await import("@/proxy");
    expect(config.matcher).toEqual(["/pekarnya-control/:path*"]);
  });

  it("без сессии редиректит на страницу логина с callbackUrl", async () => {
    const response = await runProxy("/pekarnya-control/orders");

    expect(response?.status).toBe(307);
    const location = new URL(response!.headers.get("location")!);
    expect(location.pathname).toBe("/pekarnya-control/login");
    expect(location.searchParams.get("callbackUrl")).toBe("/pekarnya-control/orders");
  });

  it("защищает и корень раздела /pekarnya-control (Dashboard)", async () => {
    const response = await runProxy("/pekarnya-control");

    expect(response?.status).toBe(307);
    expect(new URL(response!.headers.get("location")!).pathname).toBe("/pekarnya-control/login");
  });

  it("страницу логина пропускает даже без сессии (нет петли редиректов)", async () => {
    const response = await runProxy("/pekarnya-control/login");

    expect(response).toBeUndefined();
  });
});
