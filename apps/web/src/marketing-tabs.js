export function initMarketingTabs(root = globalThis.document) {
  if (!root?.querySelectorAll) return;

  root.querySelectorAll("[data-marketing-tabs]").forEach((tabs) => {
    const buttons = [...tabs.querySelectorAll('[role="tab"]')];
    const panels = [...tabs.querySelectorAll('[role="tabpanel"]')];

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

    buttons.forEach((button, index) => {
      button.addEventListener("click", () => selectTab(button));
      button.addEventListener("keydown", (event) => {
        let nextIndex = index;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % buttons.length;
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + buttons.length) % buttons.length;
        else if (event.key === "Home") nextIndex = 0;
        else if (event.key === "End") nextIndex = buttons.length - 1;
        else return;

        event.preventDefault();
        selectTab(buttons[nextIndex], true);
      });
    });

    const selected = buttons.find((button) => button.getAttribute("aria-selected") === "true") || buttons[0];
    if (selected) selectTab(selected);
  });
}
