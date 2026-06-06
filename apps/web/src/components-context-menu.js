export function resolveContextMenuPosition({
  x = 0,
  y = 0,
  menuWidth = 0,
  menuHeight = 0,
  viewportWidth = 0,
  viewportHeight = 0,
  margin = 8
} = {}) {
  const safeViewportWidth = Math.max(0, Number(viewportWidth) || 0);
  const safeViewportHeight = Math.max(0, Number(viewportHeight) || 0);
  const safeMenuWidth = Math.max(0, Number(menuWidth) || 0);
  const safeMenuHeight = Math.max(0, Number(menuHeight) || 0);
  const safeMargin = Math.max(0, Number(margin) || 0);

  const maxLeft = Math.max(safeMargin, safeViewportWidth - safeMenuWidth - safeMargin);
  const maxTop = Math.max(safeMargin, safeViewportHeight - safeMenuHeight - safeMargin);

  let left = Math.min(Math.max(Number(x) || 0, safeMargin), maxLeft);
  let top = Math.min(Math.max(Number(y) || 0, safeMargin), maxTop);

  if (safeViewportWidth && safeMenuWidth && x + safeMenuWidth + safeMargin > safeViewportWidth) {
    left = Math.max(safeMargin, Math.min(Number(x) || 0, maxLeft));
  }
  if (safeViewportHeight && safeMenuHeight && y + safeMenuHeight + safeMargin > safeViewportHeight) {
    top = Math.max(safeMargin, Math.min(Number(y) || 0, maxTop));
  }

  return { left, top };
}

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
    this.element.classList.remove("hidden");
    this.element.style.visibility = "hidden";
    this.element.style.left = "0px";
    this.element.style.top = "0px";

    const viewportWidth =
      window.visualViewport?.width || window.innerWidth || document.documentElement?.clientWidth || 0;
    const viewportHeight =
      window.visualViewport?.height || window.innerHeight || document.documentElement?.clientHeight || 0;
    const rect = this.element.getBoundingClientRect();
    const { left, top } = resolveContextMenuPosition({
      x,
      y,
      menuWidth: rect.width,
      menuHeight: rect.height,
      viewportWidth,
      viewportHeight,
      margin: 8
    });

    this.element.style.left = `${left}px`;
    this.element.style.top = `${top}px`;
    this.element.style.visibility = "";

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
