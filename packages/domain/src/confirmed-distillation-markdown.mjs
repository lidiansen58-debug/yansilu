import { markdownCodeRanges } from "../../markdown-engine/src/markdown-code-context.mjs";

const END = "<!-- yansilu:distillation:end -->";

function legacyBlockEnd(rows, start, limit, isCode) {
  let index = start + 1, fields = 0;
  const skipBlank = () => { while (index < limit && !rows[index].value.trim()) index++; };
  skipBlank();
  while (index < limit && !isCode(index)) {
    const heading = rows[index].value.match(/^###\s+(当前观点|补充说明|边界)\s*$/)?.[1];
    if (!heading) break;
    index++;
    skipBlank();
    if (heading === "补充说明") {
      let count = 0;
      while (index < limit && !isCode(index) && /^[1-3]\.\s+/.test(rows[index].value) && count++ < 3) index++;
    } else if (index < limit && !isCode(index) && !/^#/.test(rows[index].value)) index++;
    fields++;
    skipBlank();
  }
  return fields ? index : start;
}

export function upsertConfirmedDistillationMarkdown(markdownBody, section) {
  const source = String(markdownBody || "").replace(/\r\n/g, "\n").trim();
  const rows = [...source.matchAll(/[^\n]*(?:\n|$)/g)].filter(row => row[0])
    .map(row => ({ value: row[0].replace(/\n$/, ""), from: row.index }));
  const code = markdownCodeRanges(source);
  const isCode = index => code.some(([from, to]) => rows[index].from >= from && rows[index].from < to);
  const starts = rows.flatMap((row, index) => /^##\s+提炼观点\s*$/.test(row.value) && !isCode(index) ? [index] : []);
  let before = source, after = "";
  if (starts.length) {
    for (const start of starts) {
      let limit = start + 1;
      while (limit < rows.length && (isCode(limit) || !/^#{1,2}\s+\S/.test(rows[limit].value))) limit++;
      const marker = rows.findIndex((row, index) => index > start && index < limit && row.value.trim() === END && !isCode(index));
      // Old blocks had no delimiter; replace only their known generated fields, never trailing prose.
      const end = marker >= 0 ? marker + 1 : legacyBlockEnd(rows, start, limit, isCode);
      if (end > start) {
        before = source.slice(0, rows[start].from);
        after = source.slice(rows[end]?.from ?? source.length);
        break;
      }
    }
  } else {
    const title = rows.findIndex((row, index) => /^#\s+\S/.test(row.value) && !isCode(index));
    if (title >= 0) {
      const position = rows[title + 1]?.from ?? source.length;
      before = source.slice(0, position);
      after = source.slice(position);
    }
  }
  return [before.trimEnd(), `${section.trim()}\n${END}`, after.replace(/^\n+/, "").trimEnd()]
    .filter(Boolean).join("\n\n") + "\n";
}
