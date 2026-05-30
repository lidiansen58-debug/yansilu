import { renderImportHistoryMount } from "./import-history-mount.js";
import { renderImportResultMount } from "./import-result-mount.js";
import { renderImportToolbarMount } from "./import-toolbar-mount.js";

function renderResultSection(result = {}) {
  if (typeof result === "string") return result;
  if (typeof result?.html === "string") return result.html;
  if (result?.data) return renderImportResultMount(result);
  return "还没有操作结果。";
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
      <section id="exportCardMount"></section>
      <section class="import-card import-result-card">
        <div class="import-history-head">
          <div>
            <div class="import-card-kicker">结果</div>
            <div class="import-history-title">本次操作</div>
          </div>
        </div>
        <div class="import-result" id="importResult">${renderResultSection(result)}</div>
      </section>
      <section class="import-card import-history-card">
        <div class="import-history-head">
          <div>
            <div class="import-card-kicker">历史</div>
            <div class="import-history-title">最近记录</div>
          </div>
        </div>
        <div id="importHistoryMount">
          ${renderImportHistoryMount(history)}
        </div>
      </section>
    </div>
  `;
}
