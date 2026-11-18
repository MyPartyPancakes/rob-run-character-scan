const addGame = document.getElementById("add-game");
if (addGame) {
  addGame.addEventListener("click", () => {
    addGame.classList.toggle("on");
    const label = addGame.querySelector(".game-header__favorite-button-text");
    if (label) {
      label.textContent = addGame.classList.contains("on")
        ? "In my games"
        : "Add to my games";
    }
  });
}

const prev = document.querySelector(".reviews__header-control-button--prev");
const next = document.querySelector(".reviews__header-control-button--next");
const track = document.querySelector(".reviews .slides-wrapper");
const cards = track ? [...track.querySelectorAll(".review-card")] : [];
const pageSize = 4;
let page = 0;

function uniqueCards() {
  const seen = new Set();
  return cards.filter((card) => {
    const key = (card.innerText || "").replace(/\s+/g, " ").slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const unique = uniqueCards();
const pages = Math.max(1, Math.ceil(unique.length / pageSize) || 1);

function renderReviews() {
  if (!track || !unique.length) return;
  track.style.transition = "none";
  track.style.transform = "translateX(0)";
  track.innerHTML = "";
  for (let i = 0; i < pageSize; i += 1) {
    const source = unique[(page * pageSize + i) % unique.length];
    const clone = source.cloneNode(true);
    clone.style.width = "calc(25% - 2.4rem)";
    clone.style.flexShrink = "0";
    clone.style.marginRight = "2.4rem";
    track.append(clone);
  }
}

if (prev && next && unique.length) {
  prev.addEventListener("click", () => {
    page = (page - 1 + pages) % pages;
    renderReviews();
  });
  next.addEventListener("click", () => {
    page = (page + 1) % pages;
    renderReviews();
  });
  renderReviews();
}
