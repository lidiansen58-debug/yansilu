import {
  attachmentLabelFromPath,
  encodePreviewPayload,
  isExternalLinkUrl,
  isHorizontalRuleLine,
  isMarkdownBlockBoundary,
  isMarkdownBulletLine,
  isMarkdownCodeFenceLine,
  isMarkdownOrderedListLine,
  isMarkdownTableRow,
  isMarkdownTableSeparator,
  isMarkdownTableStart,
  normalizeCodeLanguage,
  parseMarkdownLinkSyntax,
  parseMarkdownTableRow,
  previewAssetUrl,
  renderHighlightedCode
} from "./editor-markdown-commands.js";
import { wikilinkLabelFromRaw, wikilinkTargetFromRaw } from "./editor-link-picker.js";
import { escapeHtml } from "./editor-render-utils.js";

export function renderInlinePreview(text, options = {}) {
  const source = String(text || "");
  const noteMarkdownPath = String(options.noteMarkdownPath || "");
  let html = "";
  let index = 0;

  while (index < source.length) {
    if (source.startsWith("[[", index)) {
      const close = source.indexOf("]]", index + 2);
      if (close > index + 2) {
        const rawLink = source.slice(index + 2, close).trim();
        const target = wikilinkTargetFromRaw(rawLink);
        const label = wikilinkLabelFromRaw(rawLink);
        html += `<button class="preview-wikilink" type="button" data-preview-link="${escapeHtml(target || rawLink)}">${escapeHtml(label || target || rawLink)}</button>`;
        index = close + 2;
        continue;
      }
    }

    if (source.startsWith("**", index)) {
      const close = source.indexOf("**", index + 2);
      if (close > index + 2) {
        html += `<strong>${renderInlinePreview(source.slice(index + 2, close))}</strong>`;
        index = close + 2;
        continue;
      }
    }

    if (source[index] === "*") {
      const close = source.indexOf("*", index + 1);
      if (close > index + 1) {
        html += `<em>${renderInlinePreview(source.slice(index + 1, close))}</em>`;
        index = close + 1;
        continue;
      }
    }

    if (source[index] === "`") {
      const close = source.indexOf("`", index + 1);
      if (close > index + 1) {
        html += `<code>${escapeHtml(source.slice(index + 1, close))}</code>`;
        index = close + 1;
        continue;
      }
    }

    const markdownLink = parseMarkdownLinkSyntax(source.slice(index));
    if (markdownLink && !markdownLink.isImage) {
      const { label, href } = markdownLink;
      if (isExternalLinkUrl(href)) {
        html += `<button class="preview-wikilink" type="button" data-preview-external-url="${escapeHtml(href)}">${escapeHtml(label || href)}</button>`;
        index += markdownLink.length;
        continue;
      }
      const url = previewAssetUrl(href, noteMarkdownPath);
      const textLabel = label || attachmentLabelFromPath(href);
      if (!url) {
        html += `<button class="preview-link" type="button" data-preview-missing-asset="${escapeHtml(href)}">${escapeHtml(textLabel)}</button>`;
      } else {
        html += `<button class="preview-attachment inline" type="button" data-preview-asset-url="${escapeHtml(url)}" data-preview-asset-label="${escapeHtml(textLabel)}">${escapeHtml(textLabel)}</button>`;
      }
      index += markdownLink.length;
      continue;
    }

    const tagMatch = source.slice(index).match(/^#([A-Za-z0-9_\-\u4e00-\u9fff]+)/u);
    const prev = index > 0 ? source[index - 1] : "";
    if (tagMatch && (!prev || /[\s([{"'，。；：！？、,.!?;:]/u.test(prev))) {
      const token = tagMatch[1];
      html += `<button class="preview-tag" type="button" data-preview-tag="${escapeHtml(token)}">#${escapeHtml(token)}</button>`;
      index += tagMatch[0].length;
      continue;
    }

    if (source[index] === "\n") {
      html += "<br>";
      index += 1;
      continue;
    }

    html += escapeHtml(source[index]);
    index += 1;
  }

  return html;
}

export function renderMarkdownPreview(markdown, options = {}) {
  const text = String(markdown || "").replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const blocks = [];
  const noteMarkdownPath = String(options.noteMarkdownPath || "");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (isMarkdownCodeFenceLine(line)) {
      const language = line.replace(/^\s*```/, "").trim();
      const codeLines = [];
      index += 1;
      while (index < lines.length && !isMarkdownCodeFenceLine(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length && isMarkdownCodeFenceLine(lines[index])) index += 1;
      const codeSource = codeLines.join("\n");
      const highlighted = renderHighlightedCode(codeSource, language);
      const languageLabel = normalizeCodeLanguage(language) || highlighted.language || "text";
      blocks.push(`
        <div class="preview-code-block">
          <div class="preview-code-head">
            <span>${escapeHtml(languageLabel)}</span>
            <button class="preview-code-copy" type="button" data-preview-copy-code="${escapeHtml(encodePreviewPayload(codeSource))}">复制代码</button>
          </div>
          <pre><code>${highlighted.html}</code></pre>
        </div>
      `);
      continue;
    }

    if (isHorizontalRuleLine(line)) {
      blocks.push(`<hr class="preview-rule">`);
      index += 1;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${renderInlinePreview(headingMatch[2], options)}</h${level}>`);
      index += 1;
      continue;
    }

    if (line.startsWith("> ")) {
      const quoteLines = [];
      while (index < lines.length && lines[index].startsWith("> ")) {
        quoteLines.push(lines[index].slice(2));
        index += 1;
      }
      blocks.push(`<blockquote><p>${renderInlinePreview(quoteLines.join("\n"), options)}</p></blockquote>`);
      continue;
    }

    if (isMarkdownTableStart(lines, index)) {
      const headerCells = parseMarkdownTableRow(lines[index]);
      const columnCount = Math.max(2, headerCells.length);
      const rows = [];
      index += 2;
      while (index < lines.length && isMarkdownTableRow(lines[index]) && !isMarkdownTableSeparator(lines[index])) {
        rows.push(parseMarkdownTableRow(lines[index]));
        index += 1;
      }
      blocks.push(`
        <div class="preview-table-wrap">
          <table class="preview-table">
            <thead>
              <tr>${Array.from({ length: columnCount }, (_, cellIndex) => `<th>${renderInlinePreview(headerCells[cellIndex] || "", options)}</th>`).join("")}</tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  (row) =>
                    `<tr>${Array.from({ length: columnCount }, (_, cellIndex) => `<td>${renderInlinePreview(row[cellIndex] || "", options)}</td>`).join("")}</tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `);
      continue;
    }

    const imageMatch = parseMarkdownLinkSyntax(line.trim());
    if (imageMatch?.isImage && imageMatch.length === line.trim().length) {
      const { label: alt, href } = imageMatch;
      const url = previewAssetUrl(href, noteMarkdownPath);
      const label = alt || attachmentLabelFromPath(href);
      if (!url) {
        blocks.push(`<div class="preview-attachment-block"><button class="preview-attachment" type="button" data-preview-missing-asset="${escapeHtml(href)}"><span class="preview-attachment-name">${escapeHtml(label)}</span><span class="preview-attachment-path">${escapeHtml(href)}</span></button></div>`);
        index += 1;
        continue;
      }
      blocks.push(`
        <figure class="preview-figure">
          <img class="preview-image-asset" src="${escapeHtml(url)}" alt="${escapeHtml(label)}" data-preview-asset-url="${escapeHtml(url)}" data-preview-asset-label="${escapeHtml(label)}">
          <figcaption>${escapeHtml(label)}</figcaption>
        </figure>
      `);
      index += 1;
      continue;
    }

    if (/^\s*[-*+]\s\[(?: |x|X)\]\s/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*[-*+]\s\[(?: |x|X)\]\s/.test(lines[index])) {
        const match = lines[index].match(/^\s*[-*+]\s\[((?: |x|X))\]\s?(.*)$/);
        const checked = /x/i.test(match?.[1] || "");
        items.push(`<li class="task-item"><input type="checkbox" disabled ${checked ? "checked" : ""}><span>${renderInlinePreview(match?.[2] || "", options)}</span></li>`);
        index += 1;
      }
      blocks.push(`<ul class="task-list">${items.join("")}</ul>`);
      continue;
    }

    if (isMarkdownBulletLine(line)) {
      const items = [];
      while (index < lines.length && isMarkdownBulletLine(lines[index])) {
        const match = lines[index].match(/^\s*[-*+]\s?(.*)$/);
        items.push(`<li>${renderInlinePreview(match?.[1] || "", options)}</li>`);
        index += 1;
      }
      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (isMarkdownOrderedListLine(line)) {
      const firstNumber = Number(line.match(/^\s*(\d+)[.)]\s/)?.[1] || 1);
      const items = [];
      while (index < lines.length && isMarkdownOrderedListLine(lines[index])) {
        const match = lines[index].match(/^\s*\d+[.)]\s?(.*)$/);
        items.push(`<li>${renderInlinePreview(match?.[1] || "", options)}</li>`);
        index += 1;
      }
      const startAttr = firstNumber > 1 ? ` start="${firstNumber}"` : "";
      blocks.push(`<ol${startAttr}>${items.join("")}</ol>`);
      continue;
    }

    const attachmentMatch = parseMarkdownLinkSyntax(line.trim());
    if (attachmentMatch && !attachmentMatch.isImage && attachmentMatch.length === line.trim().length) {
      const { label, href } = attachmentMatch;
      const url = previewAssetUrl(href, noteMarkdownPath);
      const textLabel = label || attachmentLabelFromPath(href);
      if (!url) {
        blocks.push(`
          <div class="preview-attachment-block">
            <button class="preview-attachment" type="button" data-preview-missing-asset="${escapeHtml(href)}">
              <span class="preview-attachment-name">${escapeHtml(textLabel)}</span>
              <span class="preview-attachment-path">${escapeHtml(href)}</span>
            </button>
          </div>
        `);
      } else {
        blocks.push(`
          <div class="preview-attachment-block">
            <button class="preview-attachment" type="button" data-preview-asset-url="${escapeHtml(url)}" data-preview-asset-label="${escapeHtml(textLabel)}">
              <span class="preview-attachment-name">${escapeHtml(textLabel)}</span>
              <span class="preview-attachment-path">${escapeHtml(href)}</span>
            </button>
          </div>
        `);
      }
      index += 1;
      continue;
    }

    const paragraphLines = [];
    while (index < lines.length && lines[index].trim()) {
      if (isMarkdownBlockBoundary(lines, index)) break;
      paragraphLines.push(lines[index]);
      index += 1;
    }
    blocks.push(`<p>${renderInlinePreview(paragraphLines.join("\n"), options)}</p>`);
  }

  return blocks.length
    ? blocks.join("")
    : `<div class="markdown-preview-empty">打开或新建一条笔记后，这里显示 Markdown 预览。</div>`;
}
