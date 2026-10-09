const installed = new WeakSet();

/** Native details menus share dismissal and focus behavior without owning actions. */
export function installDisclosureMenus(root) {
  if (!root?.addEventListener || installed.has(root)) return;
  installed.add(root);
  const menus = () => [...root.querySelectorAll('details[data-ui-menu]')];
  root.addEventListener("keydown", event => {
    if (event.key !== "Escape" || event.isComposing || event.keyCode === 229) return;
    const menu = event.target.closest?.('details[data-ui-menu][open]');
    if (!menu || !root.contains(menu)) return;
    event.preventDefault();
    event.stopPropagation();
    menu.open = false;
    menu.querySelector("summary")?.focus();
  });
  // Dismiss before action handlers run so a dialog remembers the visible summary.
  root.addEventListener("click", event => {
    const menu = event.target.closest?.('details[data-ui-menu]');
    if (!menu) return;
    for (const other of menus()) if (other !== menu) other.open = false;
    const button = event.target.closest?.("button");
    if (button && !button.disabled) {
      const returnFocus = menu.contains(root.ownerDocument?.activeElement);
      menu.open = false;
      if (returnFocus) menu.querySelector("summary")?.focus();
    }
  }, { capture: true });
  root.ownerDocument?.addEventListener("pointerdown", event => {
    for (const menu of menus()) if (!menu.contains(event.target)) menu.open = false;
  });
}
