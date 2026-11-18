import { writeFile } from "node:fs/promises";
import { parseServerDirectory } from "../lib/servers.js";

const sources = process.argv.slice(2);
let text = "";

if (sources.length) {
  const { readFile } = await import("node:fs/promises");
  text = await readFile(sources[0], "utf8");
} else {
  const response = await fetch("https://robrunstatus.com/servers", {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  text = await response.text();
}

const servers = parseServerDirectory(text);
if (!servers.length) throw new Error("No servers parsed");

const payload = {
  source: "https://robrunstatus.com/servers",
  capturedAt: new Date().toISOString(),
  lifetimeDays: 7,
  count: servers.length,
  servers,
};

const out = new URL("../public/data/servers.snapshot.json", import.meta.url);
await writeFile(out, JSON.stringify(payload, null, 2));
console.log(`Wrote ${servers.length} servers → ${out.pathname}`);
