import { createHash } from "node:crypto";

function stableId(prefix, input) {
  const hash = createHash("sha1").update(String(input)).digest("hex").slice(0, 12);
  return `${prefix}_${hash}`;
}

function toArray(value) {
  if (Array.isArray(value)) return value.map((x) => String(x).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((x) => x.trim()).filter(Boolean);
  return [];
}

function compactText(value) {
  return String(value || "").replace(/\r\n/g, "\n").trim();
}

function textFromItem(item = {}) {
  return compactText(item.text || item.note || item.highlight || item.content || item.summary || item.answer || "");
}

function stripListMarker(line) {
  return String(line || "").replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "").trim();
}

function splitNotebookText(value) {
  const text = compactText(value);
  if (!text) return [];

  const blocks = text.split(/\n{2,}/g).map((block) => block.trim()).filter(Boolean);
  const segments = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const listLines = lines.filter((line) => /^\s*(?:[-*+]|\d+[.)])\s+/.test(line));
    if (lines.length > 1 && listLines.length === lines.length) {
      segments.push(...lines.map(stripListMarker));
    } else {
      segments.push(block.replace(/\n+/g, " ").trim());
    }
  }

  return segments.filter(Boolean);
}

function inferNotebookCandidateKind({ text = "", title = "", inputType = "" } = {}) {
  const haystack = `${title} ${text}`.toLowerCase();
  if (inputType === "qa") return "question";
  if (/(limitation|limited|caveat|boundary|constraint|\u5c40\u9650|\u9650\u5236|\u8fb9\u754c)/i.test(haystack)) return "limitation";
  if (/(method|approach|procedure|protocol|\u65b9\u6cd5|\u6d41\u7a0b)/i.test(haystack)) return "method";
  if (/(result|finding|found|evidence|outcome|\u7ed3\u679c|\u53d1\u73b0|\u8bc1\u636e)/i.test(haystack)) return "result";
  if (/(question|\?|\u95ee\u9898)/i.test(haystack)) return "question";
  if (/(quote|citation|excerpt|\u5f15\u7528|\u6458\u5f55)/i.test(haystack)) return "quote";
  return "claim";
}

function notebookTitle(payload = {}) {
  return String(payload.notebookName || payload.notebook || "NotebookLM").trim() || "NotebookLM";
}

function pushNotebookTextItems(items, payload, inputType, value, titlePrefix) {
  for (const [index, text] of splitNotebookText(value).entries()) {
    const title = `${titlePrefix} ${index + 1}`;
    items.push({
      id: `${inputType}_${index + 1}`,
      title,
      content: text,
      notebook: notebookTitle(payload),
      notebook_input_type: inputType,
      candidate_kind: inferNotebookCandidateKind({ text, title, inputType })
    });
  }
}

function normalizeNotebookQaItems(payload = {}) {
  if (Array.isArray(payload.qa)) {
    return payload.qa.map((item, index) => {
      const question = compactText(item?.question || item?.q || item?.prompt || item?.title || "");
      const answer = compactText(item?.answer || item?.a || item?.text || item?.content || item?.note || "");
      const content = [question ? `Question: ${question}` : "", answer ? `Answer: ${answer}` : ""].filter(Boolean).join("\n\n");
      return {
        id: item?.id || `qa_${index + 1}`,
        title: question || item?.title || `Q&A ${index + 1}`,
        content,
        tags: item?.tags,
        locator: item?.locator || item?.location,
        notebook: notebookTitle(payload),
        notebook_input_type: "qa",
        candidate_kind: "question"
      };
    });
  }
  const items = [];
  pushNotebookTextItems(items, payload, "qa", payload.qa, "Q&A");
  return items;
}

function normalizeNotebookNotes(payload = {}) {
  if (Array.isArray(payload.notes)) {
    return payload.notes.map((item, index) => {
      const text = textFromItem(item);
      const title = String(item?.title || `Notebook note ${index + 1}`).trim();
      return {
        ...item,
        id: item?.id || `note_${index + 1}`,
        title,
        content: text,
        notebook: item?.notebook || notebookTitle(payload),
        notebook_input_type: item?.notebook_input_type || "note",
        candidate_kind: item?.candidate_kind || inferNotebookCandidateKind({ text, title, inputType: "note" })
      };
    });
  }
  const items = [];
  pushNotebookTextItems(items, payload, "note", payload.notes, "Notebook note");
  return items;
}

function notebooklmItems(payload = {}) {
  const items = [];
  pushNotebookTextItems(items, payload, "summary", payload.summary, "Summary");
  pushNotebookTextItems(items, payload, "study_guide", payload.studyGuide || payload.study_guide, "Study guide");
  items.push(...normalizeNotebookQaItems(payload));
  items.push(...normalizeNotebookNotes(payload));
  return items.filter((item) => textFromItem(item));
}

function connectorItems(connector, payload) {
  if (connector === "zotero") return Array.isArray(payload.items) ? payload.items : [];
  if (connector === "readwise") return Array.isArray(payload.highlights) ? payload.highlights : [];
  if (connector === "notebooklm") return notebooklmItems(payload);
  return [];
}

export function buildExternalCandidates(connector, payload = {}) {
  const items = connectorItems(connector, payload);
  const sources = [];
  const literature = [];
  const permanent = [];
  const warnings = [];

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i] || {};
    const externalId = String(item.id || item.key || `${connector}_${i}`);
    const title = String(item.title || `${connector} item ${i + 1}`);
    const sourceId = stableId("src", `${connector}:${externalId}`);
    const literatureId = stableId("ln", `${connector}:${externalId}`);
    const now = new Date().toISOString();

    sources.push({
      id: sourceId,
      source_type: item.source_type || (connector === "zotero" ? "article" : "note"),
      title,
      description: item.description || "",
      tags: toArray(item.tags),
      imported_from: connector,
      created_at: now,
      updated_at: now,
      connector,
      external_id: externalId,
      notebook: connector === "notebooklm" ? item.notebook || payload.notebookName || payload.notebook || null : null,
      notebook_input_type: connector === "notebooklm" ? item.notebook_input_type || null : null,
      candidate_kind: connector === "notebooklm" ? item.candidate_kind || null : null
    });

    literature.push({
      id: literatureId,
      source_id: sourceId,
      title,
      quote_text: textFromItem(item),
      paraphrase_text: "",
      status: "draft",
      tags: connector === "readwise" ? [...new Set([...toArray(item.tags), "pending_paraphrase"])] : toArray(item.tags),
      imported_from: connector,
      created_at: now,
      updated_at: now,
      connector,
      locator: item.locator || item.location || null,
      notebook: connector === "notebooklm" ? item.notebook || payload.notebookName || payload.notebook || null : null,
      notebook_input_type: connector === "notebooklm" ? item.notebook_input_type || null : null,
      candidate_kind: connector === "notebooklm" ? item.candidate_kind || null : null,
      external_id: externalId
    });
  }

  if (!items.length) {
    warnings.push({ code: "IMPORT_EMPTY_PAYLOAD", message: `${connector} payload is empty`, count: 1 });
  }

  return { sources, literature, permanent, warnings };
}
