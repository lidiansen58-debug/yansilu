import { createHash } from "node:crypto";

const EMBEDDED_PURIFY_SHA256 = "83eb6769ef265a98694d03aef711b7d9dcaf6d063bd67f927ba263d5a1fcd372";

export function patchToastuiUpstreamSource(source, { codeParagraphsPath }) {
  let normalized = source.replaceAll("\r\n", "\n");
  const license = "/*! @license DOMPurify 2.3.3";
  const instance = "var purify = createDOMPurify();";
  const sanitizerStart = normalized.indexOf(license);
  const instanceStart = normalized.indexOf(instance, sanitizerStart);
  const sanitizerEnd = instanceStart + instance.length;
  const embedded = normalized.slice(sanitizerStart, sanitizerEnd);
  if (sanitizerStart < 0 || instanceStart < 0 || normalized.indexOf(license, sanitizerStart + 1) !== -1
    || createHash("sha256").update(embedded).digest("hex") !== EMBEDDED_PURIFY_SHA256) {
    throw new Error("ToastUI embedded sanitizer changed; revalidate its boundary before building.");
  }
  normalized = normalized.slice(0, sanitizerStart) + normalized.slice(sanitizerEnd);
  const original = "var nodes = lineTexts.map(function (lineText) {\n            return createParagraph(schema, createNodesWithWidget(lineText, schema));\n        });";
  const start = normalized.indexOf("MdEditor.prototype.setMarkdown = function");
  const end = normalized.indexOf("MdEditor.prototype.addWidget", start);
  const method = normalized.slice(start, end);
  if (start < 0 || end < 0 || !method.includes(original)) {
    throw new Error("ToastUI Markdown model changed; revalidate code protection before building.");
  }
  return `import purify from "dompurify";\nimport { createCodeSafeMarkdownParagraphs } from ${JSON.stringify(codeParagraphsPath)};\n`
    + normalized.slice(0, start)
    + method.replace(original, "var nodes = createCodeSafeMarkdownParagraphs(markdown, schema, createNodesWithWidget, createParagraph);")
    + normalized.slice(end);
}
