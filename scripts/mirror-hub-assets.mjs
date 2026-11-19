/**
 * Mirror Skycoach static assets for the existing hub snapshot.
 *
 * Does NOT rebuild markup from live skycoach.gg.
 * Does NOT rewrite Buy / blog / login / footer hrefs.
 *
 * Rule: copy and retarget only /css/, /storage/, /images/, /fonts/.
 *
 * Usage: node scripts/mirror-hub-assets.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ORIGIN = "https://skycoach.gg";
const LOCAL_PREFIX = "/rob-run-boost/vendor";
const VENDOR_DIR = path.resolve("public/rob-run-boost/vendor");
const HUB_HTML = path.resolve("public/rob-run-boost/index.html");
const ASSET_ROOTS = ["/css/", "/storage/", "/images/", "/fonts/"];
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function isAssetPath(pathname) {
  return ASSET_ROOTS.some((root) => pathname.startsWith(root));
}

function toSkycoachUrl(raw, base = `${ORIGIN}/`) {
  const trimmed = String(raw || "").trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("#")) {
    return null;
  }
  try {
    const url = new URL(trimmed, base);
    if (url.hostname !== "skycoach.gg" && url.hostname !== "www.skycoach.gg") {
      return null;
    }
    if (!isAssetPath(url.pathname)) return null;
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function toLocalPath(url) {
  return `${LOCAL_PREFIX}${url.pathname}`;
}

function vendorFile(url) {
  return path.join(VENDOR_DIR, url.pathname.replace(/^\/+/, ""));
}

function splitSrcset(value) {
  return value
    .split(",")
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function collectHtmlAssetUrls(html) {
  const found = new Set();
  for (const attr of ["src", "data-src", "data-fallback-img", "poster"]) {
    const re = new RegExp(`\\b${attr}=["']([^"']+)["']`, "g");
    for (const match of html.matchAll(re)) {
      const url = toSkycoachUrl(match[1]);
      if (url) found.add(url.href);
    }
  }
  for (const attr of ["srcset", "data-srcset"]) {
    const re = new RegExp(`\\b${attr}=["']([^"']+)["']`, "g");
    for (const match of html.matchAll(re)) {
      for (const token of splitSrcset(match[1])) {
        const url = toSkycoachUrl(token);
        if (url) found.add(url.href);
      }
    }
  }
  for (const match of html.matchAll(
    /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi,
  )) {
    const tag = match[0];
    if (!/\brel=["']stylesheet["']/i.test(tag)) continue;
    const url = toSkycoachUrl(match[1]);
    if (url) found.add(url.href);
  }
  return [...found];
}

function collectCssAssetUrls(cssText, cssUrl) {
  const found = new Set();
  const urlRe = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
  const importRe = /@import\s+(?:url\()?['"]?([^'")\s]+)['"]?\)?/g;
  for (const match of cssText.matchAll(urlRe)) {
    const url = toSkycoachUrl(match[2], cssUrl);
    if (url) found.add(url.href);
  }
  for (const match of cssText.matchAll(importRe)) {
    const url = toSkycoachUrl(match[1], cssUrl);
    if (url) found.add(url.href);
  }
  return [...found];
}

function rewriteCss(cssText, cssUrl, okUrls) {
  return cssText.replace(
    /url\(\s*(['"]?)([^'")]+)\1\s*\)/g,
    (full, quote, raw) => {
      const url = toSkycoachUrl(raw, cssUrl);
      if (!url) return full;
      if (!okUrls.has(url.href)) return `url(${quote}${url.href}${quote})`;
      return `url(${quote}${toLocalPath(url)}${quote})`;
    },
  );
}

function rewriteKnownAssets(text, urlMap) {
  let next = text;
  const remotes = [...urlMap.keys()].sort((a, b) => b.length - a.length);
  for (const remote of remotes) {
    next = next.split(remote).join(urlMap.get(remote));
  }
  return next;
}

async function fetchBuffer(href, attempt = 1) {
  const response = await fetch(href, {
    headers: {
      "User-Agent": UA,
      Accept: "*/*",
      Referer: `${ORIGIN}/rob-run-boost`,
    },
    redirect: "follow",
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      return fetchBuffer(href, attempt + 1);
    }
    throw new Error(`${response.status} ${href}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function mapPool(items, limit, worker) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      await worker(item);
    }
  });
  await Promise.all(workers);
}

function countMatches(text, re) {
  return (text.match(re) || []).length;
}

const html = fs.readFileSync(HUB_HTML, "utf8");
const aHrefBefore = countMatches(html, /<a\b[^>]*\bhref="https:\/\/skycoach\.gg/g);
const scanBefore = html.includes('href="/rob-run-calc/"');
const glowBefore = html.includes("card--character-scan");

const htmlAssets = collectHtmlAssetUrls(html);
const cssUrls = htmlAssets.filter((href) => {
  const url = new URL(href);
  return url.pathname.startsWith("/css/") && url.pathname.endsWith(".css");
});

console.log("hub html assets", htmlAssets.length);
console.log("css files", cssUrls.length);

const cssSources = new Map();
await mapPool(cssUrls, 6, async (href) => {
  const buf = await fetchBuffer(href);
  if (!buf) throw new Error(`css 404 ${href}`);
  cssSources.set(href, buf.toString("utf8"));
  console.log("css", href, buf.length);
});

const allAssets = new Set(htmlAssets);
for (const [href, cssText] of cssSources) {
  for (const nested of collectCssAssetUrls(cssText, href)) {
    allAssets.add(nested);
  }
}

console.log("total assets", allAssets.size);

const urlMap = new Map();
const missing = [];
const binaries = [...allAssets].filter((href) => !cssSources.has(href));

await mapPool(binaries, 6, async (href) => {
  const url = new URL(href);
  const dest = vendorFile(url);
  const buf = await fetchBuffer(href);
  if (!buf) {
    missing.push(url.pathname);
    console.log("skip 404", url.pathname);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  urlMap.set(href, toLocalPath(url));
  console.log("ok", url.pathname, buf.length);
});

for (const [href, cssText] of cssSources) {
  const url = new URL(href);
  const dest = vendorFile(url);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, rewriteCss(cssText, href, new Set(urlMap.keys())), "utf8");
  urlMap.set(href, toLocalPath(url));
}

const nextHtml = rewriteKnownAssets(html, urlMap);
if (!nextHtml.includes("card--character-scan") || !nextHtml.includes('href="/rob-run-calc/"')) {
  throw new Error("hub markup contract broken");
}

const leftoverAssets = [
  ...nextHtml.matchAll(/https:\/\/(?:www\.)?skycoach\.gg\/(?:css|storage|images|fonts)\/[^"'\s)]+/g),
].map((match) => match[0]);
const leftoverUnexpected = leftoverAssets.filter((href) => {
  const url = toSkycoachUrl(href);
  return url && !missing.includes(url.pathname);
});
const aHrefAfter = countMatches(nextHtml, /<a\b[^>]*\bhref="https:\/\/skycoach\.gg/g);
const vendorAnchors = countMatches(nextHtml, /<a\b[^>]*\bhref="\/rob-run-boost\/vendor/g);
const localCss = countMatches(
  nextHtml,
  /<link rel="stylesheet" href="\/rob-run-boost\/vendor\/css\//g,
);

if (leftoverUnexpected.length) {
  throw new Error(`hub still has remote asset URL(s): ${leftoverUnexpected.slice(0, 5).join(", ")}`);
}
if (aHrefAfter !== aHrefBefore || vendorAnchors) {
  throw new Error(
    `anchor href rewritten: before ${aHrefBefore}, after ${aHrefAfter}, vendor anchors ${vendorAnchors}`,
  );
}
if (localCss !== cssUrls.length) {
  throw new Error(`expected ${cssUrls.length} local CSS links, got ${localCss}`);
}
if (!scanBefore || !glowBefore) {
  throw new Error("Character Scan card missing before rewrite");
}

fs.writeFileSync(HUB_HTML, nextHtml, "utf8");

const productFiles = [
  path.resolve("public/rob-run-calc/app/product.js"),
  path.resolve("public/rob-run-calc/app/product.css"),
  path.resolve("public/rob-run-calc/index.html"),
  path.resolve("public/shared/mobile-gate.js"),
];

for (const file of productFiles) {
  const original = fs.readFileSync(file, "utf8");
  const hrefCount = countMatches(original, /href="https:\/\/skycoach\.gg/g);
  const hubConst = original.includes('const HUB = "https://skycoach.gg/rob-run-boost"');
  const next = rewriteKnownAssets(original, urlMap);
  if (countMatches(next, /href="https:\/\/skycoach\.gg/g) !== hrefCount) {
    throw new Error(`href changed in ${path.relative(process.cwd(), file)}`);
  }
  if (hubConst && !next.includes('const HUB = "https://skycoach.gg/rob-run-boost"')) {
    throw new Error("HUB constant rewritten");
  }
  fs.writeFileSync(file, next, "utf8");
  console.log("rewrote", path.relative(process.cwd(), file));
}

console.log("anchor href kept", aHrefAfter);
console.log("local css links", localCss);
console.log("missing remote fallbacks", missing.length, missing.join(", ") || "none");
console.log("vendor dir", VENDOR_DIR);
console.log("done");
