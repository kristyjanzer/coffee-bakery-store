"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateNotificationSettings, type NotificationSettings } from "@/lib/settings";

interface NotificationSettingsFormProps {
  initialSettings: NotificationSettings;
}

// Настройки уведомлений — email/SMS при новом заказе (docs/plan.md, пункт 21).
// updateNotificationSettings() — заглушка (мутации появятся вместе с остальными
// пунктами 22-31 плана), ничего не сохраняет по-настоящему — тот же принцип, что
// PageContentForm. Реальная отправка уведомлений при заказе — lib/telegram.ts
// (пункт 33 плана), эти настройки лишь описывают, куда/включено ли email/SMS.
export function NotificationSettingsForm({ initialSettings }: NotificationSettingsFormProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function handleChange<K extends keyof NotificationSettings>(field: K, value: NotificationSettings[K]) {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setSavedAt(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  async function submit() {
    setIsSaving(true);
    setSavedAt(null);
    await updateNotificationSettings(settings);
    setIsSaving(false);
    setSavedAt(Date.now());
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
        {!isSaving && savedAt && (
          <p className="font-venuscom text-caption text-forest-ink">Сохранено (заглушка)</p>
        )}
      </div>
    </form>
  );
}
