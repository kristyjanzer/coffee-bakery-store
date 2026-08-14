"use client";

import { useRef, useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { saveBanners, type Banner, type BannerInput } from "@/lib/pages";

interface BannerRow extends BannerInput {
  key: number;
}

function bannerToRow(banner: Banner): BannerRow {
  return { key: banner.id, id: banner.id, imageUrl: banner.imageUrl, title: banner.title, link: banner.link, isActive: banner.isActive };
}

interface BannerManagerProps {
  banners: Banner[];
}

// Управление баннерами/слайдером на главной (docs/plan.md, пункт 20). Весь список
// редактируется и сохраняется одной кнопкой — saveBanners() (заглушка, POST/PATCH/DELETE
// появятся вместе с остальными мутациями админки) принимает целый массив разом, проще, чем
// отдельные ручки под добавление/удаление/переупорядочивание каждой строки.
export function BannerManager({ banners }: BannerManagerProps) {
  const [rows, setRows] = useState<BannerRow[]>(() => banners.map(bannerToRow));
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  // Новым (ещё не сохранённым) строкам нужен стабильный React-key, отличный от реальных id —
  // используем убывающие отрицательные числа, чтобы не пересечься с id из моков.
  const nextTempKey = useRef(-1);

  function updateRow(key: number, patch: Partial<BannerRow>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    setSavedAt(null);
  }

  function addRow() {
    const key = nextTempKey.current--;
    setRows((prev) => [...prev, { key, id: null, imageUrl: "", title: "", link: "", isActive: true }]);
    setSavedAt(null);
  }

  function removeRow(key: number) {
    setRows((prev) => prev.filter((row) => row.key !== key));
    setSavedAt(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  async function submit() {
    setIsSaving(true);
    setSavedAt(null);
    await saveBanners(rows.map(({ key, ...input }) => { void key; return input; }));
    setIsSaving(false);
    setSavedAt(Date.now());
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-3xl flex-col gap-6">
      {rows.length === 0 ? (
        <p className="font-venuscom text-body-sm text-black-olive/70">Баннеров пока нет.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((row) => (
            <div key={row.key} className="flex flex-col gap-3 bg-warm-cream p-[15px] shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor={`imageUrl-${row.key}`} className="font-venuscom text-caption text-black-olive/70">
                    Ссылка на изображение (загрузка из формы появится в пункте 34 плана)
                  </label>
                  <Input
                    id={`imageUrl-${row.key}`}
                    value={row.imageUrl}
                    onChange={(event) => updateRow(row.key, { imageUrl: event.target.value })}
                    placeholder="https://res.cloudinary.com/..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label htmlFor={`title-${row.key}`} className="font-venuscom text-caption text-black-olive/70">
                    Заголовок
                  </label>
                  <Input
                    id={`title-${row.key}`}
                    value={row.title}
                    onChange={(event) => updateRow(row.key, { title: event.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label htmlFor={`link-${row.key}`} className="font-venuscom text-caption text-black-olive/70">
                    Ссылка при клике
                  </label>
                  <Input
                    id={`link-${row.key}`}
                    value={row.link}
                    onChange={(event) => updateRow(row.key, { link: event.target.value })}
                    placeholder="#menu"
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 font-venuscom text-body-sm text-black-olive">
                    <input
                      type="checkbox"
                      checked={row.isActive}
                      onChange={(event) => updateRow(row.key, { isActive: event.target.checked })}
                      className="size-4 border-sage-mist accent-forest-ink"
                    />
                    Активен (виден на главной)
                  </label>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                onClick={() => removeRow(row.key)}
                className="self-start text-red-600 hover:text-red-600"
              >
                Удалить баннер
              </Button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addRow}
        className="self-start rounded-sm border border-sage-mist px-4 py-2 font-venuscom text-body-sm uppercase text-black-olive hover:bg-black-olive/5"
      >
        + Добавить баннер
      </button>

      <div className="flex items-center gap-4 border-t border-sage-mist pt-6">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Сохраняем…" : "Сохранить баннеры"}
        </Button>
        {!isSaving && savedAt && (
          <p className="font-venuscom text-caption text-forest-ink">Сохранено (заглушка)</p>
        )}
      </div>
    </form>
  );
}
