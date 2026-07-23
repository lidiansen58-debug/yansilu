import { importToolbarViewModel } from "./import-toolbar-model.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderDirectoryOptions(options = [], selectedValue = "") {
  const items = Array.isArray(options) && options.length
    ? options
    : [{ value: "dir_original_default", label: "永久笔记目录" }];
  return items
    .map((option) => `<option value="${escapeHtml(option.value)}"${option.value === selectedValue ? " selected" : ""}>${escapeHtml(option.label)}</option>`)
    .join("");
}

export function renderImportToolbarPanel(input = {}) {
  const model = importToolbarViewModel(input);

  return `
    <div class="import-card import-toolbar-card">
      <div class="import-card-head">
        <div>
          <div class="import-card-kicker">导入</div>
          <strong>从 Obsidian 导入</strong>
        </div>
      </div>
      <input id="importRecordId" type="hidden" value="${escapeHtml(model.importRecordId)}" />
      <select id="importConnector" hidden aria-hidden="true" tabindex="-1">
        <option value="obsidian" selected>Obsidian 仓库</option>
      </select>
      <div class="import-toolbar-layout">
        <section class="import-field-panel import-field-panel-wide">
          <label class="import-field-label" for="importPath">来源仓库</label>
          <div class="path-picker import-path-picker">
            <input id="importPath" placeholder="选择 Obsidian 仓库目录" value="${escapeHtml(model.path)}" />
            <button class="mini-btn is-ghost" id="btnBrowseImportPath" type="button">选择目录</button>
          </div>
          <div class="import-field-help">先预览确认：默认不修改原 Vault；导入后的笔记可随时导回 Markdown。</div>
        </section>
        <section class="import-field-panel">
          <label class="import-field-label" for="importDirectoryId">导入到</label>
          <select id="importDirectoryId">
            ${renderDirectoryOptions(model.directoryOptions, model.directoryId)}
          </select>
          <div class="import-field-help">第 3 步确认导入后，默认进入永久笔记目录，方便继续建立关系和主题。</div>
        </section>
      </div>
      <details class="import-compat-details">
        <summary>高级导入设置</summary>
        <div class="import-compat-body">
          <section class="import-field-panel">
            <label class="import-field-label" for="importPayload">覆盖请求（可选）</label>
            <textarea id="importPayload" style="min-height:112px;" placeholder='例如：{"path":"E:/Notes/My Obsidian Vault"}'>${escapeHtml(model.payload)}</textarea>
            <div class="import-field-help">只有上面的“来源仓库”不够表达时才填写，最常见是补一个 <code>path</code>。</div>
          </section>
          <section class="import-field-panel">
            <label class="import-field-label" for="importOptions">兼容规则（可选）</label>
            <textarea id="importOptions" style="min-height:112px;" placeholder='例如：{"detectWikilinks":true}'>${escapeHtml(model.options)}</textarea>
            <div class="import-field-help">开启 <code>detectWikilinks</code> 后，<code>[[关联标题]]</code> 会作为关系匹配依据；确认导入后再写入可追溯关系。</div>
          </section>
        </div>
      </details>
      <div class="import-actions">
        <button class="mini-btn primary" id="btnImportPreview">第 2 步：生成预览</button>
        <button class="mini-btn" id="btnImportConfirm"${model.confirmButton.disabled ? " disabled" : ""}>${escapeHtml(model.confirmButton.label)}</button>
      </div>
    </div>
  `;
}
