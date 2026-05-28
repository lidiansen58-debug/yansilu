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
