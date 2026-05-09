import Editor from "@toast-ui/editor";
import "@toast-ui/editor/dist/i18n/zh-cn";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function offsetToMdPos(text, offset = 0) {
  const source = String(text || "").replace(/\r\n/g, "\n");
  const target = clamp(Number(offset) || 0, 0, source.length);
  const lines = source.slice(0, target).split("\n");
  const line = lines.length;
  const column = (lines[lines.length - 1] || "").length + 1;
  return [line, column];
}

function mdPosToOffset(text, pos) {
  const source = String(text || "").replace(/\r\n/g, "\n");
  if (!Array.isArray(pos) || pos.length < 2) return 0;
  const [lineInput, columnInput] = pos;
  const line = Math.max(1, Number(lineInput) || 1);
  const column = Math.max(1, Number(columnInput) || 1);
  const lines = source.split("\n");
  let offset = 0;
  for (let index = 0; index < Math.min(line - 1, lines.length); index += 1) {
    offset += lines[index].length + 1;
  }
  const targetLine = lines[Math.min(line - 1, lines.length - 1)] || "";
  return clamp(offset + Math.min(column - 1, targetLine.length), 0, source.length);
}

function normalizeSelection(markdown, selection) {
  if (Array.isArray(selection) && selection.length === 2 && typeof selection[0] === "number") {
    return {
      from: Math.max(0, selection[0] || 0),
      to: Math.max(0, selection[1] || 0)
    };
  }
  if (Array.isArray(selection) && selection.length === 2 && Array.isArray(selection[0])) {
    return {
      from: mdPosToOffset(markdown, selection[0]),
      to: mdPosToOffset(markdown, selection[1])
    };
  }
  return { from: 0, to: 0 };
}

function createTokenWidget(type, rawText) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `yansilu-token yansilu-token-${type}`;
  button.textContent = rawText;
  if (type === "wikilink") {
    button.dataset.wikilink = rawText.slice(2, -2).trim();
  }
  if (type === "tag") {
    button.dataset.tagToken = rawText.replace(/^#/, "").trim();
  }
  return button;
}

function selectionRectWithin(root) {
  const selection = window.getSelection?.();
  if (!selection || !selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  const anchorNode = selection.anchorNode;
  if (!anchorNode || !root.contains(anchorNode)) return null;
  const rect = range.getBoundingClientRect();
  if (rect && (rect.width || rect.height)) return rect;
  const fallbackRange = range.cloneRange();
  fallbackRange.collapse(true);
  const fallbackRect = fallbackRange.getBoundingClientRect();
  if (fallbackRect && (fallbackRect.width || fallbackRect.height)) return fallbackRect;
  return null;
}

export function createWysiwygMarkdownEditor({
  parent,
  doc = "",
  initialMode = "wysiwyg",
  onChange = () => {},
  onKeydown = () => {},
  onKeyup = () => {},
  onClickToken = () => {}
} = {}) {
  if (!(parent instanceof HTMLElement)) {
    throw new Error("createWysiwygMarkdownEditor requires a valid parent element");
  }

  parent.innerHTML = "";

  const editor = new Editor({
    el: parent,
    initialValue: String(doc ?? ""),
    initialEditType: initialMode === "source" ? "markdown" : "wysiwyg",
    previewStyle: "tab",
    hideModeSwitch: true,
    usageStatistics: false,
    autofocus: false,
    toolbarItems: [],
    language: "zh-CN",
    height: "100%",
    minHeight: "420px",
    widgetRules: [
      {
        rule: /\[\[[^\]]+\]\]/,
        toDOM(text) {
          return createTokenWidget("wikilink", text);
        }
      },
      {
        rule: /#[A-Za-z0-9_\-\u4e00-\u9fff]+/u,
        toDOM(text) {
          return createTokenWidget("tag", text);
        }
      }
    ],
    events: {
      change() {
        onChange(editor.getMarkdown());
      },
      keydown(_, event) {
        onKeydown(event);
      },
      keyup(_, event) {
        onKeyup(event);
      }
    }
  });

  parent.addEventListener("click", (event) => {
    const token = event.target.closest?.("[data-wikilink],[data-tag-token]");
    if (!token) return;
    if (token.dataset.wikilink) {
      onClickToken(`[[${token.dataset.wikilink}]]`);
      return;
    }
    if (token.dataset.tagToken) {
      onClickToken(`#${token.dataset.tagToken}`);
    }
  });

  const api = {
    editor,
    getValue() {
      return editor.getMarkdown();
    },
    setValue(nextValue) {
      const value = String(nextValue ?? "");
      if (value === editor.getMarkdown()) return;
      editor.setMarkdown(value, false);
    },
    selection() {
      return normalizeSelection(editor.getMarkdown(), editor.getSelection());
    },
    setSelectionRange(from, to = from) {
      const markdown = editor.getMarkdown();
      editor.setSelection(offsetToMdPos(markdown, from), offsetToMdPos(markdown, to));
      editor.focus();
    },
    replaceRange(from, to, insertText = "") {
      const markdown = editor.getMarkdown();
      editor.replaceSelection(String(insertText ?? ""), offsetToMdPos(markdown, from), offsetToMdPos(markdown, to));
      editor.focus();
    },
    replaceSelection(insertText = "") {
      editor.replaceSelection(String(insertText ?? ""));
      editor.focus();
    },
    insertText(insertText = "") {
      editor.insertText(String(insertText ?? ""));
      editor.focus();
    },
    exec(command, payload) {
      editor.exec(command, payload);
      editor.focus();
    },
    changeMode(mode = "wysiwyg") {
      editor.changeMode(mode === "source" ? "markdown" : "wysiwyg", true);
      editor.focus();
    },
    isWysiwygMode() {
      return editor.isWysiwygMode();
    },
    isSourceMode() {
      return editor.isMarkdownMode();
    },
    focus() {
      editor.focus();
    },
    selectionRect() {
      return selectionRectWithin(parent);
    },
    destroy() {
      editor.destroy();
    }
  };

  parent.__wysiwygMarkdownEditor = api;
  return api;
}
