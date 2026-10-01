// Generated from packages/markdown-engine/src/markdown-code-context.mjs by build:toastui.
export function markdownCharacterIsEscaped(text, position) {
  let slashes = 0;
  while (position > 0 && text[--position] === "\\") slashes++;
  return slashes % 2 === 1;
}

// Source offsets, including delimiters. Unclosed fences also protect the EOF cursor.
export function markdownCodeRanges(text = "") {
  const source = String(text), ranges = [];
  let fence = null, indented = false, previousBlank = true;
  for (const line of source.matchAll(/[^\n]*(?:\n|$)/g)) {
    if (!line[0]) continue;
    const value = line[0].replace(/\r?\n$/, ""), start = line.index, end = start + line[0].length;
    const marker = value.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) {
      if (marker && marker[1][0] === fence.marker[0] && marker[1].length >= fence.marker.length && !marker[2].trim()) {
        ranges.push([fence.start, end]);
        fence = null;
      }
      continue;
    }
    if (marker && (marker[1][0] !== "`" || !marker[2].includes("`"))) {
      fence = { start, marker: marker[1] };
      indented = false;
      continue;
    }
    const blank = !value.trim();
    if (/^(?: {4}|\t)/.test(value) && (previousBlank || indented)) {
      ranges.push([start, end === source.length ? end + 1 : end]);
      indented = true;
    } else if (!blank) indented = false;
    previousBlank = blank;
  }
  if (fence) ranges.push([fence.start, source.length + 1]);
  for (const match of source.matchAll(/`+/g)) {
    const start = match.index;
    if (markdownCharacterIsEscaped(source, start) || ranges.some(([from, to]) => start >= from && start < to)) continue;
    const closing = /`+/g;
    closing.lastIndex = start + match[0].length;
    let end;
    while ((end = closing.exec(source))) {
      if (ranges.some(([from, to]) => end.index >= from && end.index < to)) break;
      if (end[0].length === match[0].length) {
        ranges.push([start, end.index + end[0].length]);
        break;
      }
    }
  }
  return ranges;
}

export function selectionTouchesMarkdownCode(text = "", selection = null) {
  if (!selection || !Number.isFinite(selection.from) || !Number.isFinite(selection.to)) return false;
  const from = Math.min(selection.from, selection.to), to = Math.max(selection.from, selection.to);
  return markdownCodeRanges(text).some(([start, end]) => from === to ? from >= start && from < end : from < end && to > start);
}

export function markdownWikilinkMatches(text = "") {
  const source = String(text), ranges = markdownCodeRanges(source), links = [];
  for (const match of source.matchAll(/(!)?\[\[([^\[\]\r\n]+)\]\]/g)) {
    const opening = match.index + (match[1] ? 1 : 0);
    if (markdownCharacterIsEscaped(source, opening) || ranges.some(([from, to]) => match.index < to && match.index + match[0].length > from)) continue;
    links.push({ index: opening, raw: match[2].trim(), embed: Boolean(match[1]) && !markdownCharacterIsEscaped(source, match.index) });
  }
  return links;
}
