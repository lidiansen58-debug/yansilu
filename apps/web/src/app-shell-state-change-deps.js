import { buildAppShellAiWritingStateChangeDeps } from "./app-shell-ai-writing-state-change-deps.js";
import { buildAppShellFileStateChangeDeps } from "./app-shell-file-state-change-deps.js";
import { buildAppShellGraphStateChangeDeps } from "./app-shell-graph-state-change-deps.js";
import { buildAppShellNoteStateChangeDeps } from "./app-shell-note-state-change-deps.js";

export function buildAppShellStateChangeDeps(host = {}) {
  const {
    confirm = null,
    importSmartNotesDemo = async () => false,
    openImportModule = () => {},
    renderAll = () => {},
    setStatus = () => {},
    syncExplorerContextToActiveTab = () => {}
  } = host;

  return {
    ...buildAppShellGraphStateChangeDeps(host),
    ...buildAppShellNoteStateChangeDeps(host),
    ...buildAppShellAiWritingStateChangeDeps(host),
    ...buildAppShellFileStateChangeDeps(host),
    confirm,
    importSmartNotesDemo,
    openImportModule,
    ensureAiReadyForFeature: host.ensureAiReadyForFeature,
    ensureLocalAiReadyForFeature: host.ensureLocalAiReadyForFeature,
    runSourceDistillAi: host.runSourceDistillAi,
    syncExplorerContextToActiveTab,
    setStatus,
    renderAll
  };
}
