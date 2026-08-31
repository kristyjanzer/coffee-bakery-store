import type { SitePageInput, BannerInput } from "@/lib/server/pages";

// Клиентские мутации раздела «Управление страницами» (docs/plan.md, пункт 20).
// Формы админки — клиентские, поэтому пишут через HTTP-границу /api/* (проверка
// сессии ADMIN и zod — в роут-хендлерах). Тот же приём, что lib/api-client/productAdminApi.ts.
export type PageMutationResult = { ok: true } | { ok: false; error: string };

async function errorFrom(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? fallback;
}

export async function updateSitePage(
  slug: string,
  input: SitePageInput
): Promise<PageMutationResult> {
  try {
    const response = await fetch(`/api/pages/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      return { ok: false, error: await errorFrom(response, "Не удалось сохранить страницу.") };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Нет связи с сервером. Попробуйте ещё раз." };
  }
}

export async function saveBanners(banners: BannerInput[]): Promise<PageMutationResult> {
  try {
    const response = await fetch("/api/banners", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        banners.map((b) => ({
          imageUrl: b.imageUrl,
          title: b.title,
          link: b.link,
          isActive: b.isActive,
        }))
      ),
    });
    if (!response.ok) {
      return { ok: false, error: await errorFrom(response, "Не удалось сохранить баннеры.") };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Нет связи с сервером. Попробуйте ещё раз." };
  }
}
