import { z } from "zod";

// Валидация тела PUT /api/settings/notifications (docs/plan.md, пункт 21). Флаги —
// строго boolean (форма шлёт checked чекбоксов), адрес/телефон — свободные строки
// с верхней границей длины, пустая строка допустима (уведомление выключено).
export const notificationSettingsSchema = z.object({
  notifyEmail: z.boolean(),
  notifyEmailAddress: z.string().trim().max(200),
  notifySms: z.boolean(),
  notifySmsPhone: z.string().trim().max(50),
});
