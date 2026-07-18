export function initMarketingTabs(root = globalThis.document) {
  if (!root?.querySelectorAll) return;

  root.querySelectorAll("[data-marketing-tabs]").forEach((tabs) => {
    const buttons = [...tabs.querySelectorAll('[role="tab"]')];
    const panels = [...tabs.querySelectorAll('[role="tabpanel"]')];
    const autoplayToggle = tabs.parentElement?.querySelector?.("[data-tab-autoplay-toggle]")
      || tabs.querySelector?.("[data-tab-autoplay-toggle]");
    const view = root.defaultView || globalThis.window;
    const autoplayDelay = Number(tabs.getAttribute?.("data-tab-autoplay") || 0);
    const reducedMotion = view?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
    const autoplayAvailable = !reducedMotion && autoplayDelay >= 1000 && buttons.length >= 2;
    let autoplayTimer = null;
    let userPaused = false;
    let pointerInside = false;
    let focusInside = false;

    const selectTab = (nextButton, shouldFocus = false) => {
      const panelId = nextButton?.getAttribute("aria-controls");
      if (!panelId) return;

      buttons.forEach((button) => {
        const active = button === nextButton;
        button.setAttribute("aria-selected", active ? "true" : "false");
        button.tabIndex = active ? 0 : -1;
      });
      panels.forEach((panel) => {
        panel.hidden = panel.id !== panelId;
      });
      if (shouldFocus) nextButton.focus();
    };

    const stopAutoplay = () => {
      if (autoplayAvailable) tabs.setAttribute?.("data-autoplay-paused", "");
      if (autoplayTimer === null) return;
      view?.clearInterval?.(autoplayTimer);
      autoplayTimer = null;
    };

    const syncAutoplayToggle = () => {
      if (!autoplayToggle) return;
      autoplayToggle.hidden = !autoplayAvailable;
      autoplayToggle.textContent = userPaused ? "▶" : "Ⅱ";
      autoplayToggle.setAttribute("aria-label", "自动播放");
      autoplayToggle.setAttribute("title", userPaused ? "继续自动播放" : "暂停自动播放");
      autoplayToggle.setAttribute("aria-pressed", userPaused ? "false" : "true");
    };

    const startAutoplay = () => {
      stopAutoplay();
      if (!view?.setInterval || !autoplayAvailable || userPaused || pointerInside || focusInside || root.hidden) return;
      autoplayTimer = view.setInterval(() => {
        const currentIndex = Math.max(0, buttons.findIndex((button) => button.getAttribute("aria-selected") === "true"));
        selectTab(buttons[(currentIndex + 1) % buttons.length]);
      }, autoplayDelay);
      tabs.removeAttribute?.("data-autoplay-paused");
    };

    const pauseByUser = () => {
      userPaused = true;
      stopAutoplay();
      syncAutoplayToggle();
    };

    buttons.forEach((button, index) => {
      button.addEventListener("click", () => {
        selectTab(button);
        pauseByUser();
      });
      button.addEventListener("keydown", (event) => {
        let nextIndex = index;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % buttons.length;
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + buttons.length) % buttons.length;
        else if (event.key === "Home") nextIndex = 0;
        else if (event.key === "End") nextIndex = buttons.length - 1;
        else return;

        event.preventDefault();
        selectTab(buttons[nextIndex], true);
        pauseByUser();
      });
    });

    const selected = buttons.find((button) => button.getAttribute("aria-selected") === "true") || buttons[0];
    if (selected) selectTab(selected);

    autoplayToggle?.addEventListener("click", () => {
      userPaused = !userPaused;
      if (userPaused) stopAutoplay();
      else startAutoplay();
      syncAutoplayToggle();
    });

    tabs.addEventListener?.("pointerenter", () => {
      pointerInside = true;
      stopAutoplay();
    });
    tabs.addEventListener?.("pointerleave", () => {
      pointerInside = false;
      startAutoplay();
    });
    tabs.addEventListener?.("focusin", () => {
      focusInside = true;
      stopAutoplay();
    });
    tabs.addEventListener?.("focusout", (event) => {
      if (!tabs.contains?.(event.relatedTarget)) {
        focusInside = false;
        startAutoplay();
      }
    });
    root.addEventListener?.("visibilitychange", () => {
      if (root.hidden) stopAutoplay();
      else startAutoplay();
    });
    syncAutoplayToggle();
    startAutoplay();
  });
}
