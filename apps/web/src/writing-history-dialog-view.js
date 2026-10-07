import { escapeHtml } from "./editor-render-utils.js";

export function createWritingHistoryDialog(documentRef) {
  const dialog = documentRef.createElement("dialog");
  dialog.className = "writing-history-dialog";
  dialog.setAttribute("aria-labelledby", "writingHistoryTitle");
  dialog.innerHTML = `<header><h2 id="writingHistoryTitle">提纲历史</h2><button type="button" class="mini-btn" data-history-close>关闭</button></header>
    <label for="writingHistoryVersion">选择提纲版本</label>
    <div class="writing-history-selection"><select id="writingHistoryVersion" autofocus></select>
      <button class="mini-btn" type="button" data-history-newer disabled>较新</button><button class="mini-btn" type="button" data-history-older disabled>更早</button></div>
    <p id="writingHistoryStatus" role="status" aria-live="polite"></p>
    <div id="writingHistoryPreview" class="writing-history-preview"></div>
    <footer><button type="button" class="mini-btn" data-history-retry hidden>重新载入</button>
      <button type="button" class="mini-btn" data-history-export disabled>导出 .md</button>
      <button type="button" class="mini-btn primary" data-history-restore disabled>恢复此提纲</button></footer>`;
  documentRef.body.appendChild(dialog);
  return { dialog, select: dialog.querySelector("select"), status: dialog.querySelector("[role=status]"),
    preview: dialog.querySelector("#writingHistoryPreview"), restore: dialog.querySelector("[data-history-restore]"),
    exportButton: dialog.querySelector("[data-history-export]"), retry: dialog.querySelector("[data-history-retry]"),
    newer: dialog.querySelector("[data-history-newer]"), older: dialog.querySelector("[data-history-older]") };
}

export function fillWritingHistoryVersions(view, versions, currentId) {
  view.select.innerHTML = versions.map((item, index) => {
    const time = new Date(item.created_at);
    const date = Number.isNaN(time.getTime()) ? "日期未知" : time.toLocaleString("zh-CN", { hour12: false });
    const name = item.version_note || `提纲 ${versions.length - index}`;
    const label = `${item.id === currentId ? "当前 · " : ""}${date} · ${name} · ${item.section_count} 节`;
    return `<option value="${escapeHtml(item.id)}">${escapeHtml(label)}</option>`;
  }).join("");
  view.select.value = versions.some(item => item.id === currentId) ? currentId : versions[0]?.id || "";
}

export function fillWritingHistoryPreview(view, scaffold) {
  view.preview.innerHTML = `<ol>${scaffold.sections.map(section => `<li><strong>${escapeHtml(section.heading || "未命名章节")}</strong>
    ${section.purpose ? `<p>${escapeHtml(section.purpose)}</p>` : ""}</li>`).join("")}</ol>`;
}
