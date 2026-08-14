# План выполнения работ — «Coffee Bakery»

Основан на [about-project.md](about-project.md), [architecture.md](architecture.md) и [technologies.md](technologies.md).

## Frontend

1. Инициализация проекта: Next.js (App Router) + TypeScript (strict) + Tailwind, структура папок по architecture.md
2. Подключение дизайн-токенов из DESIGN.md, базовые UI-примитивы (Button, Modal, Input)
3. Layout: Header/Nav (логотип, меню, иконка корзины), Footer (О нас, Связаться с нами)
4. Главная страница: hero-блок (кофе с печеньками + название магазина)
5. Табы категорий (CategoryTabs) + секции товаров по категориям (ProductSection, ProductCard: фото, название, вес, цена, кнопка "+")
6. Счётчик количества на карточке товара (QtyStepper: +/-/количество)
7. Блок отзывов-слайдер (ReviewsSlider, Swiper/Embla)
8. Корзина (клиент): cartStore на Zustand + persist(localStorage)
9. Иконка корзины со счётчиком выбранных товаров в навигации
10. Виджет корзины: список товаров, итоговая стоимость, изменение/удаление позиций
11. Страница товара `/product/[id]`: карточка на весь экран (фото, название, состав, КБЖУ, вес, цена, "В корзину")
12. Оформление заявки без оплаты: форма (имя, контакт, комментарий, дата предзаказа)
13. Страница логина администратора `/admin/login`
14. Layout админ-панели: Sidebar (20% ширины) + область контента
15. Админ: Dashboard (сводка за день/неделю, график продаж, топ товаров, новые заказы, уведомления)
16. Админ: раздел Заказы (список с фильтрами по статусу, карточка заказа, смена статуса, история клиента)
17. Админ: раздел Товары (список, форма создания/редактирования, категории, сезонные/акционные товары)
18. Админ: раздел Клиенты (база клиентов, история покупок)
19. Админ: раздел Отзывы (модерация, ответ от магазина)
20. Админ: Управление страницами (О нас/Контакты/Доставка, SEO title/description, баннеры/слайдер на главной)
21. Админ: Настройки (пользователи админки и роли, настройки уведомлений)

## Backend и база данных

22. Настройка PostgreSQL + Prisma, переменные окружения (`DATABASE_URL`, `DIRECT_URL`)
23. Prisma-схема: Category, Product, Order, OrderItem, Customer, Review, AdminUser (см. architecture.md, раздел 3)
24. Миграция БД (`prisma migrate dev`)
25. Seed-скрипт (`prisma/seed.ts`): загрузка `menu.json` в БД через upsert (Category → Product)
26. API `/api/categories` (GET, публично)
27. API `/api/products`, `/api/products/[id]` (GET публично; POST/PATCH/DELETE — админ)
28. API `/api/orders` (POST — создание заявки гостем; GET — список заказов для админки)
29. API `/api/orders/[id]` (GET/PATCH — детали и смена статуса, админ)
30. API `/api/reviews`, `/api/reviews/[id]` (GET публично; PATCH — модерация/ответ, админ)
31. NextAuth: `authOptions` (Credentials-провайдер, bcrypt-хэш пароля, JWT-сессии, роли ADMIN/ORDER_MANAGER)
32. `middleware.ts`: защита `/admin/*` кроме `/admin/login`; проверка сессии внутри мутирующих API-роутов
33. Интеграция Telegram Bot API (`lib/telegram.ts`, `notifyNewOrder()`, вызов из `POST /api/orders`, обёрнут в try/catch)
34. Загрузка изображений товаров (Cloudinary/Supabase Storage, `lib/storage.ts`, unsigned upload из формы товара)
35. Подключение Server Components к Prisma напрямую (главная, товар, списки в админке — без похода через `/api/*`)
36. Security review (`.claude/skills/security-review`) + сквозное тестирование сценария: каталог → корзина → заявка → админка
