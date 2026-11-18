import fs from "node:fs";
import path from "node:path";

const dumpPath = process.argv[2];
if (!dumpPath) {
  console.error("Usage: node scripts/build-hub-from-live.mjs <path-to-dom-dump.json>");
  process.exit(1);
}
const outPath = path.resolve("public/rob-run-boost/index.html");

const cssHrefs = [
  "https://skycoach.gg/css/main-61d51e7d.css",
  "https://skycoach.gg/css/DefaultLayout-cee326e9.css",
  "https://skycoach.gg/css/AppInviteBar-507cbf59.css",
  "https://skycoach.gg/css/UiDropdown-d29a8ef4.css",
  "https://skycoach.gg/css/GameMainPage-0b0c4b9f.css",
  "https://skycoach.gg/css/ResponsiveImage-0770b17f.css",
  "https://skycoach.gg/css/GameHeader-4516b627.css",
  "https://skycoach.gg/css/CatalogModule-39e59a04.css",
  "https://skycoach.gg/css/ProductCard-9b520b73.css",
  "https://skycoach.gg/css/UpperCentsPrice-e7f06d95.css",
  "https://skycoach.gg/css/lovedOffers-a4ccf0d6.css",
  "https://skycoach.gg/css/BlogCard-5c0b77c3.css",
  "https://skycoach.gg/css/ViewMoreCard-ad84f8cc.css",
  "https://skycoach.gg/css/ReviewsBlock-7f4cb89c.css",
  "https://skycoach.gg/css/UiCarousel-1e356783.css",
  "https://skycoach.gg/css/UiRate-f7aa9dee.css",
  "https://skycoach.gg/css/FooterSeoText-9f4ae485.css",
  "https://skycoach.gg/css/useLocaleSuggestion-fdbf313e.css",
  "https://skycoach.gg/css/UiTabs-0ac7e74c.css",
  "https://skycoach.gg/css/CollapseHeight-242f82bc.css",
  "https://skycoach.gg/css/GPlayButton-20c56a84.css",
  "https://skycoach.gg/css/CashbackBadge-8a6e607b.css",
  "https://skycoach.gg/css/BaseTooltip-e00f6bf2.css",
  "https://skycoach.gg/css/InfoTooltip-04a93139.css",
  "https://skycoach.gg/css/UiSelectMobileModal-84e04e38.css",
  "https://skycoach.gg/css/UiSelect-163cfce2.css",
  "https://skycoach.gg/css/useKeysCountryFilter-28ff9ba4.css",
  "https://skycoach.gg/css/ArrowheadIcon-9432b3a6.css",
  "https://skycoach.gg/css/keysBadgeSheen-9d452711.css",
  "https://skycoach.gg/css/IsolatedLink-70719296.css",
  "https://skycoach.gg/css/GameCard-1d181bb3.css",
  "https://skycoach.gg/css/ItemsSelector-599c39d4.css",
  "https://skycoach.gg/css/CustomOrderBlock-36bbbfa1.css",
  "https://skycoach.gg/css/GameLegalDisclaimerPanel-b257eda3.css",
  "https://skycoach.gg/css/HowItWorks-b4c820f9.css",
  "https://skycoach.gg/css/SkeletonProductCard-c2770920.css",
  "https://skycoach.gg/css/OnlineIndicator-c2fdacbe.css",
  "https://skycoach.gg/css/AccountCard-27913f1f.css",
  "https://skycoach.gg/css/DeliveryTime-de9ddfa7.css",
  "https://skycoach.gg/css/currencyTitle-f19ba281.css",
  "https://skycoach.gg/css/ProductOfferGameLinks-f4db429d.css",
];

