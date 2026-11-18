# ROB RUN Character Scan — Skycoach Test Assignment

Веб-сервис разбора персонажа **ROB RUN** и персонального подбора буст-услуг **Skycoach** перед еженедельным вайпом сервера.

## Живое демо (Production)

- **Экран 1 — Хаб ROB RUN на Skycoach:** [https://mypartypancakes.ru/rob-run-boost/](https://mypartypancakes.ru/rob-run-boost/) (также корень [https://mypartypancakes.ru/](https://mypartypancakes.ru/))
- **Экраны 2–7 — Character Scan & Калькулятор срока:** [https://mypartypancakes.ru/rob-run-calc/](https://mypartypancakes.ru/rob-run-calc/)

---

## Быстрый старт (локально)

Требуется **Node.js 20+** (используется нативный `fetch` и ESM). Единственная runtime-зависимость — `express`.

```bash
npm install
npm start
```

После запуска открой **http://localhost:8787/** (автоматически перенаправляет на стартовый хаб `/rob-run-boost/`).

Переменные окружения не обязательны для работы основного продукта (шаблон — `.env.example`, порт по умолчанию `8787`).

## Запуск в Docker (Production)

Проект контейнеризирован в изолированном non-root окружении (`read_only: true`, `cap_drop: ALL`, `no-new-privileges`):

```bash
docker compose up -d --build
```

Контейнер слушает `127.0.0.1:13787` (внутри `8787`) и публикуется наружу через изолированный виртуальный хост Nginx с TLS Let's Encrypt (`deploy/nginx-https.conf`, `deploy/remote-setup.sh`, `deploy/enable-ssl.sh`).

---

## Маршруты и пользовательский сценарий (Экраны 1–7)

| Маршрут / шаг | Роль в продукте | Реализация |
| --- | --- | --- |
| `/` → `/rob-run-boost/` | **Экран 1 — Хаб ROB RUN на Skycoach.** Живой снимок витрины `skycoach.gg/rob-run-boost` (оригинальная типографика `SKSkycoach` / `Stolzl`), где первой карточкой добавлен вход в бесплатный сервис **Character Scan** | `public/rob-run-boost/` (`index.html`, `page.css`, `page.js`, `sprite.svg`) |
| `/rob-run-calc/` (`start`) | **Экран 2 — Старт разбора.** Обзор 4 шагов и формулы `500 000 $ = 1 год` (кап `20 000 000 $ = 40 лет` за 7-дневный цикл сервера) | `public/rob-run-calc/index.html` + `app/product.js`, `app/product.css` |
| `/rob-run-calc/` (`profile`) | **Экран 3 — Профиль персонажа.** Поиск реального сервера EU / East US с таймером вайпа, ввод текущего `#` авторитета (`0–1200`), отметки 3 крупных ограблений | `public/rob-run-calc/app/product.js` |
| `/rob-run-calc/` (`studies`) | **Экран 4 — Дерево 172 изучений Ленни.** Интерактивный граф с автовыбором цепочки предков/потомков, поиском и фильтрацией по 8 веткам (учёт в срок: `100%`) | Ядро `public/rob-run-calc/index.html` + тема `skycoach-theme.css` |
| `/rob-run-calc/` (`property`) | **Экран 5 — База и защита.** Схема дома, построек на участке, станков с улучшениями и автопарка с тюнингом (учёт в срок: `40%`) | Ядро `index.html` + `skycoach-theme.css` + `app/product.css` |
| `/rob-run-calc/` (`money`) | **Экран 6 — Деньги и территория.** Отмытый кэш, контейнеры, кусты плантаций (`100%`), предохранители `T1–T3` (`40%`), тиры земли/поселения и разовый квест Ленни (`+10 лет`) | Ядро `index.html` + `app/product.js` |
| `/rob-run-calc/` (`result`) | **Экран 7 — Итоговое досье и кроссейл.** Сводка срока вайпа, прогноз `#сейчас → #после`, живой обратный отсчёт до вайпа реалма, статус 3 крупных ограблений/ачивок Steam, **персональная карточка-рекомендация + 4 реальных SKU Skycoach** и блок гайдов блога | `public/rob-run-calc/app/product.js`, `app/product.css`, `app/assets/` |
| `/steam-lab` | *Вспомогательный R&D-стенд (не часть пользовательского флоу).* Демонстрация CORS и ответа Steam Community XML, подтверждающая отсутствие публичного API инвентаря/изучений персонажа у Kefir | `public/index.html`, `public/app.js`, `server.js` |

Все пользовательские экраны калькулятора (`2–7`) поддерживают мгновенное синхронное переключение локали **`RU / EN`** без перезагрузки страницы. Для мобильных телефонов предусмотрена адаптивная заглушка (`public/shared/mobile-gate.js`), не блокирующая компактные ноутбуки (`768px+`, включая масштаб ОС 125–150%).

---

## Архитектурные решения

1. **Изолированный продуктовый слой поверх проверенного ядра (Overlay / Adapter pattern)**  
   В `public/rob-run-calc/index.html` (~6.5 МБ) встроены верифицированный граф из `172` предметов с offline `base64`-иконками (`#plannerData`) и точная формула расчёта срока. Чтобы исключить регрессии в математике и графе зависимостей, ядро оставлено без распила, а вся продуктовая логика Skycoach вынесена в изолированный IIFE-модуль `public/rob-run-calc/app/product.js` и стилевой слой `app/product.css`.
2. **Раздельное хранение состояния в `localStorage`**  
   - Состояние изучений, базы и денег калькулятора: `robrun-personal-planner-v1` (схема ядра не модифицируется).  
   - Профиль персонажа (сервер, текущий `#` авторитета, отметки ограблений): `robrun-character-scan-v1`.  
   - Выбранный язык интерфейса: `robrun-language` (`ru` / `en`).  
   Все обращения к `localStorage` защищены `try / catch` для корректной работы в приватных окнах браузера.
3. **Серверный прокси списка серверов с кэшем и offline-fallback (`lib/servers.js`)**  
   Эндпоинт `GET /api/rob-run/servers` кэширует ответ в памяти на 15 минут и при недоступности внешнего источника или клиентском рендеринге автоматически отдаёт локальный снимок из `public/data/servers.snapshot.json` (623 реальных сервера регионов `EU` и `East US`).
4. **Безопасность и изоляция инфраструктуры**  
   - На Express-сервере отключён `X-Powered-By`, включён `trust proxy`, лимит JSON-тела (`32kb`), строгая валидация домена `steamcommunity.com`, `AbortSignal.timeout(12000)` и graceful shutdown по `SIGTERM`/`SIGINT`.  
   - В продакшене сервис работает в отдельном hardened Docker-контейнере с non-root пользователем, read-only файловой системой, сброшенными Linux capabilities и локальным биндом порта под отдельным виртуальным хостом Nginx + Let's Encrypt TLS.

---

## Формула расчёта срока

```text
valuation = studies(unlock × 100%)
          + property(buy × 40%)
          + fuses(T1..T3 × 40%)
          + cash(100%) + inventory(100%) + plants(100%)
          + landTier(0 / 40k / 320k / 800k)
          + settlementTier(0 / 80k / 800k / 2.4M)

baseYears = min(40, floor(valuation / 500_000))
years     = baseYears + (lennyQuest ? 10 : 0)
```

---

## Структура проекта

```text
.
├── server.js                      Express-сервер (статика, редирект / -> /rob-run-boost/, /api/rob-run/servers)
├── Dockerfile                     Production Docker-образ (node:24-bookworm-slim, non-root user)
├── docker-compose.yml             Изолированный hardened-контейнер (read_only, cap_drop ALL, 127.0.0.1:13787)
├── lib/
│   └── servers.js                 Загрузка, парсинг, 15-мин кэш и snapshot-fallback серверов ROB RUN
├── public/
│   ├── data/servers.snapshot.json Локальный снимок 623 серверов EU / East US
│   ├── shared/mobile-gate.css|js  Адаптивная заглушка для узких мобильных экранов (RU / EN)
│   ├── rob-run-boost/             Экран 1: снимок витрины Skycoach + карточка Character Scan
│   └── rob-run-calc/
│       ├── index.html             Ядро калькулятора и каталог 172 предметов (#plannerData)
│       ├── skycoach-theme.css     Базовый дизайн-оверлей в палитре Skycoach
│       └── app/
│           ├── product.js         Продуктовый слой (экраны 2, 3, 7, синхронная i18n RU/EN, кроссейл)
│           ├── product.css        Стили продуктового слоя, стеклянного досье и карточек ProductCard / BlogCard
│           └── assets/            Очищенный ключевой арт досье, ингейм-сцены ограблений и 3D-трофеи
├── deploy/                        Конфигурации Nginx (HTTP/HTTPS), Let's Encrypt и скрипты деплоя
├── scripts/                       Вспомогательные offline-скрипты сборки снимков (не используются в рантайме)
└── docs/
    └── project_specification.md   Подробная продуктовая и техническая спецификация
```
