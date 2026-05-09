import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { markdown, markdownKeymap } from "@codemirror/lang-markdown";
import { minimalSetup } from "codemirror";

const editorTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "transparent",
    color: "#172033"
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: '"JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
    lineHeight: "1.78"
  },
  ".cm-content": {
    minHeight: "420px",
    padding: "24px 0 96px",
    caretColor: "#0f172a"
  },
  ".cm-line": {
    padding: "0 10px"
  },
  ".cm-focused": {
    outline: "none"
  },
  ".cm-selectionBackground, ::selection": {
    backgroundColor: "rgba(21, 154, 96, 0.18)"
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(15, 23, 42, 0.025)"
  },
  ".cm-gutters": {
    display: "none"
  }
});

function clampPosition(view, value) {
  const length = view.state.doc.length;
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(length, Number(value)));
}

function continueStructuredMarkup(view) {
  const main = view.state.selection.main;
  if (!main.empty) return false;
  const line = view.state.doc.lineAt(main.from);
  if (main.from !== line.to) return false;
  const lineText = line.text;

  const apply = (from, to, insert, anchor) => {
    view.dispatch({
      changes: { from, to, insert },
      selection: { anchor, head: anchor },
      scrollIntoView: true
    });
    return true;
  };

  const checklistMatch = lineText.match(/^(\s*[-*+]\s)\[(?: |x|X)\]\s?(.*)$/);
  if (checklistMatch) {
    const [, bulletPrefix, body] = checklistMatch;
    if (!String(body || "").trim()) return apply(line.from, line.to, "", line.from);
    const prefix = `${bulletPrefix}[ ] `;
    return apply(line.to, line.to, `\n${prefix}`, line.to + 1 + prefix.length);
  }

  const orderedMatch = lineText.match(/^(\s*)(\d+)([.)])\s(.*)$/);
  if (orderedMatch) {
    const [, indent, number, marker, body] = orderedMatch;
    if (!String(body || "").trim()) return apply(line.from, line.to, "", line.from);
    const prefix = `${indent}${Number(number) + 1}${marker} `;
    return apply(line.to, line.to, `\n${prefix}`, line.to + 1 + prefix.length);
  }

  const bulletMatch = lineText.match(/^(\s*[-*+]\s)(.*)$/);
  if (bulletMatch) {
    const [, prefix, body] = bulletMatch;
    if (!String(body || "").trim()) return apply(line.from, line.to, "", line.from);
    return apply(line.to, line.to, `\n${prefix}`, line.to + 1 + prefix.length);
  }

  const quoteMatch = lineText.match(/^(\s*>\s?)(.*)$/);
  if (quoteMatch) {
    const [, prefix, body] = quoteMatch;
    if (!String(body || "").trim()) return apply(line.from, line.to, "", line.from);
    return apply(line.to, line.to, `\n${prefix}`, line.to + 1 + prefix.length);
  }

  return false;
}

export function createMarkdownEditor({ parent, doc = "", onChange = () => {} } = {}) {
  if (!(parent instanceof HTMLElement)) {
    throw new Error("createMarkdownEditor requires a valid parent element");
  }

  const state = EditorState.create({
    doc: String(doc ?? ""),
    extensions: [
      minimalSetup,
      keymap.of([{ key: "Enter", run: continueStructuredMarkup }, ...markdownKeymap]),
      markdown(),
      EditorView.lineWrapping,
      editorTheme,
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;
        onChange(update.state.doc.toString());
      })
    ]
  });

  const view = new EditorView({
    state,
    parent
  });

  const api = {
    view,
    getValue() {
      return view.state.doc.toString();
    },
    setValue(nextValue) {
      const value = String(nextValue ?? "");
      const current = view.state.doc.toString();
      if (value === current) return;
      const anchor = Math.min(view.state.selection.main.anchor, value.length);
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
        selection: { anchor, head: anchor }
      });
    },
    selection() {
      const main = view.state.selection.main;
      return { from: main.from, to: main.to };
    },
    setSelectionRange(from, to = from) {
      const anchor = clampPosition(view, Math.min(from, to));
      const head = clampPosition(view, Math.max(from, to));
      view.dispatch({
        selection: { anchor, head },
        scrollIntoView: true
      });
      view.focus();
    },
    replaceRange(from, to, insertText = "") {
      const start = clampPosition(view, Math.min(from, to));
      const end = clampPosition(view, Math.max(from, to));
      const text = String(insertText ?? "");
      const cursor = start + text.length;
      view.dispatch({
        changes: { from: start, to: end, insert: text },
        selection: { anchor: cursor, head: cursor },
        scrollIntoView: true
      });
      view.focus();
    },
    replaceSelection(insertText = "") {
      const main = view.state.selection.main;
      api.replaceRange(main.from, main.to, insertText);
    },
    focus() {
      view.focus();
    },
    destroy() {
      if (parent.__markdownEditor === api) delete parent.__markdownEditor;
      view.destroy();
    }
  };

  parent.__markdownEditor = api;
  return api;
}
