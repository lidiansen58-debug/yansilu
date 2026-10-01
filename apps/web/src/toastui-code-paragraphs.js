import { markdownCodeRanges } from "./markdown-code-context.js";

// ToastUI's Markdown model must not wrap link/tag-looking text inside code.
export function createCodeSafeMarkdownParagraphs(markdown, schema, createWidgets, createParagraph) {
  const source = String(markdown), ranges = markdownCodeRanges(source).sort((a, b) => a[0] - b[0]);
  let offset = 0;
  return source.split(/\r\n|\n|\r/).map(line => {
    const end = offset + line.length, nodes = [];
    let cursor = offset;
    for (const [from, to] of ranges) {
      if (to <= cursor || from >= end) continue;
      const start = Math.max(cursor, from), stop = Math.min(end, to);
      if (start > cursor) nodes.push(...createWidgets(source.slice(cursor, start), schema));
      if (stop > start) nodes.push(schema.text(source.slice(start, stop)));
      cursor = stop;
    }
    if (cursor < end) nodes.push(...createWidgets(source.slice(cursor, end), schema));
    offset = end + (source.slice(end, end + 2) === "\r\n" ? 2 : 1);
    return createParagraph(schema, nodes);
  });
}
