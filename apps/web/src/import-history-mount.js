import { renderImportHistoryControls } from "./import-history-controls.js";
import { renderImportHistoryPanel } from "./import-history-panel.js";
import { renderImportHistoryRecentSummary } from "./import-history-summary.js";

export function renderImportHistoryMount({
  items = [],
  total = 0,
  loading = false,
  activeImportRecordId = "",
  filters = {}
} = {}) {
  return `
    ${renderImportHistoryRecentSummary({ items, loading })}
    ${renderImportHistoryControls({ filters })}
    <div class="import-history" id="importHistory">
      ${renderImportHistoryPanel({
        items,
        total,
        loading,
        activeImportRecordId,
        filters
      })}
    </div>
  `;
}
