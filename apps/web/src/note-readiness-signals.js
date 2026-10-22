const BOUNDARY_WORDS = /边界|反例|不成立|适用条件|反方|counterpoint|boundary|counterexample/i;
const BOUNDARY_LABEL = /^(?:边界(?:与|和|或|\/)?反例|边界|反例|反方|适用边界|适用条件|不适用范围|boundary|counterpoint|counterexample|boundary\/counterexample)$/i;
const BOUNDARY_PROMPTS = new Set([
  "这条判断在什么条件下不成立",
  "它在哪些条件下不成立",
  "它在哪些条件下不成立还有什么需要验证",
  "写清它在哪些情况下不成立",
  "补一条不成立条件"
]);

function cleanText(value = "") {
  return String(value || "").trim();
}

function lineText(value = "") {
  return cleanText(value).replace(/^(?:>\s*|[-*+]\s+|\d+[.)]\s+)+/u, "").replace(/[*_`]/gu, "").trim();
}

function isBoundaryLabel(value = "") {
  const label = lineText(value).replace(/\s+/gu, "").replace(/[：:，,。.!！?？;；]+$/gu, "");
  return BOUNDARY_LABEL.test(label);
}

function boundaryContent(value = "") {
  const raw = cleanText(value);
  const text = lineText(raw);
  const normalized = text.replace(/[\s，,。.!！?？:：;；/]/gu, "");
  return /[\p{L}\p{N}]/u.test(text) && !/_{3,}|\{\{[^}]+\}\}/u.test(raw) &&
    !isBoundaryLabel(text) && !BOUNDARY_PROMPTS.has(normalized) &&
    !/^(?:待补(?:充|全)?|待填写|暂无|TODO|TBD|N\/A)[。.!！?？]*$/iu.test(text);
}

// A template heading or a question asking for a boundary is not a boundary.
// The body fallback also supports older notes whose boundary is only Markdown.
export function noteHasBoundarySignal(note = {}) {
  const explicit = cleanText(note.boundaryOrCounterpoint || note.boundary_or_counterpoint);
  if (explicit.split(/\r?\n/u).some((line) => !/^#{1,6}\s/u.test(line.trim()) && boundaryContent(line))) return true;
  const body = String(note.body || note.markdown || "")
    .replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/u, "")
    .replace(/<!--[\s\S]*?-->/gu, "");
  let inBoundarySection = false;
  let boundarySectionLevel = 0;
  let fence = "";
  for (const line of body.split(/\r?\n/u)) {
    const trimmed = line.trim();
    const marker = /^(?:>\s*)?(`{3,}|~{3,})/u.exec(trimmed)?.[1] || "";
    if (marker) {
      if (!fence) fence = marker[0];
      else if (fence === marker[0]) fence = "";
      continue;
    }
    if (fence) continue;
    const heading = /^(#{1,6})\s+(.+?)\s*#*$/u.exec(trimmed);
    if (heading) {
      if (isBoundaryLabel(heading[2])) {
        inBoundarySection = true;
        boundarySectionLevel = heading[1].length;
      } else if (heading[1].length <= boundarySectionLevel) inBoundarySection = false;
      continue;
    }
    if (boundaryContent(trimmed) && (inBoundarySection || BOUNDARY_WORDS.test(lineText(trimmed)))) return true;
  }
  return false;
}

export function noteHasConfirmedViewpoint(note = {}) {
  const summary = note.threeLineSummary || note.three_line_summary;
  return Boolean(cleanText(note.thesis)) && Array.isArray(summary) && summary.length === 3 &&
    summary.every((line) => cleanText(line)) &&
    cleanText(note.distillationStatus || note.distillation_status).toLowerCase() === "confirmed";
}

export function writingNoteEligibility(note, {
  isDirectoryUnderOriginalRoot = () => false,
  normalizeAuthorshipItem = (value) => value
} = {}) {
  if (!note) return { ok: false, key: "missing", message: "还没能读取到这条永久笔记的完整信息。" };
  const noteType = cleanText(note.noteType || note.note_type).toLowerCase();
  if (noteType !== "permanent" && !isDirectoryUnderOriginalRoot(note.folderId)) {
    return { ok: false, key: "type", message: "相关笔记只接受永久笔记。" };
  }
  const authorship = normalizeAuthorshipItem(note.authorship) || {};
  if (!authorship.user_confirmed) return { ok: false, key: "authorship", message: "这条永久笔记还没完成作者确认。" };
  if (cleanText(note.status).toLowerCase() !== "active") {
    return { ok: false, key: "draft", message: "这条永久笔记还未通过原创性检查，请检查后再加入写作。" };
  }
  return { ok: true, key: "ok", message: "" };
}
