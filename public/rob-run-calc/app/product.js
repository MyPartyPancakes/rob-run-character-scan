/**
 * Skycoach ROB RUN Character Scan - Product Layer (`app/product.js`).
 *
 * Architectural role:
 * - Mounted as an isolated IIFE on top of the untouched sentence-calculator core (`../index.html`),
 *   keeping the formula, 172-node research tree (`#plannerData`), and core state persistence intact.
 * - Adds Screen 2 overview (`#landingOverview`), Screen 3 character profile (`#profileScreen`),
 *   Screens 4-6 sidebar counters & copy polish, and Screen 7 character dossier + Skycoach cross-sell.
 * - Stores character metadata in a separate localStorage key (`robrun-character-scan-v1`), never
 *   mutating the core `robrun-personal-planner-v1` schema.
 *
 * Core globals contract (defined in `index.html` inline script before this file loads):
 * - Functions wrapped/extended: `showScreen`, `refresh`, `refreshTotals`, `resetCalculation`,
 *   `localizeValue`, `localizePage`, `openSlotPicker`, `openUpgradeDialog`,
 *   `openTerritoryPicker`, `openPlantationDialog`.
 * - Read-only helpers & state bridge: `window.__planner` (`{ state, DATA }`), `totals(state)`,
 *   `propertyItems(state)`, `money(amount)`, `yearWord(years)`.
 */
