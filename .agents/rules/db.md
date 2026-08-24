# База данных (Prisma/PostgreSQL)

- `prisma/schema.prisma`: типы полей по смыслу — `Int`/`BigInt` для количеств/id, деньги целыми
  числами (не `Float`), `DateTime` для дат. `Int @id @default(autoincrement())` — нормальный id
  для масштаба этого проекта, не менять на UUID/`BigInt` "про запас".
- Любая правка схемы, которая меняет существующие поля/связи, — через
  `npx prisma migrate dev`, не руками в БД.
- `prisma/seed.ts` — только `upsert`, не `create`, чтобы повторный запуск был безопасен (см.
  [architecture.md](../../docs/architecture.md)).
- N+1 не проходит: где Prisma тянет связанные данные в цикле (`.map(async ...)` с отдельным
  запросом на каждой итерации) — переписывать на один `include`/`select`.
- `$queryRaw`/`$executeRaw` — только tagged template или параметры Prisma, никогда
  конкатенация строк с пользовательским вводом (SQL injection).
- Мутирующие `/api/*` обращаются к Prisma только после проверки `getServerSession(authOptions)`
  и роли (`ADMIN`/`ORDER_MANAGER`) — проверка до запроса к БД, не после.
- В проекте нет RLS и нет Supabase Auth (`auth.uid()`) — авторизация целиком на уровне
  приложения, не предлагать политики БД вместо проверки роли в коде.
- `DATABASE_URL`/`DIRECT_URL` — только `process.env` на сервере, никогда в клиентском коде и
  никогда с префиксом `NEXT_PUBLIC_`.
