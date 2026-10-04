import { escapeHtml } from "./editor-render-utils.js";
import { graphNotePreviewTextForLocalRelation } from "./graph-local-relations.js";

export function renderGraphThemeConfirmation({ notes = [] } = {}) {
  return `<div class="modal graph-theme-confirmation">
    <h2 id="graphThemeConfirmationTitle">整理成一个主题</h2>
    <form data-graph-theme-confirmation-form>
      <label for="graphThemeQuestion">这些笔记共同回答什么问题？</label>
      <textarea id="graphThemeQuestion" name="question" rows="2" required></textarea>
      <div class="graph-theme-confirmation-notes">
        ${notes.map(note => `<label class="graph-theme-confirmation-note">
          <input type="checkbox" name="noteId" value="${escapeHtml(note.id)}" checked />
          <span><strong>${escapeHtml(note.title || note.id)}</strong><small>${escapeHtml(graphNotePreviewTextForLocalRelation(note))}</small></span>
        </label>`).join("")}
      </div>
      <details><summary>主题名称与笔记用途</summary>
        <label for="graphThemeName">主题名称</label>
        <input id="graphThemeName" name="title" placeholder="不填写则使用上方问题" />
        ${notes.map(note => `<label>${escapeHtml(note.title || note.id)}<input name="role:${escapeHtml(note.id)}" placeholder="这条笔记有什么用？（选填）" /></label>`).join("")}
      </details>
      <p role="alert" data-graph-theme-confirmation-error hidden></p>
      <div class="modal-foot">
        <button class="mini-btn" type="button" data-graph-theme-confirmation-cancel>取消</button>
        <button class="mini-btn primary" type="submit">确认主题并继续</button>
      </div>
    </form>
  </div>`;
}

export function createGraphThemeConfirmationDialog({ documentRef = globalThis.document } = {}) {
  let root = null;
  let activeClose = null;
  return function requestGraphThemeConfirmation(options) {
    activeClose?.(null);
    if (!documentRef?.body) return Promise.resolve(null);
    const previousFocus = documentRef.activeElement;
    root = documentRef.createElement("div");
    root.className = "modal-mask";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "graphThemeConfirmationTitle");
    root.innerHTML = renderGraphThemeConfirmation(options);
    documentRef.body.appendChild(root);
    const currentRoot = root;
    return new Promise(resolve => {
      const close = result => {
        if (activeClose !== close) return;
        activeClose = null;
        currentRoot.remove();
        if (previousFocus?.isConnected) previousFocus.focus?.();
        resolve(result);
      };
      activeClose = close;
      currentRoot.querySelector("[data-graph-theme-confirmation-cancel]").addEventListener("click", () => close(null));
      currentRoot.addEventListener("click", event => { if (event.target === currentRoot) close(null); });
      currentRoot.addEventListener("keydown", event => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(null); }
        if (event.key === "Tab") {
          const focusable = [...currentRoot.querySelectorAll("input, textarea, button, summary")].filter(el => !el.disabled && el.getClientRects().length);
          const first = focusable[0], last = focusable.at(-1);
          if (event.shiftKey && documentRef.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && documentRef.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      });
      currentRoot.querySelector("form").addEventListener("submit", event => {
        event.preventDefault();
        const form = event.currentTarget;
        const question = form.elements.question.value.trim();
        const noteIds = [...form.querySelectorAll('[name="noteId"]:checked')].map(el => el.value);
        const error = currentRoot.querySelector("[data-graph-theme-confirmation-error]");
        if (!question || noteIds.length < 3) {
          error.hidden = false;
          error.textContent = question ? "请保留至少 3 条相关笔记。" : "请写下这个主题要回答的问题。";
          return;
        }
        const roles = Object.fromEntries(noteIds.map(id => [id, form.elements.namedItem(`role:${id}`)?.value.trim() || ""]));
        close({ centralQuestion: question, title: form.elements.title.value.trim() || question, noteIds, roles });
      });
      currentRoot.querySelector("textarea").focus();
    });
  };
}
