import { renderImportResultMount } from "./import-result-mount.js";
import { renderImportToolbarMount } from "./import-toolbar-mount.js";

function renderResultSection(result = {}) {
  if (typeof result === "string") return result;
  if (typeof result?.html === "string") return result.html;
  if (result?.data) return renderImportResultMount(result);
  return "还没有执行操作。";
}

function renderExportCard() {
  return `
    <section class="import-card export-card">
      <div class="import-card-head">
        <div>
          <div class="import-card-kicker">导出</div>
          <strong>导出永久笔记</strong>
        </div>
        <span class="import-card-badge">Markdown 文件</span>
      </div>
      <p class="import-card-note">选择范围和目标目录后即可导出。</p>
      <div class="import-toolbar-layout">
        <section class="import-field-panel">
          <label class="import-field-label" for="exportDirectoryId">导出范围</label>
          <select id="exportDirectoryId">
            <option value="dir_original_default">永久笔记目录</option>
          </select>
          <div class="import-field-help">当前只导出永久笔记目录。</div>
        </section>
        <section class="import-field-panel import-field-panel-wide">
          <label class="import-field-label" for="exportTargetPath">目标目录</label>
          <div class="path-picker">
            <input id="exportTargetPath" placeholder="选择导出目标目录" />
            <button class="mini-btn is-ghost" id="btnBrowseExportPath" type="button">选择目录</button>
          </div>
          <div class="import-field-help" id="exportTargetHint">选择目录后会把 Markdown 文件写入那里。</div>
        </section>
      </div>
      <div class="import-actions">
        <button class="mini-btn primary" id="btnExportMarkdown">开始导出</button>
      </div>
      <div class="import-result" id="exportResult">还没有执行导出。</div>
    </section>
  `;
}

function tabButtonMarkup(tab, activeTab) {
  const isActive = tab === activeTab;
  const label = tab === "export" ? "导出" : "导入";
  const detail = tab === "export" ? "把永久笔记导出成 Markdown 文件" : "从 Obsidian 仓库读入内容";
  const panelId = tab === "export" ? "exportCardMount" : "importToolbarMount";
  const buttonId = tab === "export" ? "importWorkspaceTabExport" : "importWorkspaceTabImport";
  return `
    <button
      type="button"
      id="${buttonId}"
      class="import-workspace-tab${isActive ? " is-active" : ""}"
      data-import-workspace-tab="${tab}"
      role="tab"
      aria-selected="${isActive ? "true" : "false"}"
      aria-controls="${panelId}"
      tabindex="${isActive ? "0" : "-1"}"
    >
      <span class="import-workspace-tab-label">${label}</span>
      <span class="import-workspace-tab-detail">${detail}</span>
    </button>
  `;
}

export function renderImportPageMount({
  toolbar = {},
  result = null,
  activeTab = "import"
} = {}) {
  const normalizedActiveTab = activeTab === "export" ? "export" : "import";
  return `
    <div class="import-page-shell" data-import-workspace-tab="${normalizedActiveTab}">
      <section class="import-page-header">
        <div>
          <div class="import-page-eyebrow">导入与导出</div>
          <h2>选择导入或导出</h2>
          <p>左边操作，右边看最近结果。</p>
        </div>
      </section>
      <div class="import-workspace-tabs" role="tablist" aria-label="导入导出切换">
        ${tabButtonMarkup("import", normalizedActiveTab)}
        ${tabButtonMarkup("export", normalizedActiveTab)}
      </div>
      <div class="import-workbench-layout">
        <section class="import-layout-main">
          <section
            id="importToolbarMount"
            class="import-tab-panel"
            role="tabpanel"
            aria-labelledby="importWorkspaceTabImport"
            ${normalizedActiveTab === "import" ? "" : "hidden"}
          >
            ${renderImportToolbarMount(toolbar)}
          </section>
          <section
            id="exportCardMount"
            class="import-tab-panel import-export-slot"
            role="tabpanel"
            aria-labelledby="importWorkspaceTabExport"
            ${normalizedActiveTab === "export" ? "" : "hidden"}
          >
            ${renderExportCard()}
          </section>
        </section>
        <aside class="import-page-side import-layout-result">
          <section class="import-card import-result-card">
            <div class="import-history-head">
              <div>
                <div class="import-card-kicker">最近结果</div>
                <div class="import-history-title">最近一次操作</div>
              </div>
            </div>
            <div class="import-result" id="importResult">${renderResultSection(result)}</div>
          </section>
        </aside>
      </div>
    </div>
  `;
}
