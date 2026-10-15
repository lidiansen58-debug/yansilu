import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { patchToastuiUpstreamSource } from "../../scripts/lib/toastui-upstream-patches.mjs";

const upstream = fs.readFileSync(new URL("../../node_modules/@toast-ui/editor/dist/esm/index.js", import.meta.url), "utf8");
const options = { codeParagraphsPath: "/test/code-paragraphs.js" };

test("ToastUI uses the maintained sanitizer and keeps fenced-code paragraph protection", () => {
  const patched = patchToastuiUpstreamSource(upstream, options);
  assert.match(patched, /import purify from "dompurify"/);
  assert.match(patched, /return purify\.sanitize\(html/);
  assert.doesNotMatch(patched, /DOMPurify 2\.3\.3|function createDOMPurify\(/);
  assert.match(patched, /createCodeSafeMarkdownParagraphs\(markdown, schema/);
});

test("sanitizer boundary changes stop the editor build instead of retaining unreviewed code", () => {
  const altered = upstream.replace("/*! @license DOMPurify 2.3.3", "/*! @license DOMPurify unknown");
  assert.throws(() => patchToastuiUpstreamSource(altered, options), /embedded sanitizer changed/);
  assert.throws(() => patchToastuiUpstreamSource(`${upstream}\n/*! @license DOMPurify 2.3.3`, options), /embedded sanitizer changed/);
  assert.throws(() => patchToastuiUpstreamSource(upstream.replace("var purify = createDOMPurify();", "var purify = createDOMPurify(window);"), options), /embedded sanitizer changed/);
});

test("Markdown upstream changes cannot silently remove fenced-code protection", () => {
  assert.throws(() => patchToastuiUpstreamSource(upstream.replace("MdEditor.prototype.setMarkdown = function", "MdEditor.prototype.changedSetMarkdown = function"), options), /Markdown model changed/);
});

test("upstream boundary verification tolerates platform line endings", () => {
  assert.equal(patchToastuiUpstreamSource(upstream.replace(/\r?\n/g, "\r\n"), options), patchToastuiUpstreamSource(upstream, options));
});
