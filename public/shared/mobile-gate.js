(function mountMobileGate() {
  if (document.querySelector(".mobile-gate")) return;
  let isEn = document.documentElement.lang === "en";
  try {
    if (localStorage.getItem("robrun-language") === "en") isEn = true;
    else if (localStorage.getItem("robrun-language") === "ru") isEn = false;
  } catch {
    /* private mode */
  }
  const gate = document.createElement("div");
  gate.className = "mobile-gate";
  gate.setAttribute("role", "dialog");
  gate.setAttribute("aria-modal", "true");
  gate.setAttribute("aria-labelledby", "mobile-gate-title");
  gate.setAttribute("data-no-translate", "");
  gate.innerHTML = `
    <div class="mobile-gate__card">
      <img src="https://skycoach.gg/images/logos/rebranded/logo.svg" alt="Skycoach" />
      <h2 id="mobile-gate-title">${isEn ? "Open on a computer" : "Откройте на компьютере"}</h2>
      <p id="mobile-gate-body">${
        isEn
          ? "This Character Scan prototype is designed for wide screens: the research tree and final dossier do not fit on phones. Please open this page on a PC or laptop."
          : "Этот разбор персонажа собран как тестовый прототип под широкий экран: дерево изучений и финальное досье на телефоне не умещаются. Пожалуйста, откройте страницу на ПК или ноутбуке."
      }</p>
    </div>
  `;
  document.body.append(gate);
})();
