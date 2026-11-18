const SNAPSHOT_PATH = new URL("../public/data/servers.snapshot.json", import.meta.url);
const SOURCE_URL = "https://robrunstatus.com/servers";
const CACHE_MS = 15 * 60 * 1000;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

let cache = { at: 0, payload: null };

export function parseServerDirectory(text) {
  const servers = [];
  const seen = new Set();

  const table = /\|\s*((?:EU|US)-0)\s+(\d+)\s+([^|]+?)\s*\|\s*(EU|East US)\s*\|/gi;
  let match;
  while ((match = table.exec(text))) {
    pushServer(servers, seen, {
      regionCode: match[1].toUpperCase(),
      numericId: match[2],
      name: match[3].trim(),
      region: match[4].trim() === "East US" ? "East US" : "EU",
      rest: text.slice(match.index, match.index + 280),
    });
  }

  const html =
    /<(?:td|th)[^>]*>\s*((?:EU|US)-0)\s+(\d+)\s+([^<]+?)\s*<\/(?:td|th)>\s*<(?:td|th)[^>]*>\s*(EU|East US)\s*<\/(?:td|th)>/gi;
  while ((match = html.exec(text))) {
    pushServer(servers, seen, {
      regionCode: match[1].toUpperCase(),
      numericId: match[2],
      name: match[3].trim(),
      region: match[4].trim() === "East US" ? "East US" : "EU",
      rest: text.slice(match.index, match.index + 400),
    });
  }

  return servers.sort((a, b) => a.label.localeCompare(b.label, "en"));
}

export function parseWipeAt(chunk) {
  const utc = chunk.match(
    /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), [A-Za-z]{3} \d{1,2}, \d{4}, \d{1,2}:\d{2} UTC/,
  );
  if (!utc) return null;
  const stamp = Date.parse(utc[0].replace(", ", " ").replace(/, (\d{4}),/, " $1"));
  return Number.isFinite(stamp) ? stamp : null;
}

export async function loadSnapshot() {
  const { readFile } = await import("node:fs/promises");
  const raw = JSON.parse(await readFile(SNAPSHOT_PATH, "utf8"));
  return Array.isArray(raw) ? raw : raw.servers;
}

export async function getServers() {
  if (cache.payload && Date.now() - cache.at < CACHE_MS) {
    return cache.payload;
  }

  try {
    const response = await fetch(SOURCE_URL, {
      headers: { "user-agent": UA, accept: "text/html,application/json,*/*" },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const servers = parseServerDirectory(await response.text());
    if (!servers.length) throw new Error("empty directory");
    const payload = wrap(servers, "live");
    cache = { at: Date.now(), payload };
    return payload;
  } catch {
    const servers = await loadSnapshot();
    const payload = wrap(servers, "snapshot");
    cache = { at: Date.now(), payload };
    return payload;
  }
}

function wrap(servers, source) {
  return {
    ok: true,
    source,
    updatedAt: new Date().toISOString(),
    lifetimeDays: 7,
    regions: ["EU", "East US"],
    count: servers.length,
    servers,
  };
}

function pushServer(servers, seen, row) {
  const id = `${row.regionCode}-${row.numericId}`;
  if (seen.has(id)) return;
  seen.add(id);
  const wipeAt = parseWipeAt(row.rest);
  servers.push({
    id,
    region: row.region,
    code: row.regionCode,
    numericId: row.numericId,
    name: row.name,
    label: `${row.regionCode} ${row.numericId} ${row.name}`,
    wipeAt,
  });
}
