export class ContextMenu {
  constructor(element) {
    this.element = element;
    this.currentTarget = null;
    this.onAction = null;

    document.addEventListener("click", (e) => {
      if (!e.target.closest(`#${this.element.id}`)) this.hide();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.hide();
    });
  }

  show({ x, y, actions, target, onAction }) {
    this.currentTarget = target;
    this.onAction = onAction;
    this.element.innerHTML = actions
      .map((a) => {
        if (a.type === "separator") return `<div class="ctx-sep" aria-hidden="true"></div>`;
        const classes = [a.danger ? "danger" : "", a.disabled ? "disabled" : ""].filter(Boolean).join(" ");
        const right = a.shortcut ? `<span class="ctx-shortcut">${a.shortcut}</span>` : "";
        const icon = a.icon ? `<span class="ctx-icon" aria-hidden="true">${a.icon}</span>` : `<span class="ctx-icon ctx-icon-empty" aria-hidden="true"></span>`;
        return `<button data-action="${a.key}" class="${classes}" ${a.disabled ? "disabled" : ""}>
          <span class="ctx-main">${icon}<span class="ctx-label">${a.label}</span></span>${right}
        </button>`;
      })
      .join("");
    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
    this.element.classList.remove("hidden");

    this.element.onclick = (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      if (btn.disabled) return;
      onAction?.(btn.dataset.action, target);
      this.hide();
    };
  }

  hide() {
    this.element.classList.add("hidden");
    this.element.innerHTML = "";
    this.currentTarget = null;
  }
}
