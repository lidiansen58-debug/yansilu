// ProseMirror positions include block boundaries and omit Markdown syntax.
// Serialize markers in an undispatched transaction to locate the actual range.
export function toastuiMarkdownSelection(editor, range = null) {
  const state = editor.wwEditor?.view?.state;
  if (!state || !editor.convertor?.toMarkdownText) return null;
  const { from, to } = range || state.selection;
  const markdown = editor.getMarkdown();
  let marker = "\uE000yansilu-selection\uE001";
  while (markdown.includes(marker)) marker += "\uE001";
  const endMarker = `${marker}end`;
  const marked = editor.convertor.toMarkdownText(state.tr.insertText(endMarker, to).insertText(marker, from).doc);
  const start = marked.indexOf(marker), end = marked.indexOf(endMarker, start + marker.length);
  if (start < 0 || end < 0) return null;
  // A marker must not alter serialization beyond its own text.
  const restored = marked.slice(0, start) + marked.slice(start + marker.length, end) + marked.slice(end + endMarker.length);
  // Empty trailing paragraphs gain a line while a marker temporarily occupies them.
  if (restored.trimEnd() !== markdown.trimEnd()) return null;
  return { from: Math.min(start, markdown.length), to: Math.min(end - marker.length, markdown.length) };
}

export function toastuiWysiwygSelection(editor, from, to = from) {
  const doc = editor.wwEditor?.view?.state?.doc;
  if (!doc) return null;
  const blocks = [];
  doc.descendants((node, pos) => {
    if (node.isTextblock) blocks.push({ from: pos + 1, to: pos + node.nodeSize - 1 });
  });
  if (!blocks.length) return null;
  const textPosition = position => {
    let low = 0, high = blocks.length - 1;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (blocks[mid].from <= position) low = mid;
      else high = mid - 1;
    }
    return Math.max(blocks[low].from, Math.min(position, blocks[low].to));
  };
  const find = offset => {
    let low = blocks[0].from, high = blocks.at(-1).to;
    while (low < high) {
      const mid = Math.floor((low + high) / 2), position = textPosition(mid);
      const mapped = toastuiMarkdownSelection(editor, { from: position, to: position });
      if (!mapped) return null;
      if (mapped.from < offset) low = mid + 1;
      else high = mid;
    }
    return textPosition(low);
  };
  const start = find(from), end = from === to ? start : find(to);
  return start === null || end === null ? null : { from: start, to: end };
}
