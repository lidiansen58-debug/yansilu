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

function renderDirectoryOptions(options = [], selectedValue = "") {
  const items = Array.isArray(options) && options.length ? options : [{ value: "dir_literature_default", label: "文献卡片盒" }];
  return items
    .map((option) => `<option value="${escapeHtml(option.value)}"${option.value === selectedValue ? " selected" : ""}>${escapeHtml(option.label)}</option>`)
    .join("");
}

export function renderImportToolbarPanel(input = {}) {
  const model = importToolbarViewModel(input);
  const usesFilesystemSource = model.connector === "markdown" || model.connector === "obsidian";

  return `
    <div class="import-card import-toolbar-card">
      <div class="import-card-head">
        <div>
          <div class="import-card-kicker">导入</div>
          <strong>导入资料</strong>
        </div>
        <span class="import-card-badge">先预览，再写入</span>
      </div>
      <div class="toolbar-note">先选文件盒目录。物理路径只在高级选项里填写。</div>
      <div class="import-grid import-form-grid" style="margin-top:12px;">
        <label for="importDirectoryId">导入到</label>
        <select id="importDirectoryId">
          ${renderDirectoryOptions(model.directoryOptions, model.directoryId)}
        </select>

        <label for="importConnector">来源</label>
        <select id="importConnector">
          ${renderConnectorOptions(model.connector)}
        </select>
      </div>
      <div class="import-actions">
        <button class="mini-btn primary" id="btnImportPreview">生成预览</button>
        <button class="mini-btn" id="btnImportConfirm"${model.confirmButton.disabled ? " disabled" : ""}>${escapeHtml(model.confirmButton.label)}</button>
      </div>
      <details class="import-advanced" id="importAdvanced">
        <summary>高级选项</summary>
        <div class="import-advanced-body">
          <div class="import-grid">
            ${
              usesFilesystemSource
                ? `
                  <label for="importPath">来源目录</label>
                  <div class="import-field-stack">
                    <div class="path-picker">
                      <input id="importPath" placeholder="选择包含 Markdown 的目录" value="${escapeHtml(model.path)}" />
                      <button class="mini-btn is-ghost" id="btnBrowseImportPath" type="button">选择</button>
                    </div>
                  </div>
                `
                : `<input id="importPath" type="hidden" value="${escapeHtml(model.path)}" />`
            }

            <label for="importPayload">Payload JSON</label>
            <textarea id="importPayload" style="min-height:90px;" placeholder='留空时自动使用当前来源配置'>${escapeHtml(model.payload)}</textarea>

            <label for="importOptions">Options JSON</label>
            <textarea id="importOptions" style="min-height:80px;" placeholder='例如：{"detectWikilinks":true}'>${escapeHtml(model.options)}</textarea>

            <label for="importRecordId">ImportRecord ID</label>
            <input id="importRecordId" placeholder="预览后自动填入" value="${escapeHtml(model.importRecordId)}" />
          </div>
          <div class="import-actions secondary">
            <button class="mini-btn" id="btnImportCancel">取消</button>
            <button class="mini-btn" id="btnImportRefresh">读取记录</button>
            <button class="mini-btn" id="btnImportRollback">回滚</button>
          </div>
        </div>
      </details>
    </div>
  `;
}
