import { renderImportHistoryMount } from "./import-history-mount.js";
import { renderImportResultMount } from "./import-result-mount.js";
import { renderImportToolbarMount } from "./import-toolbar-mount.js";

function renderResultSection(result = {}) {
  if (typeof result === "string") return result;
  if (typeof result?.html === "string") return result.html;
  if (result?.data) return renderImportResultMount(result);
  return "还没有导入结果。先选择来源，再点击预览。";
}

export function renderImportPageMount({
  toolbar = {},
  history = {},
  result = null
} = {}) {
  return `
    <div class="import-page-shell">
      <section class="import-page-primary" id="importToolbarMount">
        ${renderImportToolbarMount(toolbar)}
      </section>
      <section class="import-card import-history-card">
        <div class="import-history-head">
          <div>
            <div class="import-card-kicker">History</div>
            <div class="import-history-title">导入历史</div>
          </div>
          <span class="import-card-badge">最近 12 条</span>
        </div>
        <div id="importHistoryMount">
          ${renderImportHistoryMount(history)}
        </div>
        <div class="import-result" id="importResult">${renderResultSection(result)}</div>
      </section>
    </div>
  `;
}
