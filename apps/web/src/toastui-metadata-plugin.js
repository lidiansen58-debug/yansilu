const DELIMITER = "<!-- yansilu:distillation:end -->";

/** Decorations hide application metadata without changing the editor document. */
export function toastuiMetadataPlugin({ pmState: { Plugin }, pmView: { Decoration, DecorationSet } }) {
  return { wysiwygPlugins: [() => new Plugin({ props: {
    decorations(state) {
      const hidden = [];
      state.doc.descendants((node, position) => {
        if (node.type.name === "htmlComment" && node.textContent === DELIMITER) {
          hidden.push(Decoration.node(position, position + node.nodeSize, { class: "yansilu-metadata-block", "aria-hidden": "true" }));
        }
        if (node.type.spec.code) return false;
      });
      return DecorationSet.create(state.doc, hidden);
    }
  } })] };
}
