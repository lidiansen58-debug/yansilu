import { renderImportResultMount } from "./import-result-mount.js";
import { renderImportToolbarMount } from "./import-toolbar-mount.js";

function renderResultSection(result = {}) {
  if (typeof result === "string") return result;
  if (typeof result?.html === "string") return result.html;
  if (result?.data) return renderImportResultMount(result);
  return "还没有执行导入或导出。先选择 Obsidian 仓库并生成预览。";
}

function renderExportCard() {
  return `
    <section class="import-card export-card">
      <div class="import-card-head">
        <div>
          <div class="import-card-kicker">导出工作台</div>
          <strong>把永久笔记整洁导出成 Markdown</strong>
        </div>
        <span class="import-card-badge">Markdown</span>
      </div>
      <p class="import-card-note">适合归档、备份或分享给其他环境。先确认导出范围，再选择保存位置即可开始。</p>
      <div class="import-flow-steps">
        <div class="import-flow-step">
          <span class="import-flow-step-index">1</span>
          <div>
            <strong>选范围</strong>
            <span>选择要导出的永久笔记目录。</span>
          </div>
        </div>
        <div class="import-flow-step">
          <span class="import-flow-step-index">2</span>
          <div>
            <strong>选位置</strong>
            <span>首次导出时指定保存目录。</span>
          </div>
        </div>
        <div class="import-flow-step">
          <span class="import-flow-step-index">3</span>
          <div>
            <strong>开始导出</strong>
            <span>系统会把 Markdown 文件写到目标目录。</span>
          </div>
        </div>
      </div>
      <div class="import-toolbar-layout">
        <section class="import-field-panel">
          <div class="import-section-label">导出范围</div>
          <h3 class="import-section-heading">选择需要导出的内容</h3>
          <p class="import-section-note">默认导出永久笔记盒，范围明确，适合归档和后续整理。</p>
          <div class="import-grid import-form-grid">
            <label for="exportDirectoryId">永久笔记目录</label>
            <select id="exportDirectoryId">
              <option value="dir_original_default">永久笔记盒</option>
            </select>
          </div>
        </section>
        <section class="import-field-panel">
          <div class="import-section-label">保存位置</div>
          <h3 class="import-section-heading">选择导出目录</h3>
          <p class="import-section-note" id="exportTargetHint">将从永久笔记盒导出。首次导出时再选择保存位置。</p>
          <details class="import-advanced" id="exportAdvanced">
            <summary>设置导出目录</summary>
            <div class="import-advanced-body">
              <div class="import-grid">
                <label for="exportTargetPath">目标目录</label>
                <div class="import-field-stack">
                  <div class="path-picker">
                    <input id="exportTargetPath" placeholder="选择导出目标目录" />
                    <button class="mini-btn is-ghost" id="btnBrowseExportPath" type="button">选择目录</button>
                  </div>
                </div>
              </div>
            </div>
          </details>
        </section>
      </div>
      <div class="import-actions">
        <span class="import-actions-note">导出完成后会在结果区显示状态与文件数量。</span>
        <button class="mini-btn primary" id="btnExportMarkdown">开始导出</button>
      </div>
      <div class="import-result" id="exportResult">选择导出范围后即可开始。</div>
    </section>
  `;
}

export function renderImportPageMount({
  toolbar = {},
  result = null
} = {}) {
  return `
    <div class="import-page-shell">
      <section class="import-card import-workbench-hero">
        <div class="import-workbench-hero-copy">
          <div class="import-card-kicker">导入与导出</div>
          <h2>把 Obsidian 笔记稳稳带进来，再整洁导出去</h2>
          <p>这条工作流只保留最常用的操作：选择仓库、预览候选、确认写入，以及导出永久笔记。</p>
        </div>
        <div class="import-workbench-hero-points">
          <div>
            <strong>1</strong>
            <span>先预览，再写入</span>
          </div>
          <div>
            <strong>2</strong>
            <span>只导入当前看得见的内容</span>
          </div>
          <div>
            <strong>3</strong>
            <span>导出即归档，适合分享</span>
          </div>
        </div>
      </section>
      <div class="import-workbench-layout">
        <div class="import-page-primary">
          <section id="importToolbarMount">
            ${renderImportToolbarMount(toolbar)}
          </section>
          <section id="exportCardMount" class="import-export-slot">
            ${renderExportCard()}
          </section>
        </div>
        <aside class="import-page-side">
          <section class="import-card import-result-card">
            <div class="import-history-head">
              <div>
                <div class="import-card-kicker">执行结果</div>
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
