export function escapeTemplatePreviewInline(text = "", deps = {}) {
  const escapeHtml = deps.escapeHtml || ((value = "") => String(value ?? ""));
  return escapeHtml(String(text || ""))
    .replace(/\[\[([^\]]+)\]\]/g, '<span class="preview-wikilink">[[$1]]</span>')
    .replace(/(^|\s)#([^\s#]+)/g, '$1<span class="preview-tag">#$2</span>');
}

export function renderTemplateMarkdownPreviewHtmlForRuntime(source = "", deps = {}) {
  const lines = String(source || "").replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let paragraph = [];
  let listItems = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    html.push(`<p>${escapeTemplatePreviewInline(paragraph.join(" "), deps)}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!listItems.length) return;
    html.push(`<ul>${listItems.map((item) => `<li>${escapeTemplatePreviewInline(item, deps)}</li>`).join("")}</ul>`);
    listItems = [];
  }

  for (const rawLine of lines) {
    const line = String(rawLine || "");
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }
    if (/^#\s+/.test(trimmed)) {
      flushParagraph();
      flushList();
      html.push(`<h1>${escapeTemplatePreviewInline(trimmed.replace(/^#\s+/, ""), deps)}</h1>`);
      continue;
    }
    if (/^##\s+/.test(trimmed)) {
      flushParagraph();
      flushList();
      html.push(`<h2>${escapeTemplatePreviewInline(trimmed.replace(/^##\s+/, ""), deps)}</h2>`);
      continue;
    }
    if (/^>\s*/.test(trimmed)) {
      flushParagraph();
      flushList();
      html.push(`<blockquote>${escapeTemplatePreviewInline(trimmed.replace(/^>\s*/, ""), deps)}</blockquote>`);
      continue;
    }
    if (/^-\s+/.test(trimmed)) {
      flushParagraph();
      listItems.push(trimmed.replace(/^-\s+/, ""));
      continue;
    }
    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  return html.join("") || '<div class="markdown-preview-empty">还没有可预览的内容。</div>';
}