const scanCard = `<div class="card catalog-module__product-card card--character-scan" data-v-dcad59ce="" data-v-91697d6b=""><a href="/rob-run-calc/" class="card__container card__container--default" data-v-91697d6b=""><div class="card__content white-transparent-10" data-v-91697d6b=""><div class="card__header" data-v-91697d6b=""><img src="https://skycoach.gg/storage/uploads/game-assets/icons/92b338d15a.svg" loading="eager" alt="" class="card__image" data-v-91697d6b=""><img src="https://skycoach.gg/storage/uploads/game-assets/bg/971/rebrand_a5d92d9758-1920.jpg" loading="eager" alt="" class="card__image-bg" data-v-91697d6b=""></div><div class="card__body" data-v-91697d6b=""><h3 class="card__title h3" data-v-91697d6b="">Character Scan</h3><ul class="product-advantages card__advantages" data-v-91697d6b="" data-v-4504e293=""><li class="product-advantages__item text-small" data-v-4504e293=""><span class="product-advantages__marker" data-v-4504e293=""></span><span class="product-advantages__text" data-v-4504e293="">Sentence &amp; Authority</span></li><li class="product-advantages__item text-small" data-v-4504e293=""><span class="product-advantages__marker" data-v-4504e293=""></span><span class="product-advantages__text" data-v-4504e293="">Research Tree</span></li><li class="product-advantages__item text-small" data-v-4504e293=""><span class="product-advantages__marker" data-v-4504e293=""></span><span class="product-advantages__text" data-v-4504e293="">Offers For Your Wipe</span></li></ul><div class="card__footer" data-v-91697d6b=""><div class="card__price" data-v-91697d6b=""><span class="upper-cent-price upper-cent-price--default" data-v-91697d6b="" data-v-c7be1113="">Free</span></div><span class="button button--action button--violet" data-v-91697d6b="" data-v-8a7f1a64="">Open now</span></div></div></div></a></div>`;

function absolutize(html) {
  html = html.replace(/\sdata-cursor-ref="[^"]*"/g, "");
  html = html.replace(
    /(href|src|data-src|data-fallback-img|poster|xlink:href)=("|')(\/[^"']*)\2/g,
    (_, attr, quote, url) => `${attr}=${quote}https://skycoach.gg${url}${quote}`,
  );
  html = html.replace(
    /(srcset|data-srcset)=("|')([^"']*)\2/g,
    (_, attr, quote, value) => {
      const next = value.replace(/(^|,\s*)(\/)/g, `$1https://skycoach.gg/`);
      return `${attr}=${quote}${next}${quote}`;
    },
  );
  html = html.replace(
    /url\((['"]?)(\/[^)'"]+)\1\)/g,
    "url($1https://skycoach.gg$2$1)",
  );
  return html;
}

const raw = JSON.parse(fs.readFileSync(dumpPath, "utf8")).result.value;
let app = absolutize(raw);

app = app.replace(
  'class="button button--action button--white-transparent-10 game-header__favorite-button"',
  'class="button button--action button--white-transparent-10 game-header__favorite-button" id="add-game"',
);

const firstCard = '<div class="card catalog-module__product-card"';
const firstCardAt = app.indexOf(firstCard);
if (firstCardAt === -1) {
  throw new Error("first product card not found");
}
app = app.slice(0, firstCardAt) + scanCard + app.slice(firstCardAt);
app = app.replaceAll(
  "https://skycoach.gg/images/icons/sprite.svg?v=46",
  "./sprite.svg",
);

const cssLinks = cssHrefs
  .map((href) => `  <link rel="stylesheet" href="${href}" />`)
  .join("\n");

const html = `<!DOCTYPE html>
<html lang="en" class="scrollbar-default">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Buy ROB RUN Boosting Services, Currency, and Items</title>
${cssLinks}
  <link rel="stylesheet" href="./page.css" />
  <link rel="stylesheet" href="../shared/mobile-gate.css" />
</head>
<body>
${app}
  <script src="./page.js"></script>
  <script src="../shared/mobile-gate.js"></script>
</body>
</html>
`;

fs.writeFileSync(outPath, html);
console.log("wrote", outPath, "bytes", html.length);
console.log("cards", (html.match(/catalog-module__product-card/g) || []).length);
console.log("has scan", html.includes("Character Scan"));
console.log("has add-game", html.includes('id="add-game"'));
console.log("relative leftovers", (html.match(/(href|src)="\/(?!rob-run-calc)/g) || []).slice(0, 8));
