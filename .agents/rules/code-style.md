# Стиль кода и проверки

- Строгий TypeScript (`strict: true` в `tsconfig.json`) — не отключай
  строгие проверки, не используй `any`, для
  внешних данных (ответы API) описывай интерфейсы.
- Перед тем как считать задачу выполненной — прогонять `npm run lint`
  (ESLint flat config, `eslint-config-next`) и `npx tsc --noEmit`
  (проект использует `noEmit: true`). Не коммитить с ошибками линта/типов.
- Стилизация — только Tailwind-классы (utility-first), без инлайновых
  `style={{}}` и без отдельных css-модулей, кроме `globals.css`.
