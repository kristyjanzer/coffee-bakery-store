"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateSitePage, type PageSlug } from "@/lib/pages";

interface PageContentFormProps {
  slug: PageSlug;
  initialTitle: string;
  initialContent: string;
  initialSeoTitle: string;
  initialSeoDescription: string;
}

// Форма редактирования одной из фиксированных страниц (О нас/Контакты/Доставка и
// оплата) + SEO title/description (docs/plan.md, пункт 20). updateSitePage() —
// заглушка (PATCH /api/pages/[slug] появится вместе с остальными мутациями админки),
// ничего не сохраняет по-настоящему — тот же принцип, что ReviewModerationControl.
export function PageContentForm({
  slug,
  initialTitle,
  initialContent,
  initialSeoTitle,
  initialSeoDescription,
}: PageContentFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [seoTitle, setSeoTitle] = useState(initialSeoTitle);
  const [seoDescription, setSeoDescription] = useState(initialSeoDescription);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  async function submit() {
    setIsSaving(true);
    setSavedAt(null);
    await updateSitePage(slug, { title, content, seoTitle, seoDescription });
    setIsSaving(false);
    setSavedAt(Date.now());
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-6">
      <div>
        <label htmlFor="title" className="font-venuscom text-caption text-black-olive/70">
          Заголовок страницы
        </label>
        <Input
          id="title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setSavedAt(null);
          }}
          className="mt-1"
        />
      </div>

      <div>
        <label htmlFor="content" className="font-venuscom text-caption text-black-olive/70">
          Текст страницы
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            setSavedAt(null);
          }}
          rows={6}
          className="mt-1 w-full rounded-sm border border-sage-mist bg-warm-cream px-4 py-3 font-venuscom text-body-sm text-black-olive placeholder:text-black-olive/50 focus:border-lemon-zest focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-4 border-t border-sage-mist pt-6">
        <h2 className="font-venuscom text-subheading uppercase tracking-[0.02em] text-forest-ink">SEO</h2>

        <div>
          <label htmlFor="seoTitle" className="font-venuscom text-caption text-black-olive/70">
            SEO title
          </label>
          <Input
            id="seoTitle"
            value={seoTitle}
            onChange={(event) => {
              setSeoTitle(event.target.value);
              setSavedAt(null);
            }}
            className="mt-1"
          />
        </div>

        <div>
          <label htmlFor="seoDescription" className="font-venuscom text-caption text-black-olive/70">
            SEO description
          </label>
          <textarea
            id="seoDescription"
            value={seoDescription}
            onChange={(event) => {
              setSeoDescription(event.target.value);
              setSavedAt(null);
            }}
            rows={2}
            className="mt-1 w-full rounded-sm border border-sage-mist bg-warm-cream px-4 py-3 font-venuscom text-body-sm text-black-olive placeholder:text-black-olive/50 focus:border-lemon-zest focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 border-t border-sage-mist pt-6">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Сохраняем…" : "Сохранить"}
        </Button>
        {!isSaving && savedAt && (
          <p className="font-venuscom text-caption text-forest-ink">Сохранено (заглушка)</p>
        )}
      </div>
    </form>
  );
}
