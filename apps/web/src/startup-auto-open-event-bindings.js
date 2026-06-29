export function installStartupAutoOpenEventBindings(deps = {}) {
  const {
    documentRef = globalThis.document,
    suppressStartupAutoOpen = () => {}
  } = deps;

  if (!documentRef?.addEventListener) return;
  documentRef.addEventListener("pointerdown", suppressStartupAutoOpen, true);
  documentRef.addEventListener("keydown", suppressStartupAutoOpen, true);
}
