const timers = new WeakMap();

export function updateOperationNotice(element, { tone = "", notify = false } = {}) {
  if (!element) return;
  clearTimeout(timers.get(element));
  const visible = notify || tone === "bad" || tone === "warn";
  element.classList.toggle("is-visible", visible);
  if (!visible) return;
  const dismiss = element.querySelector("[data-dismiss-status]");
  if (dismiss) dismiss.onclick = () => {
    element.classList.remove("is-visible");
    clearTimeout(timers.get(element));
  };
  if (tone !== "bad" && tone !== "busy") {
    timers.set(element, setTimeout(() => element.classList.remove("is-visible"), tone === "warn" ? 12000 : 6000));
  }
}
