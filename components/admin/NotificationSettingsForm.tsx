"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { NotificationSettings } from "@/lib/settings";
import { updateNotificationSettings } from "@/lib/settingsAdminApi";

interface NotificationSettingsFormProps {
  initialSettings: NotificationSettings;
}

// Настройки уведомлений — email/SMS при новом заказе (docs/plan.md, пункт 21).
// Сохранение идёт в PUT /api/settings/notifications (проверка сессии ADMIN + zod
// в роуте), при успехе router.refresh(). Реальная отправка уведомлений при заказе —
// lib/telegram.ts (пункт 33 плана), эти настройки лишь описывают, куда/включено ли.
export function NotificationSettingsForm({ initialSettings }: NotificationSettingsFormProps) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleChange<K extends keyof NotificationSettings>(field: K, value: NotificationSettings[K]) {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setSavedAt(null);
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  async function submit() {
    setIsSaving(true);
    setSavedAt(null);
    setError(null);
    const result = await updateNotificationSettings(settings);
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSavedAt(Date.now());
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-3 bg-warm-cream p-[15px] shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
        <label className="flex items-center gap-2 font-venuscom text-body-sm text-black-olive">
          <input
            type="checkbox"
            checked={settings.notifyEmail}
            onChange={(event) => handleChange("notifyEmail", event.target.checked)}
            className="size-4 border-sage-mist accent-forest-ink"
          />
          Уведомлять по email при новом заказе
        </label>
        <div>
          <label htmlFor="notifyEmailAddress" className="font-venuscom text-caption text-black-olive/70">
            Email для уведомлений
          </label>
          <Input
            id="notifyEmailAddress"
            type="email"
            value={settings.notifyEmailAddress}
            onChange={(event) => handleChange("notifyEmailAddress", event.target.value)}
            disabled={!settings.notifyEmail}
            placeholder="orders@example.com"
            className="mt-1 disabled:opacity-60"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 bg-warm-cream p-[15px] shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
        <label className="flex items-center gap-2 font-venuscom text-body-sm text-black-olive">
          <input
            type="checkbox"
            checked={settings.notifySms}
            onChange={(event) => handleChange("notifySms", event.target.checked)}
            className="size-4 border-sage-mist accent-forest-ink"
          />
          Уведомлять по SMS при новом заказе
        </label>
        <div>
          <label htmlFor="notifySmsPhone" className="font-venuscom text-caption text-black-olive/70">
            Телефон для SMS
          </label>
          <Input
            id="notifySmsPhone"
            type="tel"
            value={settings.notifySmsPhone}
            onChange={(event) => handleChange("notifySmsPhone", event.target.value)}
            disabled={!settings.notifySms}
            placeholder="+7 900 000-00-00"
            className="mt-1 disabled:opacity-60"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Сохраняем…" : "Сохранить"}
        </Button>
        {!isSaving && savedAt && !error && (
          <p className="font-venuscom text-caption text-forest-ink">Сохранено</p>
        )}
        {error && <p className="font-venuscom text-caption font-semibold text-red-600">{error}</p>}
      </div>
    </form>
  );
}
