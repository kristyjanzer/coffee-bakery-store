import type { Metadata } from "next";
import Link from "next/link";
import { getSitePageBySlug, getBanners, type PageSlug } from "@/lib/pages";
import { PageContentForm } from "@/components/admin/PageContentForm";
import { BannerManager } from "@/components/admin/BannerManager";

export const metadata: Metadata = {
  title: "Управление страницами — Кофейня-пекарня",
};

type Tab = PageSlug | "banners";

const TABS: { tab: Tab; label: string }[] = [
  { tab: "about", label: "О нас" },
  { tab: "contacts", label: "Контакты" },
  { tab: "delivery", label: "Доставка и оплата" },
  { tab: "banners", label: "Баннеры на главной" },
];

interface PagesPageProps {
  searchParams: Promise<{ tab?: string }>;
}

function isTab(value: string | undefined): value is Tab {
  return TABS.some((item) => item.tab === value);
}

// Раздел «Управление страницами» (docs/plan.md, пункт 20; about-project.md, раздел
// "Управление страницами"): контент трёх фиксированных страниц + SEO title/description,
// плюс баннеры/слайдер на главной. Табы — обычные ссылки с query-параметром (?tab=...),
// без клиентского JS — тот же приём, что фильтр статуса в /admin/reviews.
export default async function AdminPagesPage({ searchParams }: PagesPageProps) {
  const { tab: rawTab } = await searchParams;
  const tab: Tab = isTab(rawTab) ? rawTab : "about";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-venuscom text-heading-sm uppercase tracking-[0.03em] text-forest-ink">
        Управление страницами
      </h1>

      <div className="flex flex-wrap gap-3" role="tablist">
        {TABS.map((item) => (
          <Link
            key={item.tab}
            href={item.tab === "about" ? "/admin/pages" : `/admin/pages?tab=${item.tab}`}
            role="tab"
            aria-selected={tab === item.tab}
            className={
              tab === item.tab
                ? "rounded-sm border border-black-olive px-4 py-2 font-venuscom text-body-sm uppercase text-black-olive shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
                : "rounded-sm border border-transparent px-4 py-2 font-venuscom text-body-sm uppercase text-black-olive/60 shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:text-black-olive"
            }
          >
            {item.label}
          </Link>
        ))}
      </div>

      {tab === "banners" ? <BannersTab /> : <PageTab slug={tab} />}
    </div>
  );
}

async function PageTab({ slug }: { slug: PageSlug }) {
  const page = await getSitePageBySlug(slug);
  if (!page) return null;

  return (
    <PageContentForm
      slug={page.slug}
      initialTitle={page.title}
      initialContent={page.content}
      initialSeoTitle={page.seoTitle}
      initialSeoDescription={page.seoDescription}
    />
  );
}

async function BannersTab() {
  const banners = await getBanners();
  return <BannerManager banners={banners} />;
}
