import { escapeHtml } from "./editor-render-utils.js";

export function installGlobalNoteSearch({ documentRef = document, searchNotes, openNote }) {
  const dialog = documentRef.getElementById("noteSearchDialog");
  const input = documentRef.getElementById("globalNoteSearchInput");
  const results = documentRef.getElementById("noteSearchResults");
  const status = documentRef.getElementById("noteSearchStatus");
  let serial = 0, timer, previousFocus;
  const close = () => {
    serial += 1;
    clearTimeout(timer);
    dialog.hidden = true;
    previousFocus?.focus?.();
  };
  const search = async () => {
    const request = ++serial;
    results.replaceChildren();
    status.textContent = "正在搜索...";
    try {
      const response = await searchNotes({ query: input.value.trim(), limit: 50 });
      if (request !== serial || dialog.hidden) return;
      const items = response.items || [];
      status.textContent = items.length ? `${response.total} 条笔记${response.total > items.length ? "，显示前 50 条" : ""}` : "没有找到笔记，换个关键词试试。";
      if (response.unreadableCount) status.textContent += ` ${response.unreadableCount} 条笔记暂时无法读取，请检查文件。`;
      results.innerHTML = items.map((item) => `<button type="button" class="note-search-result" data-search-note="${escapeHtml(item.id)}"><strong>${escapeHtml(item.title || "未命名笔记")}</strong>${item.excerpt ? `<span>${escapeHtml(item.excerpt)}</span>` : ""}<small>${escapeHtml(item.markdownPath || "")}</small></button>`).join("");
    } catch (error) {
      if (request === serial && !dialog.hidden) status.textContent = `搜索失败：${error.message || error}。请重试。`;
    }
  };
  const open = () => {
    if (dialog.hidden) previousFocus = documentRef.activeElement;
    dialog.hidden = false;
    input.focus();
    input.select();
    void search();
  };
  documentRef.getElementById("btnToggleSearch")?.addEventListener("click", open);
  dialog.querySelector("[data-close-note-search]").addEventListener("click", close);
  dialog.addEventListener("click", (event) => { if (event.target === dialog) close(); });
  input.addEventListener("input", () => {
    serial += 1;
    clearTimeout(timer);
    results.replaceChildren();
    status.textContent = "正在搜索...";
    timer = setTimeout(search, 200);
  });
  results.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-search-note]");
    if (!button || button.disabled) return;
    button.disabled = true;
    const request = ++serial;
    const isCurrent = () => request === serial && !dialog.hidden;
    try { await openNote(button.dataset.searchNote, { isCurrent }); if (isCurrent()) close(); }
    catch (error) { if (request === serial) status.textContent = `打开失败：${error.message || error}`; }
    finally { button.disabled = false; }
  });
  documentRef.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "f" && !event.isComposing) {
      event.preventDefault(); event.stopImmediatePropagation(); open(); return;
    }
    if (dialog.hidden) return;
    // Keep native typing and button activation, but isolate background app shortcuts.
    event.stopImmediatePropagation();
    if (event.isComposing || event.keyCode === 229) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") event.preventDefault();
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (event.target === input && event.key === "Enter" && !event.isComposing) { event.preventDefault(); results.querySelector("button")?.click(); }
    if (event.key === "ArrowDown" && event.target === input) { event.preventDefault(); results.querySelector("button")?.focus(); }
    if (event.key === "Tab") {
      const focusable = [...dialog.querySelectorAll("input,button:not([disabled])")];
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && documentRef.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && documentRef.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }, true);
}
