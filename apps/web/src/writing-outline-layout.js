const observers = new WeakMap();

export function resizeWritingOutlineHeading(field) {
  if (!field?.matches?.('textarea[data-writing-outline-field="heading"]') || !field.clientWidth) return;
  field.style.height = "auto";
  field.style.height = `${field.scrollHeight + field.offsetHeight - field.clientHeight}px`;
}

export function observeWritingOutlineSize(root) {
  const view = root?.ownerDocument?.defaultView;
  if (!view || observers.has(root)) return;
  let frame = null, width = null;
  const measure = () => {
    frame = null;
    if (!root.isConnected || !root.clientWidth) return;
    root.querySelectorAll('.writing-outline-heading').forEach(resizeWritingOutlineHeading);
  };
  const schedule = () => {
    if (frame === null) frame = view.requestAnimationFrame(measure);
  };
  const observer = typeof view.ResizeObserver === "function" ? new view.ResizeObserver(() => {
    if (root.clientWidth === width) return;
    width = root.clientWidth;
    schedule();
  }) : null;
  if (observer) observer.observe(root);
  else view.addEventListener("resize", schedule);
  observers.set(root, () => {
    observer?.disconnect();
    if (!observer) view.removeEventListener("resize", schedule);
    if (frame !== null) view.cancelAnimationFrame(frame);
    observers.delete(root);
  });
}

export function stopObservingWritingOutlineSize(root) { observers.get(root)?.(); }
