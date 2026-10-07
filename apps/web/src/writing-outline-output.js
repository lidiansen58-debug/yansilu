function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function heading(value) {
  return text(value).replace(/[\r\n]+/g, " ");
}

function appendList(lines, label, values) {
  const items = (Array.isArray(values) ? values : []).map(text).filter(Boolean);
  if (items.length) lines.push("", `${label}：`, ...items.map((item) => `- ${item}`));
}

export function buildWritingOutlineOutput({ project = null, scaffold = null } = {}) {
  const sections = Array.isArray(scaffold?.sections) ? scaffold.sections : [];
  if (!sections.length) throw new Error("提纲尚无章节，请先生成提纲。");
  const sourceNotes = [...(Array.isArray(project?.basket_notes) ? project.basket_notes : []),
    ...(Array.isArray(scaffold?.evidence_notes) ? scaffold.evidence_notes : [])];
  const notes = new Map(sourceNotes.filter(note => note?.id && note.status !== "missing" && note.note_type !== "missing").map(note => [note.id, note]));
  const lines = [`# ${heading(project?.title) || "未命名文章"}`, "", "## 文章提纲"];
  const brief = [
    ["目标", project?.goal], ["读者", project?.audience], ["语气", project?.tone],
    ["写作意图", project?.intent], ["读者收获", project?.desired_reader_takeaway]
  ].filter(([, value]) => text(value));
  if (brief.length) lines.push("", ...brief.map(([label, value]) => `${label}：${text(value)}`));

  sections.forEach((section, index) => {
    lines.push("", `### ${index + 1}. ${heading(section?.heading) || "未命名章节"}`);
    if (text(section?.purpose)) lines.push("", text(section.purpose));
    appendList(lines, "要点", section?.key_points);
    const evidence = (Array.isArray(section?.evidence_note_ids) ? section.evidence_note_ids : [])
      .map((id) => {
        const title = heading(notes.get(id)?.title);
        // Never substitute an internal ID for a missing source title.
        return title ? `[[${title}]]` : "来源笔记暂不可用，请在笔记库中核对。";
      });
    appendList(lines, "来源笔记", evidence);
    appendList(lines, "待补内容", section?.gaps);
    appendList(lines, "反例与适用范围", section?.counterpoints);
    appendList(lines, "待回答问题", section?.open_questions);
  });
  appendList(lines, "全文待确认", scaffold?.open_questions);
  return `${lines.join("\n")}\n`;
}
