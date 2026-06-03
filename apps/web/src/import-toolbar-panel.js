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
  const items = Array.isArray(options) && options.length ? options : [{ value: "dir_literature_default", label: "Literature" }];
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
          <div class="import-card-kicker">Import</div>
          <strong>Obsidian Import</strong>
        </div>
        <span class="import-card-badge">Preview first</span>
      </div>
      <div class="toolbar-note">Use the Obsidian vault path, preview the files, then confirm import.</div>
      <div class="import-grid import-form-grid" style="margin-top:12px;">
        <label for="importDirectoryId">Import Into</label>
        <select id="importDirectoryId">
          ${renderDirectoryOptions(model.directoryOptions, model.directoryId)}
        </select>

        <label for="importConnector">Source</label>
        <select id="importConnector">
          ${renderConnectorOptions(model.connector)}
        </select>
      </div>
      <div class="import-actions">
        <button class="mini-btn primary" id="btnImportPreview">Preview</button>
        <button class="mini-btn" id="btnImportConfirm"${model.confirmButton.disabled ? " disabled" : ""}>${escapeHtml(model.confirmButton.label)}</button>
      </div>
      <details class="import-advanced" id="importAdvanced">
        <summary>Advanced</summary>
        <div class="import-advanced-body">
          <div class="import-grid">
            <label for="importPath">Vault Path</label>
            <div class="import-field-stack">
              <div class="path-picker">
                <input id="importPath" placeholder="Select Obsidian vault directory" value="${escapeHtml(model.path)}" />
                <button class="mini-btn is-ghost" id="btnBrowseImportPath" type="button">Browse</button>
              </div>
            </div>

            <label for="importPayload">Payload JSON</label>
            <textarea id="importPayload" style="min-height:90px;" placeholder='Optional override, e.g. {"path":"C:/vault"}'>${escapeHtml(model.payload)}</textarea>

            <label for="importOptions">Options JSON</label>
            <textarea id="importOptions" style="min-height:80px;" placeholder='Optional, e.g. {"detectWikilinks":true}'>${escapeHtml(model.options)}</textarea>

            <input id="importRecordId" type="hidden" value="${escapeHtml(model.importRecordId)}" />
          </div>
        </div>
      </details>
    </div>
  `;
}
