import { buildAppShellAiWritingStateChangeDeps } from "./app-shell-ai-writing-state-change-deps.js";
import { buildAppShellFileStateChangeDeps } from "./app-shell-file-state-change-deps.js";
import { buildAppShellGraphStateChangeDeps } from "./app-shell-graph-state-change-deps.js";
import { buildAppShellNoteStateChangeDeps } from "./app-shell-note-state-change-deps.js";

export function buildAppShellStateChangeDeps(host = {}) {
  const {
    renderAll = () => {},
    syncExplorerContextToActiveTab = () => {}
  } = host;

  return {
    ...buildAppShellGraphStateChangeDeps(host),
    ...buildAppShellNoteStateChangeDeps(host),
    ...buildAppShellAiWritingStateChangeDeps(host),
    ...buildAppShellFileStateChangeDeps(host),
    syncExplorerContextToActiveTab,
    renderAll
  };
}
