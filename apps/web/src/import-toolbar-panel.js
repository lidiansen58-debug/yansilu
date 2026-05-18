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
          <strong>导入笔记</strong>
        </div>
        <span class="import-card-badge">先预览，不直接写入</span>
      </div>
      <div class="import-flow-steps" aria-label="导入流程">
        <div><span>1</span><strong>选择来源</strong><small>文件夹或连接器</small></div>
        <div><span>2</span><strong>预览确认</strong><small>勾选后再写入</small></div>
      </div>
      <p class="import-card-note">默认只需要选择来源类型和路径。预览通过后再确认写入；记录查询、回滚和 JSON 参数都收在高级区。</p>
      <div class="import-grid import-form-grid" style="margin-top:10px;">
        <label for="importConnector">来源类型</label>
        <select id="importConnector">
          ${renderConnectorOptions(model.connector)}
        </select>

        <label for="importPath">来源路径</label>
        <div class="import-field-stack">
          <div class="path-picker">
            <input id="importPath" placeholder="选择包含 .md 的文件夹" value="${escapeHtml(model.path)}" />
            <button class="mini-btn is-ghost" id="btnBrowseImportPath" type="button">选择目录</button>
          </div>
          <div class="import-field-help">Markdown 和 Obsidian 直接选目录；Zotero、Readwise、NotebookLM 可在高级区粘贴 Payload JSON。</div>
        </div>
      </div>
      <div class="import-actions">
        <button class="mini-btn primary" id="btnImportPreview">预览</button>
        <button class="mini-btn" id="btnImportConfirm"${model.confirmButton.disabled ? " disabled" : ""}>${escapeHtml(model.confirmButton.label)}</button>
      </div>
      <details class="import-advanced" id="importAdvanced">
        <summary>高级选项、记录查询与回滚</summary>
        <div class="import-advanced-body">
          <div class="import-grid">
            <label for="importPayload">Payload JSON</label>
            <textarea id="importPayload" style="min-height:90px;" placeholder='为空时自动使用 {"path":"来源路径"}'>${escapeHtml(model.payload)}</textarea>

            <label for="importOptions">Options JSON</label>
            <textarea id="importOptions" style="min-height:80px;" placeholder='例如：{"detectWikilinks":true,"detectAliases":true}'>${escapeHtml(model.options)}</textarea>

            <label for="importRecordId">ImportRecord ID</label>
            <input id="importRecordId" placeholder="预览后自动填充，可手动粘贴" value="${escapeHtml(model.importRecordId)}" />
          </div>
          <div class="import-actions secondary">
            <button class="mini-btn" id="btnImportCancel">取消</button>
            <button class="mini-btn" id="btnImportRefresh">查询记录</button>
            <button class="mini-btn" id="btnImportRollback">回滚</button>
          </div>
        </div>
      </details>
    </div>
  `;
}
