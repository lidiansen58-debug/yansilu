import { escapeHtml } from "./editor-render-utils.js";

export function renderWritingThemeEdit(card) {
  const field = (name, label, value, multiline = true) => `<div><label for="writingThemeEdit-${name}">${label}</label>${multiline
    ? `<textarea id="writingThemeEdit-${name}" name="${name}" rows="2">${escapeHtml(value || "")}</textarea>`
    : `<input id="writingThemeEdit-${name}" name="${name}" value="${escapeHtml(value || "")}" required />`}</div>`;
  return `<form class="modal writing-theme-edit-form">
    <h2 class="modal-head" id="writingThemeEditHeading">编辑主题</h2>
    <div class="modal-body">
      ${field("title", "主题名称", card.title, false)}
      ${field("centralQuestion", "想回答的问题", card.central_question)}
      <details><summary>观点与概括</summary><div class="writing-theme-edit-advanced">
        ${field("thesis", "核心观点", card.thesis)}
        ${[0, 1, 2].map(i => field(`summary${i + 1}`, `概括 ${i + 1}`, card.three_line_summary?.[i])).join("")}
        ${field("summary", "主题简介", card.summary)}
      </div></details>
      <p role="alert" data-theme-edit-error hidden></p>
    </div>
    <div class="modal-foot"><button class="mini-btn" type="button" data-theme-edit-cancel>取消</button><button class="mini-btn primary" type="submit">保存</button></div>
  </form>`;
}

export function requestWritingThemeEdit({ card, isCurrent, onSave, returnFocus = null, documentRef = globalThis.document }) {
  const owner = documentRef?.getElementById("writingPanel");
  if (!owner || !isCurrent()) return Promise.resolve(null);
  const previousFocus = returnFocus || documentRef.activeElement;
  const root = documentRef.createElement("div");
  root.className = "modal-mask writing-theme-edit-mask";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "writingThemeEditHeading");
  root.innerHTML = renderWritingThemeEdit(card);
  owner.appendChild(root);
  return new Promise(resolve => {
    let saving = false, composing = false, closed = false;
    const form = root.querySelector("form");
    const error = root.querySelector("[data-theme-edit-error]");
    const controls = [...form.querySelectorAll("input, textarea, button")];
    const save = form.querySelector('[type="submit"]');
    const close = result => {
      if (closed) return;
      closed = true;
      observer.disconnect();
      root.remove();
      if (isCurrent()) {
        const fallback = [...owner.querySelectorAll('[data-writing-index-action="edit"]')].find(el => el.getAttribute("data-writing-index-id") === card.id);
        (previousFocus?.isConnected ? previousFocus : fallback)?.focus?.();
      }
      resolve(result);
    };
    const observer = new documentRef.defaultView.MutationObserver(() => { if (!isCurrent() || !owner.isConnected) close(null); });
    observer.observe(documentRef.body, { subtree: true, childList: true, attributes: true });
    const cancel = () => { if (!saving) close(null); };
    root.querySelector("[data-theme-edit-cancel]").addEventListener("click", cancel);
    root.addEventListener("click", event => { if (event.target === root) cancel(); });
    root.addEventListener("compositionstart", () => { composing = true; });
    root.addEventListener("compositionend", () => { composing = false; });
    root.addEventListener("keydown", event => {
      if (event.isComposing || event.keyCode === 229 || composing) return;
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); cancel(); }
      if (event.key === "Tab") {
        const focusable = [...form.querySelectorAll("input, textarea, button, summary")].filter(el => !el.disabled && el.getClientRects().length);
        const first = focusable[0], last = focusable.at(-1);
        if (event.shiftKey && documentRef.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && documentRef.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    });
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (saving || closed || composing) return;
      if (!isCurrent()) return close(null);
      const value = name => form.elements.namedItem(name).value.trim();
      const values = { title: value("title"), centralQuestion: value("centralQuestion"), thesis: value("thesis"),
        summary: value("summary"), threeLineSummary: [1, 2, 3].map(i => value(`summary${i}`)) };
      if (!values.title) { error.textContent = "请填写主题名称。"; error.hidden = false; form.elements.title.focus(); return; }
      if (values.threeLineSummary.some(Boolean) && !values.threeLineSummary.every(Boolean)) {
        form.querySelector("details").open = true;
        error.textContent = "请填写三条概括，或全部留空。";
        error.hidden = false;
        form.elements.namedItem(`summary${values.threeLineSummary.findIndex(line => !line) + 1}`).focus();
        return;
      }
      saving = true;
      error.hidden = true;
      for (const control of controls) control.disabled = true;
      save.textContent = "正在保存…";
      try { close(await onSave(values)); }
      catch (failure) {
        if (closed || !isCurrent()) return close(null);
        error.textContent = failure?.code === "INDEX_CARD_CONFLICT"
          ? "这个主题已被其他操作修改。你的输入已保留，请取消后重新打开，核对最新内容。"
          : failure?.code === "VAULT_CHANGED"
            ? "笔记库已切换，未保存这次修改。你的输入已保留，请回到原笔记库后重新打开主题。"
            : `保存失败：${String(failure?.message || failure)}`;
        error.hidden = false;
      } finally {
        saving = false;
        if (!closed) {
          for (const control of controls) control.disabled = false;
          save.textContent = "保存";
          save.focus();
        }
      }
    });
    form.elements.title.focus();
  });
}
