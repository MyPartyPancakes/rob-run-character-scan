# Спецификация

## Что это

Статический сервис разбора персонажа ROB RUN с кроссейлом Skycoach. Бэкенд — Express (`server.js`) только как раздача статики и прокси списка серверов. Своего чекаута нет.

Прод: [https://mypartypancakes.ru/](https://mypartypancakes.ru/) (хаб + калькулятор). Репозиторий: [MyPartyPancakes/rob-run-character-scan](https://github.com/MyPartyPancakes/rob-run-character-scan).

## Экраны

| # | URL / состояние | Источник |
| --- | --- | --- |
| — | `/` | `302`-редирект на `/rob-run-boost/` (старая техническая Steam-лаба вынесена на `/steam-lab`) |
| 1 | `/rob-run-boost/` | живой снимок `skycoach.gg/rob-run-boost` + карточка Character Scan первой |
| 2 | `/rob-run-calc/` `start` | стартовый экран калькулятора (укорочена плашка `40 лет`, добавлен обзор 4 шагов `#landingOverview` без вычеркнутых лозунгов/соцсетей) |
| 3 | `/rob-run-calc/` `profile` | наш экран персонажа (`app/product.js`): сервер, `#` авторитета, 3 ограбления |
| 4 | `studies` | дерево 172 изучений Ленни (ядро + чистка «Ларри → Ленни», скрыт Discord-репорт; в `.footer-note` только строка про цены справочника, без атрибуции RobRun) |
| 5 | `property` | «Твоя база» (ядро + контрастный фиолетовый active-стиль карточек в модалках) |
| 6 | `money` | деньги / контейнеры / земля / предохранители / квест Ленни |
| 7 | `result` | финальное досье на чистом арте со спины (кнопки-пилюли `.hud-pill-btn`) + ограбления с ингейм-скринами + 5 офферов `ProductCard` в один ряд (1-я карточка — персональная рекомендация + 4 базовых SKU) + гайды `BlogCard` |

## Формула срока (не менять)

Источник: `rob-run-calc.com`, данные актуализированы `17.11.2026` / `18.11.2026`.

```
valuation = studies(unlock, 100%)
          + property(buy × 40%)
          + cash + inventory          // 100%
          + земля + поселение         // фикс по тиру
          + предохранители × 40%
          + кусты × 100%
baseYears = min(40, floor(valuation / 500000))
years     = baseYears + (lenny ? 10 : 0)
```

Предохранители: T1 $20k, T2 $100k, T3 $500k (в оценку 40%). Кусты: $30k / $40k / $50k (100%). Земля: 0 / 40k / 320k / 800k. Поселение: 0 / 80k / 800k / 2.4M.

Почему `40%` у имущества: в ROB RUN базовая цена продажи купленного предмета скупщику равна ровно 40% цены покупки в ноутбуке поставок Ленни.

## Авторитет

Не Notoriety 1–5. В ROB RUN авторитет = накопленный тюремный срок персонажа (`#` в игре). Не сбрасывается с вайпом. Потолок персонажа — `1200` лет. Калькулятор считает срок **текущего** вайпа отдельно, а на финале выводит `#сейчас → #после`.

## Крупные ограбления

Источник: клиентские строки и вики (`robrunwiki.com/robberies/`, `robrunstatus.com/ru/guides/heists`, `wikily.gg`, `robrun.pro`). На годы срока **не** влияют — это отметки достижений.

| ID | Название в игре (RU / EN) | Ачивка Steam | Сцена и 3D-трофей на финале |
| --- | --- | --- | --- |
| `bank` | Вскрытие золотохранилища / Gold Vault Heist | `Gold Digger` | `scene-bank.jpg` + `item-gold.webp` (золотой слиток) |
| `police` | Взлом полицейского арсенала / Police Arsenal Break-in | `Disarmed and Dangerous` | `scene-police-real.webp` + `item-lmg.webp` (пулемёт `LM 249 Mk2`) |
| `gallery` | Кража музейного экспоната / Museum Exhibit Theft | `Hands Off` | `scene-gallery-real.jpg` + `item-egg.webp` (`BIG EGG #53`) |

На экране 7 у выполненных ограблений кнопка скрыта; у незакрытых отображается кнопка `Помощь с прохождением` (`Help with completion`), плавно скроллящая к `#offersSection`.

## Серверы

Два региона: EU и East US. Цикл жизни каждого реалма — 7 дней. Эндпоинт `/api/rob-run/servers` (кэш 15 мин, fallback на снимок `public/data/servers.snapshot.json` — 623 реальных сервера с `robrunstatus.com`).

## Кроссейл и поведение кнопок на финале

5 карточек `ProductCard` в один ряд в `#resultOffers` (1:1 со стилем экрана 1, шрифты `SKSkycoach` и `Stolzl`, переведены на `RU` и `EN`):

- **1-я карточка — персональная рекомендация** (`.sc-card--recommended`, свечение `#5A30FF / #8248FF`, бейдж `★ Рекомендация` / `★ Recommended`, подзаголовок `Оффер по твоим ответам` / `Offer based on your answers`):
  - срок `< 12` лет и не закрыт кап → `Быстрый старт вайпа` / `Fast Wipe Start` (`Royal Bundle`);
  - не закрыто `>= 2` ограблений → `Рейд по ограблениям` / `Heist Raid Crew` (`Напарники / Crew for Hire`);
  - изучений `< 25` → `Подбор снаряжения` / `Gear & Vehicle Pack` (`Предметы / Items`);
  - остаток оценки до 40 лет `> 0` → `Добор срока кэшем` / `Cap Top-Up Cash` (`Наличные / Cash`);
  - базовый кап 40 лет закрыт → `Топ-сборка на вайп` / `Top Wipe Loadout` (`Предметы / Items`).
- **Карточки 2–5 — базовый каталог Skycoach**:

| Оффер (RU / EN) | Цена | URL |
| --- | --- | --- |
| Наличные / Cash | `$1.99` | https://skycoach.gg/rob-run-boost/cash |
| Предметы / Items | `$7.99` | https://skycoach.gg/rob-run-boost/products/items-13124 |
| Royal Bundle | `$29.99` | https://skycoach.gg/rob-run-boost/products/royal-bundle-13125 |
| Напарники / Crew for Hire | `$7.99` | https://skycoach.gg/rob-run-boost/products/crew-for-hire-13123 |

Все вспомогательные CTA выше блока услуг (кнопки-пилюли `.hud-pill-btn` в плашках досье, `Докупить до 40 лет`, `Помощь с прохождением`) **плавно прокручивают страницу к `#offersSection`** с подсветкой соответствующей карточки, без внешнего редиректа.

## Слой кода

```
rob-run-character-scan/
  README.md                     описание проекта, маршрутов и архитектуры
  Dockerfile                    production-образ (node:24-bookworm-slim, non-root)
  docker-compose.yml            изолированный контейнер (127.0.0.1:13787 -> 8787)
  server.js                     редирект / -> /rob-run-boost/, статика, /steam-lab, /api/rob-run/servers
  lib/servers.js                кэш 15 мин + fallback на снимок серверов
  deploy/                       конфиги Nginx + Let's Encrypt и скрипты выкладки
  public/shared/                mobile-gate.css|js (RU / EN), favicon/ (локальная копия Skycoach)
  public/data/                  servers.snapshot.json (623 сервера)
  public/rob-run-boost/         экран 1: живой снимок skycoach.gg + page.css|js + sprite.svg
  public/rob-run-calc/
    index.html                  ядро калькулятора (~6.5 MB, не трогать логику/данные)
    skycoach-theme.css          базовый оверлей темы
    app/
      product.css|js            весь продуктовый слой (экраны 2, 3, 7, правки 4–6, синхронный i18n RU/EN)
      assets/                   hero-clean.jpg, scene-bank.jpg, scene-police-real.webp,
                                scene-gallery-real.jpg, item-gold.webp, item-lmg.webp, item-egg.webp
```

## Хранение

- Калькулятор: `robrun-personal-planner-v1` (version 9)
- Профиль: `robrun-character-scan-v1` — `{ serverId, authority, heists: { bank, police, gallery } }`
- Язык: `robrun-language` (`ru` / `en`)

## Мобильная заглушка

`@media (max-width: 767px), ((hover: none) and (pointer: coarse) and (max-width: 960px) and (max-height: 480px))` — небольшие ноутбуки (768px+, включая скейл ОС 125–150%) остаются в десктопном интерфейсе; телефоны (вертикально и горизонтально) получают заглушку.
