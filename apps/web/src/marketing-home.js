function initHomeTabs() {
  const tabs = [...document.querySelectorAll("[data-tour-tab]")];
  const panels = [...document.querySelectorAll("[data-tour-panel]")];
  if (!tabs.length || !panels.length) return;

  function activate(name) {
    tabs.forEach((tab) => {
      const active = tab.dataset.tourTab === name;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
      if (active) {
        tab.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
      }
    });
    panels.forEach((panel) => {
      const active = panel.dataset.tourPanel === name;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
    if (name) {
      const nextHash = `tour-${name}`;
      if (window.location.hash !== `#${nextHash}`) {
        history.replaceState(null, "", `#${nextHash}`);
      }
    }
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activate(String(tab.dataset.tourTab || "")));
    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (index + direction + tabs.length) % tabs.length;
      tabs[nextIndex]?.focus();
      activate(String(tabs[nextIndex]?.dataset.tourTab || ""));
    });
  });

  const initial = String(window.location.hash || "").replace(/^#tour-/, "");
  if (initial && tabs.some((tab) => tab.dataset.tourTab === initial)) {
    activate(initial);
  }
}

initHomeTabs();
