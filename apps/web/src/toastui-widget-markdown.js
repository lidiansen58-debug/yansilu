// ToastUI exports its link/tag widgets with internal wrappers. Keep their text
// and map cursor offsets without exposing those wrappers in the saved Markdown.
import { markdownCodeRanges } from "./markdown-code-context.js";
export function normalizeToastuiWidgetMarkdown(markdown = "", offsets = []) {
  const source = String(markdown);
  const pattern = /\$\$widget\d+\s+(\[\[[^\]\n]+\]\]|#[A-Za-z0-9_\-\u4e00-\u9fff]+)\$\$/g;
  const codeRanges = markdownCodeRanges(source);
  const matches = [...source.matchAll(pattern)].filter(match => !codeRanges.some(([from, to]) => match.index >= from && match.index < to));
  const mapped = offsets.map(offset => {
    const original = Math.max(0, Math.min(source.length, Number(offset) || 0));
    let removed = 0;
    for (const match of matches) {
      const start = match.index, end = start + match[0].length;
      if (original < start) break;
      const prefix = match[0].indexOf(match[1]);
      if (original < end) return start - removed + Math.max(0, Math.min(match[1].length, original - start - prefix));
      removed += match[0].length - match[1].length;
    }
    return original - removed;
  });
  let value = "", cursor = 0;
  for (const match of matches) {
    value += source.slice(cursor, match.index) + match[1];
    cursor = match.index + match[0].length;
  }
  return { value: value + source.slice(cursor), offsets: mapped };
}
