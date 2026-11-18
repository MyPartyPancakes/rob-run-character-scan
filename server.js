import express from "express";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getServers } from "./lib/servers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8787;
const STEAM_API_KEY = process.env.STEAM_API_KEY?.trim() || "";
const ROB_RUN_APPID = 4262460;
const STEAM_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "32kb" }));

app.get("/", (_req, res) => {
  res.redirect(302, "/rob-run-boost/");
});

app.get("/steam-lab", (_req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});

app.use(express.static(join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    robRunAppId: ROB_RUN_APPID,
    steamApiKey: Boolean(STEAM_API_KEY),
    source: "steamcommunity.com profile XML (?xml=1)",
  });
});

app.get("/api/rob-run/servers", async (_req, res) => {
  try {
    res.json(await getServers());
  } catch (error) {
    res.status(502).json({ ok: false, error: error.message });
  }
});

app.get("/api/rob-run/live", async (_req, res) => {
  const started = Date.now();
  try {
    const data = await fetchJson(
      `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${ROB_RUN_APPID}`,
    );
    res.json({
      ok: true,
      playerCount: data?.response?.player_count ?? null,
      ms: Date.now() - started,
    });
  } catch (error) {
    res.status(502).json({ ok: false, error: error.message, ms: Date.now() - started });
  }
});

app.post("/api/lookup", async (req, res) => {
  const started = Date.now();
  const parsed = parseSteamInput(String(req.body?.url ?? ""));

  if (!parsed.ok) {
    return res.status(400).json({
      ok: false,
      error: parsed.error,
      ms: Date.now() - started,
    });
  }

  try {
    const xmlUrl = communityXmlUrl(parsed);
    const xmlResult = await fetchText(xmlUrl);

    if (!xmlResult.ok) {
      return res.status(502).json({
        ok: false,
        error: `Steam Community ответил ${xmlResult.status}`,
        steamUrl: xmlUrl,
        ms: Date.now() - started,
      });
    }

    if (!xmlResult.text.includes("<profile>")) {
      const missing = /could not be found|couldn['’]t find|не найден/i.test(xmlResult.text);
      return res.status(404).json({
        ok: false,
        error: missing
          ? "Steam не нашёл такой профиль"
          : "Steam вернул не XML профиля (часто так бывает на private / несуществующем id)",
        steamUrl: xmlUrl,
        ms: Date.now() - started,
      });
    }

    const profile = parseProfileXml(xmlResult.text);
    let owned = null;
    let ownedError = null;

    if (STEAM_API_KEY && profile.steamId64) {
      try {
        owned = await getOwnedRobRun(profile.steamId64);
      } catch (error) {
        ownedError = error.message;
      }
    }

    res.json({
      ok: true,
      ms: Date.now() - started,
      steamUrl: xmlUrl,
      input: parsed,
      profile,
      robRun: {
        appId: ROB_RUN_APPID,
        currentlyPlaying: isPlayingRobRun(profile),
        owned,
        ownedError,
        ownedNeedsKey: !STEAM_API_KEY,
      },
    });
  } catch (error) {
    res.status(502).json({
      ok: false,
      error: error.message,
      ms: Date.now() - started,
    });
  }
});

const server = app.listen(PORT, () => {
  console.log(`ROB RUN Character Scan: http://localhost:${PORT}`);
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}

function parseSteamInput(raw) {
  const value = raw.trim();
  if (!value) {
    return { ok: false, error: "Вставьте ссылку на профиль Steam" };
  }

  if (/^\d{17}$/.test(value)) {
    return { ok: true, kind: "steamid64", steamId64: value, vanity: null };
  }

  let url;
  try {
    url = new URL(value.startsWith("http") ? value : `https://${value}`);
  } catch {
    return { ok: false, error: "Это не ссылка и не SteamID64" };
  }

  if (!/(^|\.)steamcommunity\.com$/i.test(url.hostname)) {
    return { ok: false, error: "Нужна ссылка steamcommunity.com/id/... или /profiles/..." };
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "id" && parts[1]) {
    return { ok: true, kind: "vanity", steamId64: null, vanity: decodeURIComponent(parts[1]) };
  }
  if (parts[0] === "profiles" && /^\d{17}$/.test(parts[1] ?? "")) {
    return { ok: true, kind: "steamid64", steamId64: parts[1], vanity: null };
  }
  if (parts[0] === "openid" && parts[1] === "id" && /^\d{17}$/.test(parts[2] ?? "")) {
    return { ok: true, kind: "steamid64", steamId64: parts[2], vanity: null };
  }

  return {
    ok: false,
    error: "Формат: https://steamcommunity.com/id/имя или /profiles/7656119...",
  };
}

function communityXmlUrl(parsed) {
  if (parsed.kind === "vanity") {
    return `https://steamcommunity.com/id/${encodeURIComponent(parsed.vanity)}/?xml=1`;
  }
  return `https://steamcommunity.com/profiles/${parsed.steamId64}/?xml=1`;
}

function parseProfileXml(xml) {
  const inGame = xmlTag(xml, "inGameInfo");
  return {
    steamId64: xmlTag(xml, "steamID64"),
    personaName: xmlCdata(xml, "steamID"),
    onlineState: xmlTag(xml, "onlineState"),
    stateMessage: xmlCdata(xml, "stateMessage"),
    privacyState: xmlTag(xml, "privacyState"),
    visibilityState: xmlTag(xml, "visibilityState"),
    avatarFull: xmlCdata(xml, "avatarFull"),
    vacBanned: xmlTag(xml, "vacBanned") === "1",
    tradeBanState: xmlTag(xml, "tradeBanState"),
    isLimitedAccount: xmlTag(xml, "isLimitedAccount") === "1",
    customUrl: xmlCdata(xml, "customURL"),
    memberSince: xmlTag(xml, "memberSince"),
    hoursPlayed2Wk: xmlTag(xml, "hoursPlayed2Wk"),
    location: xmlCdata(xml, "location"),
    inGame: inGame
      ? {
          gameName: xmlCdata(inGame, "gameName"),
          gameLink: xmlCdata(inGame, "gameLink"),
          gameExtraInfo: xmlCdata(inGame, "gameExtraInfo"),
        }
      : null,
  };
}

function isPlayingRobRun(profile) {
  const name = profile.inGame?.gameName ?? "";
  const link = profile.inGame?.gameLink ?? "";
  return /rob\s*run/i.test(name) || link.includes(String(ROB_RUN_APPID));
}

async function getOwnedRobRun(steamId64) {
  const params = new URLSearchParams({
    key: STEAM_API_KEY,
    steamid: steamId64,
    include_appinfo: "true",
    include_played_free_games: "true",
    "appids_filter[0]": String(ROB_RUN_APPID),
  });
  const data = await fetchJson(
    `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?${params}`,
  );
  const games = data?.response?.games ?? [];
  const game = games.find((item) => Number(item.appid) === ROB_RUN_APPID) ?? null;
  return {
    visible: Array.isArray(data?.response?.games),
    gameCount: data?.response?.game_count ?? games.length,
    robRun: game,
  };
}

function xmlTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? stripCdata(match[1]).trim() : null;
}

function xmlCdata(xml, tag) {
  return xmlTag(xml, tag);
}

function stripCdata(value) {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "user-agent": STEAM_UA, accept: "application/xml,text/xml,*/*" },
    signal: AbortSignal.timeout(12000),
    redirect: "follow",
  });
  const text = await response.text();
  return { ok: response.ok, status: response.status, text };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "user-agent": STEAM_UA, accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    throw new Error(`Steam API HTTP ${response.status}`);
  }
  return response.json();
}
