import { importConnectorOptions, importToolbarViewModel } from "./import-toolbar-model.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderConnectorOptions(selectedValue) {
  return importConnectorOptions()
    .map((option) => `<option value="${escapeHtml(option.value)}"${option.value === selectedValue ? " selected" : ""}>${escapeHtml(option.label)}</option>`)
    .join("");
}

export function renderImportToolbarPanel(input = {}) {
  const model = importToolbarViewModel(input);
  return `
    <div class="import-card import-toolbar-card">
      <div class="import-card-head">
        <div>
          <div class="import-card-kicker">Import</div>
          <strong>导入</strong>
        </div>
        <span class="import-card-badge">预览后导入</span>
      </div>
      <div class="import-grid import-form-grid" style="margin-top:10px;">
        <label for="importConnector">来源</label>
        <select id="importConnector">
          ${renderConnectorOptions(model.connector)}
        </select>

        <label for="importPath">路径</label>
        <div class="import-field-stack">
          <div class="path-picker">
            <input id="importPath" placeholder="选择要导入的目录" value="${escapeHtml(model.path)}" />
            <button class="mini-btn is-ghost" id="btnBrowseImportPath" type="button">选择</button>
          </div>
        </div>
      </div>
      <div class="import-actions">
        <button class="mini-btn primary" id="btnImportPreview">预览</button>
        <button class="mini-btn" id="btnImportConfirm"${model.confirmButton.disabled ? " disabled" : ""}>${escapeHtml(model.confirmButton.label)}</button>
      </div>
      <details class="import-advanced" id="importAdvanced">
        <summary>高级选项</summary>
        <div class="import-advanced-body">
          <div class="import-grid">
            <label for="importPayload">Payload JSON</label>
            <textarea id="importPayload" style="min-height:90px;" placeholder='留空时自动使用 {"path":"当前路径"}'>${escapeHtml(model.payload)}</textarea>

            <label for="importOptions">Options JSON</label>
            <textarea id="importOptions" style="min-height:80px;" placeholder='例如：{"detectWikilinks":true}'>${escapeHtml(model.options)}</textarea>

            <label for="importRecordId">ImportRecord ID</label>
            <input id="importRecordId" placeholder="预览后自动填入" value="${escapeHtml(model.importRecordId)}" />
          </div>
          <div class="import-actions secondary">
            <button class="mini-btn" id="btnImportCancel">取消</button>
            <button class="mini-btn" id="btnImportRefresh">刷新记录</button>
            <button class="mini-btn" id="btnImportRollback">回滚</button>
          </div>
        </div>
      </details>
    </div>
  `;
}
