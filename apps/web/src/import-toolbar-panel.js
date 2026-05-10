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
          <strong>开始一次导入</strong>
        </div>
        <span class="import-card-badge">预览后写入</span>
      </div>
      <div class="import-flow-steps" aria-label="导入流程">
        <div><span>1</span><strong>预览候选</strong></div>
        <div><span>2</span><strong>确认写入</strong></div>
        <div><span>3</span><strong>历史回滚</strong></div>
      </div>
      <p class="import-card-note">先选来源与路径，预览候选质量，再把确认过的内容写入 Vault。高级参数和记录操作收进下方区域。</p>
      <div class="import-grid" style="margin-top:10px;">
        <label for="importConnector">连接器</label>
        <select id="importConnector">
          ${renderConnectorOptions(model.connector)}
        </select>

        <label for="importPath">导入路径</label>
        <div class="path-picker">
          <input id="importPath" placeholder="例如：E:\\Projects\\Thinking in Notes\\notes-source" value="${escapeHtml(model.path)}" />
          <button class="mini-btn is-ghost" id="btnBrowseImportPath" type="button">浏览...</button>
        </div>
      </div>
      <div class="import-actions">
        <button class="mini-btn primary" id="btnImportPreview">预览候选</button>
        <button class="mini-btn" id="btnImportConfirm"${model.confirmButton.disabled ? " disabled" : ""}>${escapeHtml(model.confirmButton.label)}</button>
      </div>
      <details class="import-advanced" id="importAdvanced">
        <summary>高级选项与记录操作</summary>
        <div class="import-advanced-body">
          <div class="import-grid">
            <label for="importPayload">Payload JSON</label>
            <textarea id="importPayload" style="min-height:90px;" placeholder='为空时自动使用 {"path":"导入路径"}'>${escapeHtml(model.payload)}</textarea>

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
