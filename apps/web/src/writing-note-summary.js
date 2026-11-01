export function writingNoteExcerpt(note = {}) {
  const prose = String(note.thesis || note.body || "")
    .replace(/<!--[^]*?(?:-->|$)/g, " ")
    .replace(/^#{1,6}[ \t]+[^\n]*(?:\n|$)/gm, "")
    .replace(/\[\[([^\]]+)\]\]/g, (_match, target) => {
      const [id, ...label] = target.split("|");
      return label.length ? label.join("|") : /^(?:pn_|note_|lit_|fl_)[\w-]+$/.test(id) ? "相关笔记" : id;
    })
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/^[ \t]*(?:[-*+] |\d+\. |> ?)/gm, "")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ").trim();
  return prose.length > 120 ? `${prose.slice(0, 120)}…` : prose;
}
