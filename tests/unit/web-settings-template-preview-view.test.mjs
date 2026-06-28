import test from "node:test";
import assert from "node:assert/strict";

import {
  escapeTemplatePreviewInline,
  renderTemplateMarkdownPreviewHtmlForRuntime
} from "../../apps/web/src/settings-template-preview-view.js";

const escapeHtml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

test("settings template preview escapes inline text and decorates note tokens", () => {
  const html = escapeTemplatePreviewInline('A <tag> [[Note]] #topic', { escapeHtml });

  assert.equal(html, 'A &lt;tag&gt; <span class="preview-wikilink">[[Note]]</span> <span class="preview-tag">#topic</span>');
});

test("settings template preview renders headings blockquotes lists and paragraphs", () => {
  const html = renderTemplateMarkdownPreviewHtmlForRuntime(
    "# Title\n\n> Quote\n\n- one\n- two\n\nBody [[Note]] #tag",
    { escapeHtml }
  );

  assert.match(html, /<h1>Title<\/h1>/);
  assert.match(html, /<blockquote>Quote<\/blockquote>/);
  assert.match(html, /<ul><li>one<\/li><li>two<\/li><\/ul>/);
  assert.match(html, /<p>Body <span class="preview-wikilink">\[\[Note\]\]<\/span> <span class="preview-tag">#tag<\/span><\/p>/);
});

test("settings template preview renders an empty-state block", () => {
  assert.match(renderTemplateMarkdownPreviewHtmlForRuntime("", { escapeHtml }), /markdown-preview-empty/);
});
