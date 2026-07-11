function cleanText(value = "") {
  return String(value ?? "").trim();
}

function sectionHeading(section = {}, index = 0) {
  return cleanText(section.heading || section.title) || `第 ${index + 1} 节`;
}

function sectionPurpose(section = {}) {
  return cleanText(section.purpose || section.summary || section.body);
}

export function writingWorkbenchHasTopic({ writingState = {}, selectedTheme = null } = {}) {
  return Boolean(writingState.project?.id || selectedTheme?.id);
}

export function writingWorkbenchTopicTitle({ writingState = {}, selectedTheme = null, fallback = "" } = {}) {
  return cleanText(writingState.project?.title || selectedTheme?.title || fallback) || "未命名主题";
}

export function normalizeWritingOutlineSections(scaffold = {}) {
  const sections = Array.isArray(scaffold?.sections) ? scaffold.sections : [];
  return sections.map((section, index) => ({
    ...section,
    order: Number(section?.order || index + 1),
    heading: sectionHeading(section, index),
    purpose: sectionPurpose(section),
    evidence_note_ids: Array.isArray(section?.evidence_note_ids) ? section.evidence_note_ids : []
  }));
}

export function writingOutlineMarkdown({ title = "", sections = [], openQuestions = [] } = {}) {
  const cleanTitle = cleanText(title) || "未命名主题";
  const lines = [`# ${cleanTitle}`, ""];
  const normalizedSections = normalizeWritingOutlineSections({ sections });
  if (!normalizedSections.length) {
    lines.push("## 待补章节", "", "先添加一节，写清这一节要推进的判断。");
  } else {
    normalizedSections.forEach((section, index) => {
      lines.push(`## ${sectionHeading(section, index)}`);
      const purpose = sectionPurpose(section);
      if (purpose) lines.push("", purpose);
      if (section.evidence_note_ids.length) {
        lines.push("", `相关笔记：${section.evidence_note_ids.join("、")}`);
      }
      lines.push("");
    });
  }
  const questions = (Array.isArray(openQuestions) ? openQuestions : []).map(cleanText).filter(Boolean);
  if (questions.length) {
    lines.push("## 待回答问题", "");
    questions.forEach((question) => lines.push(`- ${question}`));
  }
  return `${lines.join("\n").trim()}\n`;
}

export function writingDraftMarkdown({ markdown = "", title = "", references = [] } = {}) {
  const cleanTitle = cleanText(title) || "未命名草稿";
  const cleanReferences = (Array.isArray(references) ? references : []).map(cleanText).filter(Boolean);
  const withoutGeneratedFooter = String(markdown || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n*---\n(?:(?:可写主题|文章提纲)：[^\n]*(?:\n|$))+/g, "\n")
    .trim();
  const body = !withoutGeneratedFooter
    ? `# ${cleanTitle}`
    : /^#\s+/.test(withoutGeneratedFooter)
      ? withoutGeneratedFooter.replace(/^#\s+.*$/m, `# ${cleanTitle}`)
      : `# ${cleanTitle}\n\n${withoutGeneratedFooter}`;
  return cleanReferences.length
    ? `${body.trimEnd()}\n\n---\n${cleanReferences.join("\n")}\n`
    : `${body.trimEnd()}\n`;
}

export function syncWritingScaffoldMarkdown(writingState = {}) {
  if (!writingState.scaffold) return "";
  const title = cleanText(writingState.project?.title) || cleanText(writingState.scaffold?.title) || "未命名主题";
  writingState.scaffold.sections = normalizeWritingOutlineSections(writingState.scaffold);
  writingState.scaffoldMarkdown = writingOutlineMarkdown({
    title,
    sections: writingState.scaffold.sections,
    openQuestions: writingState.scaffold.open_questions || []
  });
  return writingState.scaffoldMarkdown;
}

export function updateWritingOutlineSection(writingState = {}, index = 0, field = "", value = "") {
  if (!writingState.scaffold) return false;
  const sections = normalizeWritingOutlineSections(writingState.scaffold);
  const targetIndex = Number(index);
  if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= sections.length) return false;
  if (field === "heading") sections[targetIndex].heading = cleanText(value);
  if (field === "purpose") sections[targetIndex].purpose = cleanText(value);
  writingState.scaffold.sections = sections;
  syncWritingScaffoldMarkdown(writingState);
  return true;
}

export function applyWritingOutlineAction(writingState = {}, action = "", index = 0) {
  if (!writingState.scaffold) return false;
  const sections = normalizeWritingOutlineSections(writingState.scaffold);
  const targetIndex = Number(index);
  if (action === "add") {
    sections.splice(Number.isInteger(targetIndex) ? targetIndex + 1 : sections.length, 0, {
      order: sections.length + 1,
      heading: `第 ${sections.length + 1} 节`,
      purpose: "",
      evidence_note_ids: []
    });
  } else if (action === "delete") {
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= sections.length) return false;
    sections.splice(targetIndex, 1);
  } else if (action === "up") {
    if (!Number.isInteger(targetIndex) || targetIndex <= 0 || targetIndex >= sections.length) return false;
    [sections[targetIndex - 1], sections[targetIndex]] = [sections[targetIndex], sections[targetIndex - 1]];
  } else if (action === "down") {
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= sections.length - 1) return false;
    [sections[targetIndex], sections[targetIndex + 1]] = [sections[targetIndex + 1], sections[targetIndex]];
  } else {
    return false;
  }
  writingState.scaffold.sections = sections.map((section, sectionIndex) => ({ ...section, order: sectionIndex + 1 }));
  syncWritingScaffoldMarkdown(writingState);
  return true;
}
