const SAMPLE_URL = "https://steamcommunity.com/id/ChetFaliszek/";
const ROB_RUN_XML = "https://steamcommunity.com/id/ChetFaliszek/?xml=1";

const state = { profile: null, steam: null };

const $ = (id) => document.getElementById(id);

$("lookup-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  await lookup($("steam-url").value);
});

$("probe-sample").addEventListener("click", () => {
  $("steam-url").value = SAMPLE_URL;
  lookup(SAMPLE_URL);
});

$("probe-direct").addEventListener("click", probeCors);

$("hero-form").addEventListener("submit", (event) => {
  event.preventDefault();
  renderOffers(readHero(event.target));
});

loadLive();

async function loadLive() {
  try {
    const data = await json("/api/rob-run/live");
    $("live").textContent = data.ok
      ? `ROB RUN online сейчас: ${Number(data.playerCount).toLocaleString("ru-RU")} (Steam, без ключа)`
      : `Онлайн ROB RUN не прочитался: ${data.error}`;
  } catch (error) {
    $("live").textContent = `Онлайн ROB RUN: ${error.message}`;
  }
}

async function lookup(url) {
  const btn = $("lookup-btn");
  btn.disabled = true;
  btn.textContent = "Тянем…";
  try {
    const data = await json("/api/lookup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    });
    state.steam = data;
    if (!data.ok) {
      renderProfileError(data.error);
      log(`Прокси: ошибка. ${data.error} (${data.ms ?? "?"} ms)`);
      return;
    }
    state.profile = data.profile;
    renderProfile(data);
    log(
      [
        `Прокси localhost → Steam Community XML: OK (${data.ms} ms)`,
        `Источник: ${data.steamUrl}`,
        `privacy=${data.profile.privacyState || "?"}  steamid=${data.profile.steamId64}`,
        data.robRun.currentlyPlaying
          ? "Сейчас в ROB RUN (inGameInfo из XML)"
          : "Сейчас не видно, что играет в ROB RUN",
        data.robRun.ownedNeedsKey
          ? "GetOwnedGames пропущен: нет STEAM_API_KEY (это нормально для этого теста)"
          : data.robRun.owned?.robRun
            ? "ROB RUN есть в библиотеке (GetOwnedGames)"
            : `Библиотека: ${data.robRun.ownedError || "ROB RUN не виден (privacy Game Details)"}`,
      ].join("\n"),
    );
  } catch (error) {
    renderProfileError(error.message);
    log(`Прокси сломался: ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = "Тянуть";
  }
}

async function probeCors() {
  const started = Date.now();
  try {
    const response = await fetch(ROB_RUN_XML, { mode: "cors" });
    log(
      `Прямой fetch из браузера: HTTP ${response.status} за ${Date.now() - started} ms.\nЭто неожиданно: обычно Steam не шлёт Access-Control-Allow-Origin.`,
    );
  } catch (error) {
    log(
      `Прямой fetch из браузера заблокирован (${Date.now() - started} ms).\n${error.message}\nЭто CORS: страница с localhost не может читать steamcommunity.com.\nПоэтому профиль тянет сервер, а не браузер.`,
    );
  }
}

function renderProfile(data) {
  $("profile-empty").hidden = true;
  const view = $("profile-view");
  view.hidden = false;
  const p = data.profile;
  const badges = [
    badge(p.privacyState || "privacy ?", p.privacyState === "public" ? "ok" : "warn"),
    badge(p.onlineState || "offline"),
    p.vacBanned ? badge("VAC ban", "warn") : badge("VAC clean", "ok"),
    p.isLimitedAccount ? badge("limited account", "warn") : null,
    data.robRun.currentlyPlaying ? badge("in ROB RUN now", "ok") : badge("not in ROB RUN now"),
  ]
    .filter(Boolean)
    .join("");

  view.innerHTML = `
    <div class="person">
      <img src="${escapeAttr(p.avatarFull || "")}" alt="" />
      <div>
        <strong>${escapeHtml(p.personaName || "без имени")}</strong>
        <div class="muted">${escapeHtml(p.steamId64 || "")}</div>
        <div class="muted">${escapeHtml(p.stateMessage || "")}${p.location ? " · " + escapeHtml(p.location) : ""}</div>
        <div class="badges">${badges}</div>
      </div>
    </div>
  `;
}

function renderProfileError(message) {
  $("profile-empty").hidden = false;
  $("profile-empty").textContent = message;
  $("profile-view").hidden = true;
}

function readHero(form) {
  const data = new FormData(form);
  return {
    uid: String(data.get("uid") || "").trim(),
    server: String(data.get("server") || "").trim(),
    role: data.get("role"),
    cash: data.get("cash"),
    hasBase: data.has("hasBase"),
    hasCar: data.has("hasCar"),
    hasHeli: data.has("hasHeli"),
    hasDecoder: data.has("hasDecoder"),
    hasDrill: data.has("hasDrill"),
  };
}

function renderOffers(hero) {
  const offers = [];
  const steam = state.steam;

  if (steam?.profile?.vacBanned) {
    offers.push({
      title: "Self-play / in-game trade, не piloted",
      why: "На профиле VAC. Не предлагаем заход на аккаунт, только встречу в мире.",
      href: "https://skycoach.gg/rob-run-boost/products/items-13124",
    });
  }

  if (hero.cash === "broke" || hero.cash === "starter") {
    offers.push({
      title: "ROB RUN Cash",
      why: "Мало денег на руках. Cash закрывает оружие, броню и аренду, пока нет своего лута.",
      href: "https://skycoach.gg/rob-run-boost",
    });
    offers.push({
      title: "Royal Bundle",
      why: "После вайпа или на старте быстрее пачка кэш+броня+decoder, чем фарм с нуля.",
      href: "https://skycoach.gg/rob-run-boost/gearing",
    });
  }

  if (!hero.hasCar || !hero.hasHeli || !hero.hasDecoder || !hero.hasDrill) {
    offers.push({
      title: "Items: tools, supplies, vehicles",
      why: hero.server
        ? `Сервер «${hero.server}» есть — продавец может зайти на трейд.`
        : "Для трейда Skycoach просит ROB RUN server ID. Сейчас его нет — сначала сервер, потом Items.",
      href: "https://skycoach.gg/rob-run-boost/products/items-13124",
    });
  }

  if (hero.hasBase && hero.role !== "cop") {
    offers.push({
      title: "Crew for Hire",
      why: "База уже есть, не хватает людей на хеist. Hourly crew, self-play или piloted.",
      href: "https://skycoach.gg/rob-run-boost/products/crew-for-hire-13123",
    });
  }

  if (!hero.uid) {
    offers.unshift({
      title: "Сначала UID из Esc",
      why: "SteamID ≠ персонаж. Саппорт Kefir и заказ на аккаунт завязаны на UID под именем в паузе.",
      href: "https://kefirgames.helpshift.com/hc/en/14-rob-run/faq/1372-where-can-i-find-my-id/",
    });
  }

  if (!offers.length) {
    offers.push({
      title: "Crew for Hire как добор",
      why: "По вводу персонаж уже собран. Имеет смысл почасовая помощь, а не стартовый бандл.",
      href: "https://skycoach.gg/rob-run-boost/products/crew-for-hire-13123",
    });
  }

  $("offers").innerHTML = offers
    .map(
      (offer) => `
        <a class="offer" href="${escapeAttr(offer.href)}" target="_blank" rel="noreferrer">
          <b>${escapeHtml(offer.title)}</b>
          <span class="why">${escapeHtml(offer.why)}</span>
        </a>
      `,
    )
    .join("");
}

function badge(text, kind) {
  return `<span class="badge ${kind || ""}">${escapeHtml(text)}</span>`;
}

function log(text) {
  $("cors-log").textContent = text;
}

async function json(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok && !data.error) {
    throw new Error(`HTTP ${response.status}`);
  }
  return data;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
