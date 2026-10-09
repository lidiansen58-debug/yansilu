import { normalizeWysiwygMarkdownValue } from "./editor-markdown-commands.js";
import { createWritingDocumentLinkOpener } from "./writing-document-links.js";

const controllers = new WeakMap();

/** The textarea remains the canonical Markdown bridge for saving and exporting. */
export function syncWritingDocumentEditor(deps = {}) {
  controllers.get(deps.$?.("writingDraftEditor"))?.sync();
}

export function installWritingDocumentEditor({ $ = () => null, depsProvider = () => ({}) } = {}) {
  const source = $("writingDraftEditor"), host = $("writingDocumentEditor"), toggle = $("btnWritingEditorMode");
  if (!source || !host || !toggle || controllers.has(source)) return;
  let rich = null, loading = false, failed = false, suppress = false, mode = "document", rendered = "";
  const openLink = createWritingDocumentLinkOpener(depsProvider);
  function sync() {
    const documentMode = mode === "document" && Boolean(rich);
    source.hidden = documentMode;
    host.hidden = !documentMode;
    host.setAttribute("aria-disabled", String(source.disabled));
    toggle.disabled = source.disabled || failed || loading;
    toggle.textContent = loading ? "载入编辑器…" : documentMode ? "Markdown" : "正文模式";
    toggle.setAttribute("aria-label", documentMode ? "切换到 Markdown 源码" : "切换到正文编辑");
    toggle.setAttribute("aria-pressed", String(!documentMode));
    const tools = $("writingDocumentTools");
    if (tools) tools.hidden = !documentMode;
    for (const button of tools?.querySelectorAll("button") || []) button.disabled = source.disabled || !documentMode;
    if (rich) {
      if (source.value !== rendered) {
        suppress = true;
        try { rich.setValue(source.value); rendered = source.value; } finally { suppress = false; }
      }
      for (const editable of host.querySelectorAll('.ProseMirror[contenteditable]')) editable.setAttribute("contenteditable", String(!source.disabled));
    } else if (!source.disabled && !loading && !failed) void load();
  }
  async function load() {
    loading = true;
    sync();
    try {
      const { createWysiwygMarkdownEditor } = await import("/vendor/toastui-editor.bundle.js");
      rendered = source.value;
      rich = createWysiwygMarkdownEditor({
        parent: host, doc: source.value,
        onChange: value => {
          if (suppress || source.disabled || mode !== "document") return;
          const next = normalizeWysiwygMarkdownValue(value).value;
          if (next === source.value) return;
          rendered = source.value = next;
          source.dispatchEvent(new Event("input", { bubbles: true }));
        },
        onKeydown: event => {
          if (event.isComposing || event.keyCode === 229) return;
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
            event.preventDefault(); event.stopPropagation();
            $("btnWritingSaveDraft")?.click();
          }
        },
        onClickToken: openLink
      });
      host.querySelector('.toastui-editor-ww-container .ProseMirror')?.setAttribute("aria-label", "正文内容");
    } catch {
      failed = true;
      mode = "source";
      depsProvider().setStatus?.("正文编辑器未能载入，可继续使用 Markdown 编辑。", "warn", { notify: true });
    } finally {
      if (source.ownerDocument?.activeElement === source) mode = "source";
      loading = false;
      sync();
    }
  }
  toggle.addEventListener("click", () => {
    if (!rich) return;
    mode = mode === "document" ? "source" : "document";
    sync();
    if (mode === "source") source.focus(); else rich.focus();
  });
  source.addEventListener("input", () => {
    if (loading) mode = "source";
    if (mode === "source") sync();
  });
  $("writingDocumentTools")?.addEventListener("mousedown", event => event.preventDefault());
  $("writingDocumentTools")?.addEventListener("click", event => {
    const button = event.target.closest?.("[data-writing-format]");
    if (!button || button.disabled) return;
    rich?.exec(button.dataset.writingFormat);
  });
  controllers.set(source, { sync });
  sync();
}
