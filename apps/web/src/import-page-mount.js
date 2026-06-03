import { renderImportResultMount } from "./import-result-mount.js";
import { renderImportToolbarMount } from "./import-toolbar-mount.js";

function renderResultSection(result = {}) {
  if (typeof result === "string") return result;
  if (typeof result?.html === "string") return result.html;
  if (result?.data) return renderImportResultMount(result);
  return "No import or export result yet.";
}

export function renderImportPageMount({
  toolbar = {},
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
            <div class="import-card-kicker">Result</div>
            <div class="import-history-title">Latest Run</div>
          </div>
        </div>
        <div class="import-result" id="importResult">${renderResultSection(result)}</div>
      </section>
    </div>
  `;
}
