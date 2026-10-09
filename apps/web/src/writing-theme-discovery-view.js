import { captureWritableThemeDiscoveryDrafts } from "./writable-theme-discovery-draft.js";
import { renderWritableThemeDiscoveryPanelDom } from "./writable-theme-discovery-panel.js";

export function syncWritingThemeDiscoveryView(mount, deps = {}) {
  if (!mount) return;
  const state = deps.writingState || {};
  captureWritableThemeDiscoveryDrafts(mount, state);
  const suggestions = Array.isArray(state.themeDiscoverySuggestions) ? state.themeDiscoverySuggestions : [];
  const visible = Boolean(state.themeDiscoveryLoading || suggestions.length);
  mount.hidden = !visible;
  const active = mount.ownerDocument?.activeElement;
  const currentIds = [...(mount.querySelectorAll?.('[data-theme-discovery-suggestion-id]') || [])]
    .map(card => card.getAttribute('data-theme-discovery-suggestion-id'));
  const sameSuggestions = currentIds.length === suggestions.length
    && currentIds.every((id, index) => id === suggestions[index].id);
  // A project-list refresh must not replace an input or interrupt composition.
  // Explicit discovery, removal and a changed suggestion set still render normally.
  if (visible && !state.themeDiscoveryLoading && sameSuggestions && mount.contains?.(active)) return;
  mount.innerHTML = visible ? renderWritableThemeDiscoveryPanelDom(deps) : "";
}
