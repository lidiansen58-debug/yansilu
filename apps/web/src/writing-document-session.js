function documentContext(deps) {
  const projectId = deps.writingState?.project?.id || "";
  const chapter = deps.writingState?.bookChapter;
  return [deps.getVaultPath?.(), deps.state?.noteMoveVaultScope, projectId,
    chapter?.projectId === projectId ? chapter?.id || "" : ""];
}

/** Each document owns an editor and its undo history; refreshes keep that editor. */
export function createWritingDocumentSession(createEditor, options) {
  let editor = null, context = null, revision = 0, mounting = false;
  return {
    sync(deps, markdown) {
      const next = documentContext(deps);
      if (editor && context?.every((value, index) => value === next[index])) return editor;
      context = next;
      const current = ++revision;
      mounting = true;
      try {
        editor?.destroy();
        editor = createEditor({ ...options, doc: markdown, onChange: value => {
          if (!mounting && current === revision) options.onChange?.(value);
        } });
        editor.resetUndoHistory();
      } finally { mounting = false; }
      return editor;
    }
  };
}