(function characterScan() {
  const HUB = "https://skycoach.gg/rob-run-boost";
  const PROFILE_KEY = "robrun-character-scan-v1";
  const MAX_AUTHORITY = 1200;
  const WIPE_MS = 7 * 24 * 60 * 60 * 1000;
  const HERO_ART = "./app/assets/hero-clean.jpg";
  const GAME_ICON = "/rob-run-boost/vendor/storage/uploads/game-assets/icons/92b338d15a.svg";

  const OFFERS = {
    cash: {
      id: "cash",
      href: `${HUB}/cash`,
      priceHtml: '$1<sup class="sc-cents">99</sup>',
      art: "/rob-run-boost/vendor/storage/uploads/products/rob-run-cash1794404240_picture_bg.png",
      icon: "/rob-run-boost/vendor/storage/uploads/products/rob-run-cash1794409915_picture_item_small.png",
      ru: {
        title: "Наличные",
        cta: "Купить",
        points: ["Любая сумма на заказ", "Без долгого фарма", "Быстрая передача в игре"],
      },
      en: {
        title: "Cash",
        cta: "Buy now",
        points: ["Any Amount", "Skip The Grind", "Quick Completion"],
      },
    },
    items: {
      id: "items",
      href: `${HUB}/products/items-13124`,
      priceHtml: '$7<sup class="sc-cents">99</sup>',
      art: "/rob-run-boost/vendor/storage/uploads/products/rob-run-items1794410932_picture_bg.png",
      icon: "/rob-run-boost/vendor/storage/uploads/products/rob-run-items1794412902_picture_item_small.png",
      ru: {
        title: "Предметы",
        cta: "Купить",
        points: ["Обмен прямо в игре", "Легендарные вещи", "Самый быстрый транспорт"],
      },
      en: {
        title: "Items",
        cta: "Buy now",
        points: ["In-Game Trade", "Legendary Items", "Fastest Vehicles"],
      },
    },
    royal: {
      id: "royal",
      href: `${HUB}/products/royal-bundle-13125`,
      priceHtml: '$29<sup class="sc-cents">99</sup>',
      art: "/rob-run-boost/vendor/storage/uploads/products/rob-run-royal-bundle1794412428_picture_bg.png",
      icon: "/rob-run-boost/vendor/storage/uploads/products/rob-run-royal-bundle1794412428_picture_item_small.png",
      ru: {
        title: "Royal Bundle",
        cta: "Купить",
        points: ["Богатый и мощный старт", "Оружие и броня сразу", "Royal E входит в набор"],
      },
      en: {
        title: "Royal Bundle",
        cta: "Buy now",
        points: ["Start Rich & Strong", "Weapons & Armor", "Royal E in Royal Pack"],
      },
    },
    crew: {
      id: "crew",
      href: `${HUB}/products/crew-for-hire-13123`,
      priceHtml: '$7<sup class="sc-cents">99</sup>',
      art: "/rob-run-boost/vendor/storage/uploads/products/rob-run-crew-for-hire1794405274_picture_bg.png",
      icon: "/rob-run-boost/vendor/storage/uploads/products/rob-run-crew-for-hire1794405274_picture_item_small.png",
      ru: {
        title: "Напарники",
        cta: "Купить",
        points: ["Любая задача в рейде", "Любое количество часов", "Ограбления без гринда"],
      },
      en: {
        title: "Crew for Hire",
        cta: "Buy now",
        points: ["Any Task", "Any Number of Hours", "Skip the Grind"],
      },
    },
  };

  const GUIDES = [
    {
      href: "https://skycoach.gg/blog/rob-run/articles/rob-run-best-settings-guide",
      cover: "/rob-run-boost/vendor/storage/uploads/blog-posts/1969/images/1969_1794913484_450x350.jpg",
      cover2x: "/rob-run-boost/vendor/storage/uploads/blog-posts/1969/images/1969_1794913484_900x700.jpg",
      ru: {
        label: "Гайды ROB RUN",
        title: "Лучшие настройки ROB RUN",
        descr:
          "Оптимальные настройки графики и системы для стабильного FPS в городе без потери видимости в перестрелках и погонях.",
      },
      en: {
        label: "ROB RUN Guides",
        title: "Best ROB RUN Settings Guide",
        descr:
          "ROB RUN players are very divided on the game, praising its core idea while criticizing its implementation as well as several persistent technical issues. I wrote this ROB RUN settings guide to help you optimize your game’s performance without sacrificing too much of its visual fidelity.",
      },
    },
    {
      href: "https://skycoach.gg/blog/rob-run/articles/rob-run-best-weapons-tier-list",
      cover: "/rob-run-boost/vendor/storage/uploads/blog-posts/1965/images/1965_1794580791_450x350.jpg",
      cover2x: "/rob-run-boost/vendor/storage/uploads/blog-posts/1965/images/1965_1794580791_900x700.jpg",
      ru: {
        label: "Гайды ROB RUN",
        title: "Тир-лист лучшего оружия в ROB RUN",
        descr:
          "В перестрелках ROB RUN всё решают секунды. Собрали тир-лист лучших пушек под рейды, защиту участка и крупные ограбления.",
      },
      en: {
        label: "ROB RUN Guides",
        title: "ROB RUN Best Weapons Tier List",
        descr:
          "ROB RUN really should involve the word “shoot” in its title, considering how much time you’ll be doing exactly that. Check out my ROB RUN best weapons tier list if you want to know which weapons are going to ensure you win most gunfights.",
      },
    },
    {
      href: "https://skycoach.gg/blog/rob-run/articles/rob-run-how-to-make-money-fast",
      cover: "/rob-run-boost/vendor/storage/uploads/blog-posts/1964/images/1964_1794577540_450x350.jpg",
      cover2x: "/rob-run-boost/vendor/storage/uploads/blog-posts/1964/images/1964_1794577540_900x700.jpg",
      ru: {
        label: "Гайды ROB RUN",
        title: "Как быстро заработать деньги в ROB RUN",
        descr:
          "Хочешь успеть закрыть максимум до еженедельного вайпа? Подробный маршрут быстрого заработка с нуля в Лути-Бей.",
      },
      en: {
        label: "ROB RUN Guides",
        title: "How to Make Money Fast in ROB RUN",
        descr:
          "Starting out in ROB RUN and want to experience everything it has to offer before the weekly wipe? I wrote this how to make money fast in ROB RUN guide to help you become a millionaire in no time.",
      },
    },
  ];

  const HEISTS = [
    {
      id: "bank",
      achievement: "Gold Digger",
      scene: "./app/assets/scene-bank.jpg",
      trophy: "./app/assets/item-gold.webp",
      ru: {
        badge: "Вскрытие золотохранилища",
        spot: "Банк Лути-Бей · Бур + ID-карта",
        question: "Ты вскрыл золотохранилище банка?",
        description:
          "Главный банк Лути-Бей в Даунтауне. Основное хранилище вскрывается Буром, отдельное золотохранилище открывает ID-карта из Мотеля Ленни, а о взломе сразу узнаёт весь город.",
      },
      en: {
        badge: "Gold Vault Heist",
        spot: "Looty Bay Bank · Drill + ID Card",
        question: "Did you breach the bank gold vault?",
        description:
          "The central bank of Looty Bay in Downtown. The main vault takes a Drill, the gold vault opens with an ID Card from Lenny’s Motel, and the breach alerts the whole city.",
      },
    },
    {
      id: "police",
      achievement: "Disarmed and Dangerous",
      scene: "./app/assets/scene-police-real.webp",
      trophy: "./app/assets/item-lmg.webp",
      wideTrophy: true,
      ru: {
        badge: "Взлом полицейского арсенала",
        spot: "Полицейский участок · ID-карта за Улики",
        question: "Ты вскрыл арсенал полицейского участка?",
        description:
          "Центральный полицейский участок Лути-Бей. Оружейная комната открывается ID-картой, выменянной на Улики в Мотеле Ленни, и поднимает тревогу на весь город.",
      },
      en: {
        badge: "Police Arsenal Break-in",
        spot: "Police Station · ID Card for Evidence",
        question: "Did you breach the police station armory?",
        description:
          "Central Police Department of Looty Bay. The armory opens with an ID Card bartered for Evidence at Lenny’s Motel and triggers a citywide alert.",
      },
    },
    {
      id: "gallery",
      achievement: "Hands Off",
      scene: "./app/assets/scene-gallery-real.jpg",
      trophy: "./app/assets/item-egg.webp",
      ru: {
        badge: "Кража музейного экспоната",
        spot: "Арт-галерея · Стеклорез · BIG EGG #53",
        question: "Ты унёс экспонат из Арт-галереи?",
        description:
          "Центральная галерея искусств Лути-Бей. Витрина с главным экспонатом BIG EGG #53 на постаменте вскрывается Стеклорезом, о краже сразу узнаёт весь город.",
      },
      en: {
        badge: "Museum Exhibit Theft",
        spot: "Art Gallery · Glass Cutter · BIG EGG #53",
        question: "Did you steal the Art Gallery exhibit?",
        description:
          "The central art gallery of Looty Bay. The display case holding BIG EGG #53 opens with a Glass Cutter and alerts the entire city.",
      },
    },
  ];

  const UI_COPY = {
    ru: {
      langAria: "Язык интерфейса",
      stepLabels: ["Шаг 02 / 04", "Шаг 03 / 04", "Шаг 04 / 04"],
      mobileGateTitle: "Откройте на компьютере",
      mobileGateBody:
        "Этот разбор персонажа собран как тестовый прототип под широкий экран: дерево изучений и финальное досье на телефоне не умещаются. Пожалуйста, откройте страницу на ПК или ноутбуке.",
      stepsAria: "Четыре шага расчёта",
      steps: ["Персонаж", "Изучения", "Имущество", "Деньги"],
      equationLeft: "500 000 $",
      equationRight: "1 год срока",
      eyebrow: "Что входит в разбор",
      meta: "4 шага · формула 1 в 1",
      cards: [
        {
          step: "Шаг 01",
          badge: "#0-1200",
          title: "Персонаж и сервер",
          body: "Реальный реалм EU или East US для таймера 7-дневного вайпа, текущий # авторитета и отметки 3 крупных ограблений.",
        },
        {
          step: "Шаг 02",
          badge: "100%",
          title: "Дерево изучений",
          body: "Клик по предмету сразу отмечает цепочку элементов до него.",
        },
        {
          step: "Шаг 03",
          badge: "40%",
          title: "База и защита",
          body: "Жильё, постройки на участке, станки с апгрейдами, авто с тюнингом и предохранители T1-T3 учитываются по 40% цены.",
        },
        {
          step: "Шаг 04",
          badge: "100%",
          title: "Деньги и территория",
          body: "Отмытый кэш, лут в контейнерах, кусты на плантациях и фиксированная прибавка за выбранный тир земли и поселения.",
        },
      ],
      capKicker: "Потолок за один 7-дневный сервер",
      capAmount: "20 000 000 $",
      capSuffix: "= 40 лет",
      summaryTitle: "На выходе: готовое досье персонажа",
      summaryBody:
        "Покажем срок этого вайпа, прогноз общего # авторитета после перехода на новый реалм, остаток оценки до капа и подберём услуги Skycoach под узкие места аккаунта.",
      hubBack: "← Все услуги Skycoach ROB RUN",
      propertyFooterTitle: "База собрана?",
      propertyFooterSub: "Проверь жильё, постройки, станки и транспорт перед следующим шагом.",
      moneyFooterTitle: "База собрана",
      moneyFooterSub: "Добавь деньги и предметы в контейнерах.",
      inventoryHint: "Укажи общую стоимость добычи в сейфах, тумбах и на стеллажах.",
      profile: {
        kicker: "Шаг 01 / 04 · персонаж",
        title: "Разбор персонажа",
        serverLabel: "Сервер",
        serverHint: "Имена из списка State Selection / robrunstatus: регионы EU и East US. Начни вводить ID или название.",
        serverPlaceholder: "Например EU-0 3609 Iron Plains",
        serverNone: "Сервер не выбран, на финале покажем общий цикл 7 дней.",
        serverWipePrefix: "вайп",
        serverWipeFallback: "через 7 дней с открытия",
        authLabel: "Текущий авторитет",
        authHint: "Сколько лет # уже есть на персонаже.",
        authErrInt: "Введи целое число лет авторитета.",
        authErrMax: `В игре потолок авторитета: ${MAX_AUTHORITY} лет.`,
        back: "← На главную",
        next: "ДАЛЕЕ →",
      },
      sidebar: {
        studies: "Изучений",
        properties: "Имуществ",
      },
      result: {
        hubLink: "← Хаб ROB RUN",
        back: "← Назад",
        restart: "Новый расчёт",
        stageBadge: "Досье персонажа · ROB RUN",
        realmMuted: "Реалм:",
        noServerShort: "сервер не выбран",
        wipeTermLabel: "Срок этого вайпа",
        authorityLabel: "Авторитет сейчас / после",
        authorityBtn: "Добавить",
        valuationLabel: "Общая оценка аккаунта",
        valuationBtn: "Добавить",
        countsLabel: "Изучений / имуществ",
        countsBtn: "Добавить",
        timerLabel: "Жизнь сервера до вайпа",
        timerSub: "Цикл реалма: 7 дней",
        wipePassed: "Вайп уже прошёл",
        dayShort: "д",
        researchLabel: "Изучения · 100%",
        researchBtn: "Добавить",
        propertyLabel: "Имущество и база · 40%",
        propertyBtn: "Добавить",
        cashLabel: "Отмытые деньги · 100%",
        cashBtn: "Добавить",
        buyToCap: "Докупить до 40 лет",
        heistsTitle: "Крупные ограбления и достижения",
        heistsSub: "Отметки по твоему персонажу",
        heistDone: "Выполнено",
        heistTodo: "Не закрыто",
        toOffersBtn: "Помощь с прохождением",
        offersTitle: "Услуги Skycoach для ROB RUN",
        offersSub: "Первая карточка - персональная рекомендация по твоим ответам",
        recBadge: "Рекомендация",
        recSub: "Оффер по твоим ответам",
        guidesTitle: "Популярные гайды",
        viewMoreTop: "Больше материалов",
        viewMoreTitle: "Перейти в блог",
      },
    },
    en: {
      langAria: "Interface language",
      stepLabels: ["Step 02 / 04", "Step 03 / 04", "Step 04 / 04"],
      mobileGateTitle: "Open on a computer",
      mobileGateBody:
        "This Character Scan prototype is designed for wide screens: the research tree and final dossier do not fit on phones. Please open this page on a PC or laptop.",
      stepsAria: "Four calculation steps",
      steps: ["Character", "Research", "Property", "Money"],
      equationLeft: "500 000 $",
      equationRight: "1 year in prison",
      eyebrow: "What the scan covers",
      meta: "4 steps · exact formula",
      cards: [
        {
          step: "Step 01",
          badge: "#0-1200",
          title: "Character & realm",
          body: "Pick your EU or East US server for the 7-day wipe timer, enter current # reputation, and mark 3 major session heists.",
        },
        {
          step: "Step 02",
          badge: "100%",
          title: "Research tree",
          body: "Clicking an item immediately marks the chain of items before it.",
        },
        {
          step: "Step 03",
          badge: "40%",
          title: "Base & defense",
          body: "Housing, outdoor buildings, upgraded workbenches, tuned vehicles, and T1-T3 fuses add 40% of purchase cost.",
        },
        {
          step: "Step 04",
          badge: "100%",
          title: "Money & territory",
          body: "Laundered cash, container loot, plantation plants, plus the fixed value bonus from your land and settlement tiers.",
        },
      ],
      capKicker: "Cap per 7-day server cycle",
      capAmount: "20 000 000 $",
      capSuffix: "= 40 years",
      summaryTitle: "Final output: complete character dossier",
      summaryBody:
        "See your sentence for this wipe, projected total # reputation on the next realm, remaining value to the cap, and tailored Skycoach offers for your account’s weak spots.",
      hubBack: "← All Skycoach ROB RUN services",
      propertyFooterTitle: "Is your base ready?",
      propertyFooterSub: "Review your home, buildings, workbenches, and vehicle before moving on.",
      moneyFooterTitle: "Base complete",
      moneyFooterSub: "Add your money and container contents.",
      inventoryHint: "Enter the total value of loot stored in safes, cabinets, and racks.",
      profile: {
        kicker: "Step 01 / 04 · character",
        title: "Character Scan",
        serverLabel: "Server",
        serverHint: "Server names from State Selection / robrunstatus: EU and East US regions. Start typing an ID or name.",
        serverPlaceholder: "For example EU-0 3609 Iron Plains",
        serverNone: "No server selected, showing the standard 7-day cycle on the final screen.",
        serverWipePrefix: "wipe",
        serverWipeFallback: "7 days after opening",
        authLabel: "Current reputation",
        authHint: "How many # years your character already has.",
        authErrInt: "Enter a whole number of reputation years.",
        authErrMax: `In-game reputation cap is ${MAX_AUTHORITY} years.`,
        back: "← Home",
        next: "NEXT →",
      },
      sidebar: {
        studies: "Research",
        properties: "Property items",
      },
      result: {
        hubLink: "← ROB RUN Hub",
        back: "← Back",
        restart: "New scan",
        stageBadge: "Character Dossier · ROB RUN",
        realmMuted: "Realm:",
        noServerShort: "no server selected",
        wipeTermLabel: "Sentence this wipe",
        authorityLabel: "Reputation now / after",
        authorityBtn: "Add",
        valuationLabel: "Total account value",
        valuationBtn: "Add",
        countsLabel: "Research / property",
        countsBtn: "Add",
        timerLabel: "Server time until wipe",
        timerSub: "Realm cycle: 7 days",
        wipePassed: "Wipe completed",
        dayShort: "d",
        researchLabel: "Research · 100%",
        researchBtn: "Add",
        propertyLabel: "Property & base · 40%",
        propertyBtn: "Add",
        cashLabel: "Laundered money · 100%",
        cashBtn: "Add",
        buyToCap: "Top up to 40 years",
        heistsTitle: "Major Heists & Achievements",
        heistsSub: "Your character’s heist marks",
        heistDone: "Completed",
        heistTodo: "Not cleared",
        toOffersBtn: "Help with completion",
        offersTitle: "ROB RUN Boosting Services",
        offersSub: "First card - personalized recommendation based on your answers",
        recBadge: "Recommended",
        recSub: "Offer based on your answers",
        guidesTitle: "Popular guides",
        viewMoreTop: "View more articles",
        viewMoreTitle: "Visit our blog",
      },
    },
  };

  const emptyProfile = () => ({
    serverId: "",
    authority: 0,
    heists: { bank: false, police: false, gallery: false },
  });

  let profile = loadProfile();
  let servers = [];
  let wipeTimer = 0;
  let isSyncingCopy = false;
  let lastSyncedLang = "";

  injectProfileScreen();
  injectSidebarCounts();
  restyleResultScreen();
  restyleLandingSteps();
  patchCoreCopy();
  wireFlow();
  loadServers();

  function getLang() {
    return document.documentElement.lang === "en" ? "en" : "ru";
  }

  function cleanCopyText(text) {
    return String(text)
      .replace(/[—–]/g, "-")
      .replace(/ЛАРРИ/g, "ЛЕННИ")
      .replace(/Ларри/g, "Ленни")
      .replace(/ларри/g, "ленни")
      .replace(/LARRY/g, "LENNY")
      .replace(/Larry/g, "Lenny")
      .replace(/08\.11\.2026/g, "17.11.2026")
      .replace(/8 November 2026/g, "17 November 2026")
      .replace(/11\.11\.2026/g, "18.11.2026")
      .replace(/11 November 2026/g, "18 November 2026");
  }

  function patchCoreCopy() {
    document.querySelectorAll('.data-date time[datetime="2026-11-08"]').forEach((el) => {
      el.setAttribute("datetime", "2026-11-17");
    });
    document.querySelectorAll('.data-date time[datetime="2026-11-11"]').forEach((el) => {
      el.setAttribute("datetime", "2026-11-18");
    });

    if (typeof window.localizeValue === "function") {
      const originalLocalizeValue = window.localizeValue;
      window.localizeValue = function patchedLocalizeValue(record, value) {
        const res = originalLocalizeValue(record, value);
        return {
          source: res.source,
          output: cleanCopyText(res.output),
        };
      };
    }

    if (typeof window.localizePage === "function") {
      const originalLocalizePage = window.localizePage;
      window.localizePage = function patchedLocalizePage() {
        originalLocalizePage();
        document.title = cleanCopyText(document.title);
        const lang = getLang();
        if (!isSyncingCopy && lastSyncedLang !== lang) {
          lastSyncedLang = lang;
          isSyncingCopy = true;
          try {
            syncAllCopy();
            if (window.__planner) {
              paintResultExtras();
            }
          } finally {
            isSyncingCopy = false;
          }
        }
      };
      window.localizePage();
    }
  }

  function loadProfile() {
    try {
      const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
      if (!saved || typeof saved !== "object") return emptyProfile();
      return {
        serverId: typeof saved.serverId === "string" ? saved.serverId : "",
        authority: clampAuthority(saved.authority),
        heists: {
          bank: saved.heists?.bank === true,
          police: saved.heists?.police === true,
          gallery: saved.heists?.gallery === true,
        },
      };
    } catch {
      return emptyProfile();
    }
  }

  function saveProfile() {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      /* private mode */
    }
  }

  function clampAuthority(value) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0) return 0;
    return Math.min(MAX_AUTHORITY, n);
  }

  function injectProfileScreen() {
    if (document.getElementById("profileScreen")) return;
    const screen = document.createElement("main");
    screen.id = "profileScreen";
    screen.hidden = true;
    screen.setAttribute("aria-labelledby", "profileTitle");
    screen.setAttribute("data-no-translate", "");
    screen.innerHTML = `
      <div class="profile-shell">
        <div class="profile-top">
          <img class="brand-logo" src="/rob-run-boost/vendor/images/logos/rebranded/logo.svg" alt="Skycoach">
          <div class="language-switch compact-language" role="group" aria-label="Interface language">
            <button type="button" data-language="ru" lang="ru">RU</button>
            <button type="button" data-language="en" lang="en">EN</button>
          </div>
        </div>
        <div class="profile-kicker" id="profileKicker"></div>
        <h1 id="profileTitle" tabindex="-1"></h1>

        <div class="profile-card">
          <label class="field-label" id="serverFieldLabel" for="serverSearch"></label>
          <p class="hint" id="serverFieldHint"></p>
          <input class="profile-input" id="serverSearch" list="serverList" autocomplete="off">
          <datalist id="serverList"></datalist>
          <p class="hint" id="serverMeta"></p>
        </div>

        <div class="profile-card">
          <label class="field-label" id="authFieldLabel" for="authorityInput"></label>
          <p class="hint" id="authFieldHint"></p>
          <div class="profile-input-wrap">
            <span>#</span>
            <input id="authorityInput" inputmode="numeric" autocomplete="off" placeholder="0">
          </div>
          <p class="field-error" id="authorityError" hidden></p>
        </div>

        <div id="heistFields"></div>

        <div class="profile-actions">
          <button type="button" class="step-back" id="profileBack"></button>
          <button type="button" class="primary" id="profileNext"></button>
        </div>
      </div>
    `;
    document.getElementById("startScreen").after(screen);

    renderProfileHeistInputs();
    syncProfileFields();
    document.getElementById("serverSearch").addEventListener("input", onServerInput);
    document.getElementById("serverSearch").addEventListener("change", onServerInput);
    document.getElementById("authorityInput").addEventListener("input", onAuthorityInput);
    document.getElementById("heistFields").addEventListener("change", (event) => {
      const box = event.target.closest("[data-heist]");
      if (!box) return;
      profile.heists[box.dataset.heist] = box.checked;
      saveProfile();
    });
    document.getElementById("profileBack").onclick = () => showScreen("start");
    document.getElementById("profileNext").onclick = () => {
      if (!validateAuthority()) {
        document.getElementById("authorityInput").focus();
        return;
      }
      saveProfile();
      showScreen("studies");
    };
  }

  function renderProfileHeistInputs() {
    const heistRoot = document.getElementById("heistFields");
    if (!heistRoot) return;
    const lang = getLang();
    heistRoot.innerHTML = HEISTS.map((heist) => {
      const text = heist[lang];
      const checked = profile.heists[heist.id] ? " checked" : "";
      return `
        <label class="lenny-bonus heist-check" for="heist-${heist.id}">
          <input id="heist-${heist.id}" type="checkbox" data-heist="${heist.id}"${checked}>
          <span class="lenny-copy">
            <span class="lenny-question">${text.question}</span>
            <span class="lenny-description">${text.description}</span>
          </span>
          <span class="heist-badge">${text.badge}</span>
        </label>
      `;
    }).join("");
  }

  function syncProfileFields() {
    const search = document.getElementById("serverSearch");
    const authority = document.getElementById("authorityInput");
    if (!search) return;
    const selected = servers.find((row) => row.id === profile.serverId);
    search.value = selected ? selected.label : profile.serverId;
    authority.value = profile.authority ? String(profile.authority) : "";
    for (const heist of HEISTS) {
      const box = document.getElementById(`heist-${heist.id}`);
      if (box) box.checked = Boolean(profile.heists[heist.id]);
    }
    renderServerMeta();
  }

  function onServerInput(event) {
    const value = event.target.value.trim();
    const match = servers.find(
      (row) => row.label === value || row.id === value || row.label.toLowerCase() === value.toLowerCase(),
    );
    profile.serverId = match ? match.id : value;
    saveProfile();
    renderServerMeta();
  }

  function onAuthorityInput(event) {
    validateAuthority(event.target.value);
  }

  function validateAuthority(raw = document.getElementById("authorityInput").value) {
    const error = document.getElementById("authorityError");
    const copy = UI_COPY[getLang()].profile;
    const text = String(raw).trim().replace(/\s/g, "");
    if (!text) {
      profile.authority = 0;
      error.hidden = true;
      saveProfile();
      return true;
    }
    if (!/^\d+$/.test(text)) {
      error.hidden = false;
      error.textContent = copy.authErrInt;
      return false;
    }
    const n = Number(text);
    if (n > MAX_AUTHORITY) {
      error.hidden = false;
      error.textContent = copy.authErrMax;
      return false;
    }
    profile.authority = n;
    error.hidden = true;
    saveProfile();
    return true;
  }

  function injectSidebarCounts() {
    const range = document.querySelector("#calculatorApp .sentence-range");
    if (!range || document.getElementById("studyCountTotal")) return;
    range.insertAdjacentHTML(
      "afterend",
      `
      <div class="plan-line counts" data-no-translate=""><span id="studyCountLabel">Изучений</span><b id="studyCountTotal">0</b></div>
      <div class="plan-line counts" data-no-translate=""><span id="propertyCountLabel">Имуществ</span><b id="propertyCountTotal">0</b></div>
    `,
    );
  }

  function restyleLandingSteps() {
    const hero = document.querySelector("#startScreen .story-hero");
    if (hero && !document.getElementById("landingOverview")) {
      const overview = document.createElement("section");
      overview.className = "landing-overview";
      overview.id = "landingOverview";
      overview.setAttribute("data-no-translate", "");
      hero.after(overview);
    }

    const maint = document.querySelector("#startScreen .maintenance-links");
    if (maint && !document.getElementById("hubBackLink")) {
      const back = document.createElement("a");
      back.className = "hub-back-link";
      back.id = "hubBackLink";
      back.href = "/rob-run-boost/";
      back.setAttribute("data-no-translate", "");
      maint.append(back);
    }

    const stepSelectors = [
      "#studyScreen .step-label",
      "#propertyScreen .step-label",
      "#moneyScreen .step-label",
    ];
    for (const selector of stepSelectors) {
      const node = document.querySelector(selector);
      if (node) node.setAttribute("data-no-translate", "");
    }

    document.addEventListener("click", (event) => {
      if (event.target.classList?.contains("language-switch")) {
        const inactive = event.target.querySelector('[data-language][aria-pressed="false"]');
        if (inactive) inactive.click();
        return;
      }
      const scrollTrigger = event.target.closest("[data-scroll-offers]");
      if (scrollTrigger) {
        event.preventDefault();
        const targetId = scrollTrigger.getAttribute("data-scroll-offers");
        document.getElementById("offersSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
        if (targetId) {
          const card = document.querySelector(`#resultOffers [data-offer-id="${targetId}"]`);
          if (card) {
            card.classList.remove("is-spotlight");
            void card.offsetWidth;
            card.classList.add("is-spotlight");
            setTimeout(() => card.classList.remove("is-spotlight"), 1700);
          }
        }
      }
    });
  }

  function syncAllCopy() {
    const lang = getLang();
    const copy = UI_COPY[lang];

    document.querySelectorAll(".language-switch").forEach((sw) => {
      sw.setAttribute("data-no-translate", "");
      sw.setAttribute("aria-label", copy.langAria);
      sw.querySelectorAll("[data-language]").forEach((btn) => {
        btn.setAttribute("aria-pressed", String(btn.dataset.language === lang));
      });
    });

    const stepSelectors = [
      "#studyScreen .step-label",
      "#propertyScreen .step-label",
      "#moneyScreen .step-label",
    ];
    stepSelectors.forEach((selector, idx) => {
      const node = document.querySelector(selector);
      if (node) node.textContent = copy.stepLabels[idx];
    });

    const gateTitle = document.getElementById("mobile-gate-title");
    const gateBody = document.getElementById("mobile-gate-body") || document.querySelector(".mobile-gate__card p");
    if (gateTitle) gateTitle.textContent = copy.mobileGateTitle;
    if (gateBody) gateBody.textContent = copy.mobileGateBody;

    document.querySelectorAll(".start-steps").forEach((node) => {
      node.setAttribute("data-no-translate", "");
      node.setAttribute("aria-label", copy.stepsAria);
      node.innerHTML = copy.steps
        .map((label, idx) => `<span><b>0${idx + 1}</b> ${label}</span>`)
        .join('<i aria-hidden="true">→</i>');
    });

    const equation = document.querySelector("#startScreen .poster-equation");
    if (equation) {
      equation.setAttribute("data-no-translate", "");
      equation.innerHTML = `<span>${copy.equationLeft}</span><span aria-hidden="true">=</span><strong>${copy.equationRight}</strong>`;
    }

    const overview = document.getElementById("landingOverview");
    if (overview) {
      overview.innerHTML = `
        <div class="landing-overview__head">
          <span class="eyebrow">${copy.eyebrow}</span>
          <span class="landing-overview__meta">${copy.meta}</span>
        </div>
        <div class="landing-cards">
          ${copy.cards
            .map(
              (card) => `
            <article class="landing-card">
              <div class="landing-card__top">
                <span class="landing-card__step">${card.step}</span>
                <span class="landing-card__badge">${card.badge}</span>
              </div>
              <h2>${card.title}</h2>
              <p>${card.body}</p>
            </article>
          `,
            )
            .join("")}
        </div>
        <div class="landing-summary">
          <div class="landing-summary__cap">
            <span class="landing-summary__kicker">${copy.capKicker}</span>
            <div class="landing-summary__value">
              <strong>${copy.capAmount}</strong>
              <span>${copy.capSuffix}</span>
            </div>
            <div class="landing-summary__bars" aria-hidden="true">
              <i></i><i></i><i></i><i></i><i></i><i></i><i></i>
            </div>
          </div>
          <div class="landing-summary__copy">
            <strong>${copy.summaryTitle}</strong>
            <p>${copy.summaryBody}</p>
          </div>
        </div>
      `;
    }

    const back = document.getElementById("hubBackLink");
    if (back) back.textContent = copy.hubBack;

    const propertyFooter = document.querySelector("#propertyScreen .step-footer > div:first-child");
    if (propertyFooter) {
      propertyFooter.setAttribute("data-no-translate", "");
      propertyFooter.innerHTML = `<strong>${copy.propertyFooterTitle}</strong><span>${copy.propertyFooterSub}</span>`;
    }

    const moneyFooter = document.querySelector("#moneyScreen .step-footer > div:first-child");
    if (moneyFooter) {
      moneyFooter.setAttribute("data-no-translate", "");
      moneyFooter.innerHTML = `<strong>${copy.moneyFooterTitle}</strong><span>${copy.moneyFooterSub}</span>`;
    }

    const inventoryHint = document.getElementById("inventoryHint");
    if (inventoryHint) {
      inventoryHint.setAttribute("data-no-translate", "");
      inventoryHint.textContent = copy.inventoryHint;
    }

    const studyCountLabel = document.getElementById("studyCountLabel");
    const propertyCountLabel = document.getElementById("propertyCountLabel");
    if (studyCountLabel) studyCountLabel.textContent = copy.sidebar.studies;
    if (propertyCountLabel) propertyCountLabel.textContent = copy.sidebar.properties;

    // Profile screen copy
    const p = copy.profile;
    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setTxt("profileKicker", p.kicker);
    setTxt("profileTitle", p.title);
    setTxt("serverFieldLabel", p.serverLabel);
    setTxt("serverFieldHint", p.serverHint);
    setTxt("authFieldLabel", p.authLabel);
    setTxt("authFieldHint", p.authHint);
    setTxt("profileBack", p.back);
    setTxt("profileNext", p.next);
    const serverSearch = document.getElementById("serverSearch");
    if (serverSearch) serverSearch.placeholder = p.serverPlaceholder;
    const authErr = document.getElementById("authorityError");
    if (authErr && !authErr.hidden) {
      validateAuthority();
    }
    renderProfileHeistInputs();

    // Result screen copy
    const r = copy.result;
    setTxt("dossierHubLink", r.hubLink);
    setTxt("resultBack", r.back);
    setTxt("resultRestart", r.restart);
    setTxt("stageBadgeText", r.stageBadge);
    setTxt("realmMutedLabel", r.realmMuted);
    setTxt("hudWipeTermLabel", r.wipeTermLabel);
    setTxt("hudAuthorityLabel", r.authorityLabel);
    setTxt("hudAuthorityBtn", r.authorityBtn);
    setTxt("hudValuationLabel", r.valuationLabel);
    setTxt("hudValuationBtn", r.valuationBtn);
    setTxt("hudCountsLabel", r.countsLabel);
    setTxt("hudCountsBtn", r.countsBtn);
    setTxt("hudTimerLabel", r.timerLabel);
    setTxt("hudTimerSub", r.timerSub);
    setTxt("hudResearchLabel", r.researchLabel);
    setTxt("hudResearchBtn", r.researchBtn);
    setTxt("hudPropertyLabel", r.propertyLabel);
    setTxt("hudPropertyBtn", r.propertyBtn);
    setTxt("hudCashLabel", r.cashLabel);
    setTxt("hudCashBtn", r.cashBtn);
    setTxt("buyToCap", r.buyToCap);
    setTxt("heistsHeading", r.heistsTitle);
    setTxt("heistsSub", r.heistsSub);
    setTxt("offersHeading", r.offersTitle);
    setTxt("offersSub", r.offersSub);
    setTxt("guidesHeading", r.guidesTitle);

    const isEn = lang === "en";
    setTxt("resultTitle", isEn ? "Your sentence" : "Твой срок");
    const dossierStage = document.getElementById("dossierStage");
    if (dossierStage) {
      dossierStage.setAttribute("aria-label", isEn ? "Character Dossier" : "Досье персонажа");
    }

    renderGuidesGrid();
    if (window.__planner) {
      const current = window.__planner.state;
      renderOffersGrid(totals(current), current.owned.size);
    } else {
      renderOffersGrid(null, 0);
    }
    renderServerMeta();
    tickWipe();
  }

  function restyleResultScreen() {
    const screen = document.getElementById("resultScreen");
    if (!screen || screen.dataset.dossier === "1") return;
    screen.dataset.dossier = "1";
    screen.classList.add("dossier-screen");
    screen.setAttribute("data-no-translate", "");
    screen.innerHTML = `
      <header class="dossier-bar">
        <div class="dossier-bar__left">
          <div id="resultLogo" class="result-logo"></div>
          <a class="dossier-bar__hub" id="dossierHubLink" href="/rob-run-boost/">← Хаб ROB RUN</a>
        </div>
        <div class="dossier-bar__right">
          <button type="button" class="dossier-nav-btn" id="resultBack">← Назад</button>
          <button type="button" class="dossier-nav-btn" id="resultRestart">Новый расчёт</button>
          <div class="language-switch result-language" role="group" aria-label="Interface language">
            <button type="button" data-language="ru" lang="ru">RU</button>
            <button type="button" data-language="en" lang="en">EN</button>
          </div>
        </div>
      </header>

      <div class="dossier-body">
        <h1 id="resultTitle" tabindex="-1" class="hidden-original">Твой срок</h1>
        <div class="result-breakdown hidden-original">
          <div><span id="resultLandTierLabel">Земля</span><b id="resultLandTier">$0</b></div>
          <div><span id="resultSettlementTierLabel">Поселение</span><b id="resultSettlementTier">$0</b></div>
          <div><span>В контейнерах · 100%</span><b id="resultInventory">$0</b></div>
          <div><span>Предохранители · 40%</span><b id="resultFuses">$0</b></div>
          <div><span>Кусты · 100%</span><b id="resultPlants">$0</b></div>
        </div>

        <section class="dossier-stage" id="dossierStage" aria-label="Досье персонажа">
          <img class="dossier-stage__bg" src="${HERO_ART}" alt="">
          <div class="dossier-stage__veil" aria-hidden="true"></div>

          <div class="dossier-stage__top">
            <div class="stage-pill">
              <i class="stage-dot" aria-hidden="true"></i>
              <span id="stageBadgeText">Досье персонажа · ROB RUN</span>
            </div>
            <div class="stage-pill stage-pill--server">
              <span class="stage-pill__muted" id="realmMutedLabel">Реалм:</span>
              <strong id="wipeServerLabel">сервер не выбран</strong>
            </div>
          </div>

          <div class="dossier-stage__grid">
            <div class="dossier-wing dossier-wing--left">
              <div class="hud-card hud-card--primary">
                <span class="hud-card__label" id="hudWipeTermLabel">Срок этого вайпа</span>
                <div class="hud-card__hero-val">
                  <strong id="resultYears">0</strong>
                  <span id="resultUnit">лет</span>
                </div>
                <div class="hud-track"><i id="resultFill"></i></div>
                <small class="hud-card__sub" id="resultNote">До следующего года - $500 000</small>
                <small class="hud-card__bonus" id="resultBonus" hidden></small>
              </div>

              <div class="hud-card hud-card--row">
                <div>
                  <span class="hud-card__label" id="hudAuthorityLabel">Авторитет сейчас / после</span>
                  <b id="resultAuthority">#0 → #0</b>
                </div>
                <a class="hud-pill-btn" id="hudAuthorityBtn" href="#offersSection" data-scroll-offers="royal">Добавить</a>
              </div>

              <div class="hud-card hud-card--row">
                <div>
                  <span class="hud-card__label" id="hudValuationLabel">Общая оценка аккаунта</span>
                  <b id="resultValuation">$0</b>
                </div>
                <a class="hud-pill-btn" id="hudValuationBtn" href="#offersSection" data-scroll-offers="cash">Добавить</a>
              </div>

              <div class="hud-card hud-card--row">
                <div>
                  <span class="hud-card__label" id="hudCountsLabel">Изучений / имуществ</span>
                  <b id="resultCounts">0 / 0</b>
                </div>
                <a class="hud-pill-btn" id="hudCountsBtn" href="#offersSection" data-scroll-offers="items">Добавить</a>
              </div>
            </div>

            <div class="dossier-figure" aria-hidden="true">
              <div class="dossier-figure__glow"></div>
            </div>

            <div class="dossier-wing dossier-wing--right">
              <div class="hud-card hud-card--timer">
                <div class="hud-card__timer-head">
                  <i class="stage-dot stage-dot--violet" aria-hidden="true"></i>
                  <span class="hud-card__label" id="hudTimerLabel">Жизнь сервера до вайпа</span>
                </div>
                <strong class="hud-card__timer-val" id="wipeCountdown">7д 00:00:00</strong>
                <small class="hud-card__sub" id="hudTimerSub">Цикл реалма: 7 дней</small>
              </div>

              <div class="hud-card hud-card--row">
                <div>
                  <span class="hud-card__label" id="hudResearchLabel">Изучения · 100%</span>
                  <b id="resultResearch">$0</b>
                </div>
                <a class="hud-pill-btn hud-pill-btn--green" id="hudResearchBtn" href="#offersSection" data-scroll-offers="items">Добавить</a>
              </div>

              <div class="hud-card hud-card--row">
                <div>
                  <span class="hud-card__label" id="hudPropertyLabel">Имущество и база · 40%</span>
                  <b id="resultProperty">$0</b>
                </div>
                <a class="hud-pill-btn" id="hudPropertyBtn" href="#offersSection" data-scroll-offers="royal">Добавить</a>
              </div>

              <div class="hud-card hud-card--row">
                <div>
                  <span class="hud-card__label" id="hudCashLabel">Отмытые деньги · 100%</span>
                  <b id="resultCash">$0</b>
                </div>
                <a class="hud-pill-btn hud-pill-btn--green" id="hudCashBtn" href="#offersSection" data-scroll-offers="cash">Добавить</a>
              </div>
            </div>
          </div>
        </section>

        <section class="gap-card maximum-card" id="gapCard">
          <div class="gap-card__info">
            <span class="gap-card__kicker" id="resultGoalLabel">До максимума · 40 лет</span>
            <div class="gap-card__numbers">
              <strong id="resultGoalAmount">$20 000 000</strong>
              <p id="resultGoalHint">Столько оценки осталось набрать.</p>
            </div>
          </div>
          <a class="sc-btn sc-btn--violet" id="buyToCap" href="#offersSection" data-scroll-offers="cash">Докупить до 40 лет</a>
        </section>

        <section class="dossier-section">
          <div class="sc-section-head">
            <h2 id="heistsHeading">Крупные ограбления и достижения</h2>
            <span class="sc-section-sub" id="heistsSub">Отметки по твоему персонажу</span>
          </div>
          <div class="heist-showcase" id="resultAchievements"></div>
        </section>

        <section class="dossier-section" id="offersSection">
          <div class="sc-section-head">
            <h2 id="offersHeading">Услуги Skycoach для ROB RUN</h2>
            <span class="sc-section-sub" id="offersSub">Первая карточка - персональная рекомендация по твоим ответам</span>
          </div>
          <div class="sc-offers-grid" id="resultOffers"></div>
        </section>

        <section class="dossier-section">
          <div class="sc-section-head">
            <h2 id="guidesHeading">Популярные гайды</h2>
          </div>
          <div class="sc-guides-grid" id="resultGuides"></div>
        </section>
      </div>
    `;

    const logos = document.querySelectorAll(".brand-logo");
    const resultLogo = document.getElementById("resultLogo");
    if (logos[0] && resultLogo && !resultLogo.querySelector("img")) {
      resultLogo.append(logos[0].cloneNode(true));
    }
  }

  function renderGuidesGrid() {
    const root = document.getElementById("resultGuides");
    if (!root) return;
    const lang = getLang();
    const copy = UI_COPY[lang].result;
    root.innerHTML =
      GUIDES.map((guide) => {
        const g = guide[lang];
        return `
        <a class="sc-blog-card" href="${guide.href}" target="_blank" rel="noopener noreferrer">
          <div class="sc-blog-card__image">
            <img src="${guide.cover}" srcset="${guide.cover} 1x, ${guide.cover2x} 2x" alt="${escapeAttr(g.title)}" loading="lazy">
          </div>
          <div class="sc-blog-card__wrapper">
            <div class="sc-blog-card__main">
              <img class="sc-blog-card__logo" src="${GAME_ICON}" alt="">
              <span class="sc-blog-card__label">${g.label}</span>
            </div>
            <h3 class="sc-blog-card__title">${g.title}</h3>
            <p class="sc-blog-card__descr">${g.descr}</p>
          </div>
        </a>
      `;
      }).join("") +
      `
        <a class="sc-view-more" href="https://skycoach.gg/blog/rob-run" target="_blank" rel="noopener noreferrer">
          <div class="sc-view-more__wrapper">
            <div class="sc-view-more__descr">
              <p>${copy.viewMoreTop}</p>
              <h3>${copy.viewMoreTitle}</h3>
            </div>
            <span class="sc-view-more__btn" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </span>
          </div>
        </a>
      `;
  }

  function offerCard(offer) {
    const recClass = offer.recommended ? " sc-card--recommended" : "";
    const offerAttr = offer.id ? ` data-offer-id="${offer.id}"` : "";
    return `
      <a class="sc-card${recClass}"${offerAttr} href="${offer.href}" target="_blank" rel="noopener noreferrer">
        <div class="sc-card__content">
          <div class="sc-card__header">
            ${
              offer.recommended
                ? `<span class="sc-card__rec-badge"><i aria-hidden="true">★</i> ${offer.recBadge}</span>`
                : ""
            }
            <img class="sc-card__image" src="${offer.icon}" alt="" loading="lazy">
            <img class="sc-card__image-bg" src="${offer.art}" alt="" loading="lazy">
          </div>
          <div class="sc-card__body">
            ${offer.subLabel ? `<span class="sc-card__sublabel">${offer.subLabel}</span>` : ""}
            <h3 class="sc-card__title">${offer.title}</h3>
            <ul class="sc-card__advantages">
              ${offer.points
                .map(
                  (point) => `
                <li>
                  <span class="sc-card__marker" aria-hidden="true"></span>
                  <span class="sc-card__adv-text">${point}</span>
                </li>
              `,
                )
                .join("")}
            </ul>
            <div class="sc-card__footer">
              <div class="sc-card__price">${offer.priceHtml}</div>
              <span class="sc-btn sc-btn--violet sc-card__btn">${offer.cta}</span>
            </div>
          </div>
        </div>
      </a>
    `;
  }

  function renderOffersGrid(
    sum = window.__planner ? totals(window.__planner.state) : null,
    studies = window.__planner ? window.__planner.state.owned.size : 0,
  ) {
    const root = document.getElementById("resultOffers");
    if (!root) return;
    const lang = getLang();
    const recCard = buildRecommendedOffer(sum, studies, lang);
    const catalog = ["cash", "items", "royal", "crew"].map((key) => {
      const base = OFFERS[key];
      const t = base[lang];
      return {
        id: base.id,
        href: base.href,
        priceHtml: base.priceHtml,
        art: base.art,
        icon: base.icon,
        title: t.title,
        cta: t.cta,
        points: t.points,
      };
    });
    root.innerHTML = [recCard, ...catalog].map((item) => offerCard(item)).join("");
  }

  function buildRecommendedOffer(sum, studies, lang = getLang()) {
    const missingHeists = HEISTS.filter((heist) => !profile.heists[heist.id]).length;
    const years = sum ? sum.years : 0;
    const remaining = sum ? sum.remainingToMax : 20000000;
    const copy = UI_COPY[lang].result;

    let base = OFFERS.items;
    let recTitle = lang === "en" ? "Top Wipe Loadout" : "Топ-сборка на вайп";
    let points =
      lang === "en"
        ? ["40-year base cap reached", "Best weapons & fast vehicles", "Quick in-game trade delivery"]
        : ["Базовый кап 40 лет закрыт", "Топовые стволы и транспорт", "Передача трейдом в игре"];

    if (years < 12 && remaining > 0) {
      base = OFFERS.royal;
      recTitle = lang === "en" ? "Fast Wipe Start" : "Быстрый старт вайпа";
      points =
        lang === "en"
          ? [`For your term: ${years} of 40 years`, "Cash, guns & armor on day 1", "Royal E included in pack"]
          : [`Под твой срок: ${years} из 40 лет`, "Кэш, пушки и броня на старт", "Royal E уже входит в набор"];
    } else if (missingHeists >= 2) {
      base = OFFERS.crew;
      recTitle = lang === "en" ? "Heist Raid Crew" : "Рейд по ограблениям";
      points =
        lang === "en"
          ? [`Open heists left: ${missingHeists} of 3`, "Bank vault, armory & gallery", "No farming Drill or keycards"]
          : [`Не закрыто ограблений: ${missingHeists} из 3`, "Банк, арсенал участка и галерея", "Без фарма Бура и ключей с нуля"];
    } else if (studies < 25) {
      base = OFFERS.items;
      recTitle = lang === "en" ? "Gear & Vehicle Pack" : "Подбор снаряжения";
      points =
        lang === "en"
          ? [`Unlocked research: ${studies} of 172`, "Legendary gear & fast cars", "Quick in-game delivery"]
          : [`Открыто изучений: ${studies} из 172`, "Легендарки и быстрый транспорт", "Быстрая передача в игре"];
    } else if (remaining > 0) {
      base = OFFERS.cash;
      recTitle = lang === "en" ? "Cap Top-Up Cash" : "Добор срока кэшем";
      points =
        lang === "en"
          ? [`To 40 years: ${money(remaining)}`, "Counts 100% toward your term", "Fast delivery of any amount"]
          : [`До 40 лет: ${money(remaining)}`, "100% суммы идёт в оценку срока", "Быстрая доставка нужного объёма"];
    }

    return {
      id: "recommended",
      href: base.href,
      priceHtml: base.priceHtml,
      art: base.art,
      icon: base.icon,
      title: recTitle,
      cta: base[lang].cta,
      recommended: true,
      recBadge: copy.recBadge,
      subLabel: copy.recSub,
      points,
    };
  }

  function wireFlow() {
    let inFullRefresh = false;

    const localizeIfEnglish = () => {
      if (getLang() === "en" && typeof window.localizePage === "function") {
        window.localizePage();
      }
    };

    const originalShow = window.showScreen;
    window.showScreen = function patchedShow(next) {
      const profileEl = document.getElementById("profileScreen");
      if (next === "profile") {
        document.getElementById("startScreen").hidden = true;
        document.getElementById("calculatorApp").hidden = true;
        document.getElementById("resultScreen").hidden = true;
        profileEl.hidden = false;
        syncProfileFields();
        document.getElementById("profileTitle").focus({ preventScroll: true });
        window.scrollTo(0, 0);
        stopWipeClock();
        return;
      }
      if (profileEl) profileEl.hidden = true;
      originalShow(next);
      if (next === "result") {
        paintResultExtras();
        startWipeClock();
      } else {
        stopWipeClock();
        localizeIfEnglish();
      }
    };

    const originalRefreshTotals = window.refreshTotals;
    window.refreshTotals = function patchedRefreshTotals() {
      originalRefreshTotals();
      const planner = window.__planner;
      if (!planner) return;
      const current = planner.state;
      const sum = totals(current);
      const studies = current.owned.size;
      const properties = propertyItems(current).length;
      const studyNode = document.getElementById("studyCountTotal");
      const propertyNode = document.getElementById("propertyCountTotal");
      if (studyNode) studyNode.textContent = `${studies} / ${planner.DATA.items.length}`;
      if (propertyNode) propertyNode.textContent = String(properties);
      paintResultExtras(sum, studies, properties);
      if (!inFullRefresh) localizeIfEnglish();
    };

    if (typeof window.refresh === "function") {
      const originalRefreshAll = window.refresh;
      window.refresh = function patchedRefreshAll() {
        inFullRefresh = true;
        try {
          originalRefreshAll();
        } finally {
          inFullRefresh = false;
        }
        localizeIfEnglish();
      };
    }

    for (const fnName of [
      "openSlotPicker",
      "openUpgradeDialog",
      "openTerritoryPicker",
      "openPlantationDialog",
    ]) {
      if (typeof window[fnName] === "function") {
        const orig = window[fnName];
        window[fnName] = function wrappedDialogOpener(...args) {
          const res = orig.apply(this, args);
          localizeIfEnglish();
          return res;
        };
      }
    }

    const originalReset = window.resetCalculation;
    window.resetCalculation = function patchedReset() {
      profile = emptyProfile();
      saveProfile();
      syncProfileFields();
      originalReset();
      localizeIfEnglish();
    };

    document.getElementById("startButton").onclick = () => showScreen("profile");
    document.getElementById("studiesBack").onclick = () => showScreen("profile");
    document.getElementById("resultBack").onclick = () => showScreen("money");
    document.getElementById("resultRestart").onclick = resetCalculation;
    window.refreshTotals();
  }

  function ruYearWord(years) {
    if (typeof window.yearWord === "function") return window.yearWord(years);
    const mod10 = years % 10;
    const mod100 = years % 100;
    if (mod10 === 1 && mod100 !== 11) return "год";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "года";
    return "лет";
  }

  function localizeResultDynamic(sum, lang) {
    const unitNode = document.getElementById("resultUnit");
    const noteNode = document.getElementById("resultNote");
    const bonusNode = document.getElementById("resultBonus");
    const goalLabel = document.getElementById("resultGoalLabel");
    const goalAmount = document.getElementById("resultGoalAmount");
    const goalHint = document.getElementById("resultGoalHint");

    if (bonusNode) bonusNode.hidden = !sum.bonusYears;

    if (lang === "en") {
      if (unitNode) unitNode.textContent = sum.years === 1 ? "year" : "years";
      if (noteNode) {
        noteNode.textContent =
          sum.baseYears < 40
            ? `Next year in ${money(sum.remaining)}`
            : `Maximum reached: ${sum.maxYears} years${sum.bonusYears ? " with Lenny's bonus" : " per realm"}`;
      }
      if (bonusNode) {
        bonusNode.textContent = sum.bonusYears
          ? `${sum.baseYears} ${sum.baseYears === 1 ? "year" : "years"} from value + 10 years for Lenny's quest`
          : "";
      }
      if (goalLabel) goalLabel.textContent = `To maximum · ${sum.maxYears} years`;
      if (goalAmount) goalAmount.textContent = sum.remainingToMax ? money(sum.remainingToMax) : "Maximum reached";
      if (goalHint) {
        goalHint.textContent = sum.remainingToMax
          ? sum.bonusYears
            ? "Remaining value needed. Lenny's one-time bonus is already included."
            : "Remaining value needed to hit the cap. Lenny's bonus is counted separately."
          : sum.bonusYears
            ? "40 years from value + 10 years for Lenny's quest."
            : "40 years from value. Lenny's one-time quest can add 10 more years.";
      }
    } else {
      if (unitNode) unitNode.textContent = ruYearWord(sum.years);
      if (noteNode) {
        noteNode.textContent =
          sum.baseYears < 40
            ? `До следующего года - ${money(sum.remaining)}`
            : `Достигнут максимум: ${sum.maxYears} лет${sum.bonusYears ? " с бонусом Ленни" : " за один реалм"}`;
      }
      if (bonusNode) {
        bonusNode.textContent = sum.bonusYears
          ? `${sum.baseYears} ${ruYearWord(sum.baseYears)} по оценке + 10 лет за квест Ленни · разовый бонус`
          : "";
      }
      if (goalLabel) goalLabel.textContent = `До максимума · ${sum.maxYears} лет`;
      if (goalAmount) goalAmount.textContent = sum.remainingToMax ? money(sum.remainingToMax) : "Максимум набран";
      if (goalHint) {
        goalHint.textContent = sum.remainingToMax
          ? sum.bonusYears
            ? "Осталось добрать оценку. Разовый бонус Ленни уже учтён."
            : "Столько оценки осталось набрать. Бонус Ленни считается отдельно."
          : sum.bonusYears
            ? "40 лет по оценке + 10 лет за квест Ленни."
            : "40 лет по оценке. Разовый бонус Ленни может добавить ещё 10 лет.";
      }
    }
  }

  function paintResultExtras(
    sum = totals(window.__planner.state),
    studies = window.__planner.state.owned.size,
    properties = propertyItems(window.__planner.state).length,
  ) {
    const lang = getLang();
    const copy = UI_COPY[lang].result;
    const after = Math.min(MAX_AUTHORITY, profile.authority + sum.years);
    const authorityNode = document.getElementById("resultAuthority");
    const countsNode = document.getElementById("resultCounts");
    if (authorityNode) authorityNode.textContent = `#${profile.authority} → #${after}`;
    if (countsNode) countsNode.textContent = `${studies} / ${properties}`;
    localizeResultDynamic(sum, lang);

    const cap = document.getElementById("buyToCap");
    const gap = document.getElementById("gapCard");
    if (cap) {
      cap.hidden = !sum.remainingToMax;
    }
    if (gap) gap.classList.toggle("is-complete", !sum.remainingToMax);

    document.getElementById("resultAchievements").innerHTML = HEISTS.map((heist) => {
      const done = Boolean(profile.heists[heist.id]);
      const h = heist[lang];
      const trophyClass = heist.wideTrophy
        ? "heist-card__trophy heist-card__trophy--wide"
        : "heist-card__trophy";
      return `
        <article class="heist-card${done ? " is-done" : ""}">
          <div class="heist-card__media">
            <img class="heist-card__scene" src="${heist.scene}" alt="" loading="lazy">
            <span class="heist-card__status">
              <i aria-hidden="true"></i>
              ${done ? copy.heistDone : copy.heistTodo}
            </span>
            <img class="${trophyClass}" src="${heist.trophy}" alt="" loading="lazy">
          </div>
          <div class="heist-card__body">
            <span class="heist-card__ach">${heist.achievement}</span>
            <h3>${h.badge}</h3>
            <div class="heist-card__foot">
              <p>${h.spot}</p>
              ${
                done
                  ? ""
                  : `<a href="#offersSection" class="heist-card__scroll-btn" data-scroll-offers="crew">${copy.toOffersBtn}</a>`
              }
            </div>
          </div>
        </article>
      `;
    }).join("");

    renderOffersGrid(sum, studies);
    renderGuidesGrid();
    renderServerMeta();
  }

  async function loadServers() {
    try {
      const payload = await fetch("/api/rob-run/servers").then((res) => res.json());
      const list = Array.isArray(payload.servers) ? payload.servers : [];
      servers = list.filter((row) => row.name && !/reports/i.test(row.name));
    } catch {
      servers = [];
    }
    const datalist = document.getElementById("serverList");
    if (datalist) {
      datalist.innerHTML = servers
        .map((row) => `<option value="${escapeAttr(row.label)}"></option>`)
        .join("");
    }
    syncProfileFields();
  }

  function selectedServer() {
    return servers.find((row) => row.id === profile.serverId || row.label === profile.serverId) || null;
  }

  function formatWipeDate(timestamp, lang) {
    try {
      return cleanCopyText(
        new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "ru-RU", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "UTC",
        }).format(new Date(timestamp)) + " UTC",
      );
    } catch {
      return new Date(timestamp).toUTCString();
    }
  }

  function renderServerMeta() {
    const meta = document.getElementById("serverMeta");
    const label = document.getElementById("wipeServerLabel");
    const lang = getLang();
    const p = UI_COPY[lang].profile;
    const r = UI_COPY[lang].result;
    const server = selectedServer();
    const text = server
      ? `${server.region} · ${p.serverWipePrefix} ${server.wipeAt ? formatWipeDate(server.wipeAt, lang) : p.serverWipeFallback}`
      : p.serverNone;
    if (meta) meta.textContent = text;
    const serverShort = server ? server.label : r.noServerShort;
    if (label) label.textContent = serverShort;
  }

  function wipeDeadline() {
    const server = selectedServer();
    if (server?.wipeAt) return server.wipeAt;
    return Date.now() + WIPE_MS;
  }

  function startWipeClock() {
    stopWipeClock();
    tickWipe();
    wipeTimer = setInterval(tickWipe, 1000);
  }

  function stopWipeClock() {
    clearInterval(wipeTimer);
  }

  function tickWipe() {
    const node = document.getElementById("wipeCountdown");
    if (!node) return;
    const copy = UI_COPY[getLang()].result;
    const left = wipeDeadline() - Date.now();
    const formatted =
      left <= 0
        ? copy.wipePassed
        : (() => {
            const days = Math.floor(left / 86400000);
            const hours = Math.floor((left % 86400000) / 3600000);
            const mins = Math.floor((left % 3600000) / 60000);
            const secs = Math.floor((left % 60000) / 1000);
            const pad = (n) => String(n).padStart(2, "0");
            return `${days}${copy.dayShort} ${pad(hours)}:${pad(mins)}:${pad(secs)}`;
          })();
    node.textContent = formatted;
  }

  function escapeAttr(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);
  }
})();
