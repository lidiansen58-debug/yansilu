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
  const items = Array.isArray(options) && options.length ? options : [{ value: "dir_literature_default", label: "文献笔记目录" }];
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
          <div class="import-card-kicker">导入工作台</div>
          <strong>从 Obsidian 导入笔记</strong>
        </div>
        <span class="import-card-badge">仅支持 Obsidian</span>
      </div>
      <p class="import-card-note">先选择你的 Obsidian 仓库目录，生成预览后再确认写入。默认只会导入当前可见且可确认的内容。</p>
      <div class="import-flow-steps">
        <div>
          <span>1</span>
          <strong>选择仓库</strong>
          <small>指向实际的 vault 目录</small>
        </div>
        <div>
          <span>2</span>
          <strong>检查候选</strong>
          <small>确认这次要写入的笔记与资源</small>
        </div>
        <div>
          <span>3</span>
          <strong>完成导入</strong>
          <small>写入后继续整理或导出</small>
        </div>
      </div>
      <div class="import-toolbar-layout">
        <section class="import-field-panel">
          <div class="import-section-label">仓库来源</div>
          <div class="import-section-heading">Obsidian 仓库</div>
          <div class="import-section-note">目前只保留最稳定的一条导入链路，不再展示多连接器选择。</div>
          <input id="importRecordId" type="hidden" value="${escapeHtml(model.importRecordId)}" />
          <select id="importConnector" hidden aria-hidden="true" tabindex="-1">
            <option value="obsidian" selected>Obsidian 仓库</option>
          </select>
        </section>
        <section class="import-field-panel">
          <div class="import-section-label">仓库目录</div>
          <div class="import-section-heading">选择要扫描的 vault 路径</div>
          <div class="path-picker import-path-picker">
            <input id="importPath" placeholder="选择 Obsidian 仓库目录" value="${escapeHtml(model.path)}" />
            <button class="mini-btn is-ghost" id="btnBrowseImportPath" type="button">选择目录</button>
          </div>
          <div class="import-section-note">支持带空格或中文的路径。路径确认后，点击“生成预览”即可查看候选内容。</div>
        </section>
        <section class="import-field-panel">
          <div class="import-section-label">写入位置</div>
          <div class="import-section-heading">导入后的默认落点</div>
          <select id="importDirectoryId">
            ${renderDirectoryOptions(model.directoryOptions, model.directoryId)}
          </select>
          <div class="import-section-note">文献笔记与永久笔记会根据类型写入对应目录，资源文件会自动整理到导入资源目录。</div>
        </section>
        <section class="import-field-panel">
          <div class="import-section-label">操作提示</div>
          <div class="import-section-heading">更符合日常使用的确认方式</div>
          <ul class="import-hint-list">
            <li>预览只展示你当前最需要确认的候选。</li>
            <li>阻断项不会默认勾选，避免误操作。</li>
            <li>确认后可以直接继续整理、写作或导出。</li>
          </ul>
        </section>
      </div>
      <div class="import-actions">
        <button class="mini-btn primary" id="btnImportPreview">生成预览</button>
        <button class="mini-btn" id="btnImportConfirm"${model.confirmButton.disabled ? " disabled" : ""}>${escapeHtml(model.confirmButton.label)}</button>
      </div>
      <div class="import-actions-note">推荐先预览，再确认导入。只有当候选列表清晰可控时，才需要真正写入。</div>
      <details class="import-advanced" id="importAdvanced">
        <summary>高级选项（通常无需修改）</summary>
        <div class="import-advanced-body">
          <div class="import-advanced-tip">只有在你需要覆盖默认导入参数时，才建议填写下面这些 JSON 字段。</div>
          <div class="import-advanced-grid">
            <label for="importPayload">自定义导入参数</label>
            <textarea id="importPayload" style="min-height:96px;" placeholder='例如：{"path":"C:/vault"}'>${escapeHtml(model.payload)}</textarea>

            <label for="importOptions">导入选项</label>
            <textarea id="importOptions" style="min-height:86px;" placeholder='例如：{"detectWikilinks":true}'>${escapeHtml(model.options)}</textarea>
          </div>
        </div>
      </details>
    </div>
  `;
}
